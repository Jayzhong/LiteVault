package com.lite.vault.data.source.clerk

import com.lite.vault.config.ClerkConfig
import com.lite.vault.core.auth.SessionStore
import com.lite.vault.core.logging.AppLog
import com.lite.vault.core.network.ApiResult
import com.lite.vault.data.source.AuthDataSource
import com.lite.vault.domain.model.Session
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.accept
import io.ktor.client.request.forms.submitForm
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.Parameters
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonPrimitive

/**
 * Shared Clerk Frontend API implementation for email code sign-in/sign-up.
 */
class ClerkHttpAuthDataSource(
    private val httpClient: HttpClient,
    private val sessionStore: SessionStore
) : AuthDataSource {

    private val baseUrl = ClerkConfig.frontendApiBaseUrl()
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private var currentSignInId: String? = null
    private var currentSignUpId: String? = null
    private var currentFlow: Flow? = null

    override suspend fun sendVerificationCode(email: String): ApiResult<Unit> {
        return sendVerificationCodeInternal(email, allowRetry = true)
    }

    private suspend fun sendVerificationCodeInternal(
        email: String,
        allowRetry: Boolean
    ): ApiResult<Unit> {
        val signInResult = createSignIn(email)
        return when (signInResult) {
            is ClerkApiResult.Success -> {
                currentSignInId = signInResult.body.id
                currentSignUpId = null
                currentFlow = Flow.SignIn

                val emailAddressId = signInResult.body.supportedFirstFactors
                    ?.firstOrNull { it.strategy == STRATEGY_EMAIL_CODE }
                    ?.emailAddressId

                if (emailAddressId.isNullOrBlank()) {
                    return ApiResult.Error(message = "Email code factor not available")
                }

                when (
                    val prepareResult = prepareSignInFirstFactor(signInResult.body.id, emailAddressId)
                ) {
                    is ClerkApiResult.Success -> {
                        ApiResult.Success(Unit)
                    }
                    is ClerkApiResult.Failure -> {
                        prepareResult.toApiError()
                    }
                }
            }
            is ClerkApiResult.Failure -> {
                if (allowRetry && isAlreadySignedIn(signInResult)) {
                    return when (val signOutResult = signOut()) {
                        is ClerkApiResult.Success -> sendVerificationCodeInternal(email, allowRetry = false)
                        is ClerkApiResult.Failure -> signOutResult.toApiError()
                    }
                }
                if (signInResult.errorCode in IDENTIFIER_NOT_FOUND_CODES) {
                    when (val signUpResult = createSignUp(email)) {
                        is ClerkApiResult.Success -> {
                            currentSignUpId = signUpResult.body.id
                            currentSignInId = null
                            currentFlow = Flow.SignUp

                            when (val prepareResult = prepareSignUpVerification(signUpResult.body.id)) {
                                is ClerkApiResult.Success -> {
                                    ApiResult.Success(Unit)
                                }
                                is ClerkApiResult.Failure -> {
                                    prepareResult.toApiError()
                                }
                            }
                        }
                        is ClerkApiResult.Failure -> {
                            signUpResult.toApiError()
                        }
                    }
                } else {
                    signInResult.toApiError()
                }
            }
        }
    }

    override suspend fun verifyCode(email: String, code: String): ApiResult<Session> {
        val flow = currentFlow ?: when {
            currentSignUpId != null -> Flow.SignUp
            currentSignInId != null -> Flow.SignIn
            else -> null
        }

        return when (flow) {
            Flow.SignIn -> verifySignIn(code, email)
            Flow.SignUp -> verifySignUp(code, email)
            null -> ApiResult.Error(message = "No active sign-in attempt")
        }
    }

    override suspend fun refreshSessionToken(sessionId: String): ApiResult<String> {
        return when (val result = getSessionToken(sessionId)) {
            is ClerkApiResult.Success -> ApiResult.Success(result.body.jwt)
            is ClerkApiResult.Failure -> result.toApiError()
        }
    }

    override suspend fun logout(): ApiResult<Unit> {
        return when (val result = signOut()) {
            is ClerkApiResult.Success -> ApiResult.Success(Unit)
            is ClerkApiResult.Failure -> result.toApiError()
        }
    }

    private suspend fun verifySignIn(code: String, email: String): ApiResult<Session> {
        val signInId = currentSignInId ?: return ApiResult.Error(message = "No active sign-in attempt")
        return when (val attemptResult = attemptSignInFirstFactor(signInId, code)) {
            is ClerkApiResult.Success -> {
                val sessionId = attemptResult.body.createdSessionId
                if (attemptResult.body.status != STATUS_COMPLETE || sessionId.isNullOrBlank()) {
                    ApiResult.Error(message = "Verification incomplete")
                } else {
                    // Exchange Session ID for JWT Token
                    when (val tokenResult = getSessionToken(sessionId)) {
                        is ClerkApiResult.Success -> {
                            ApiResult.Success(
                                Session(
                                    token = tokenResult.body.jwt,
                                    sessionId = sessionId,
                                    userId = sessionId,
                                    email = email,
                                    isNewUser = false
                                )
                            )
                        }
                        is ClerkApiResult.Failure -> tokenResult.toApiError()
                    }
                }
            }
            is ClerkApiResult.Failure -> attemptResult.toApiError()
        }
    }

    private suspend fun verifySignUp(code: String, email: String): ApiResult<Session> {
        val signUpId = currentSignUpId ?: return ApiResult.Error(message = "No active sign-up attempt")
        return when (val attemptResult = attemptSignUpVerification(signUpId, code)) {
            is ClerkApiResult.Success -> {
                val sessionId = attemptResult.body.createdSessionId
                if (attemptResult.body.status != STATUS_COMPLETE || sessionId.isNullOrBlank()) {
                    ApiResult.Error(message = "Verification incomplete")
                } else {
                    // Exchange Session ID for JWT Token
                    when (val tokenResult = getSessionToken(sessionId)) {
                        is ClerkApiResult.Success -> {
                            ApiResult.Success(
                                Session(
                                    token = tokenResult.body.jwt,
                                    sessionId = sessionId,
                                    userId = sessionId,
                                    email = email,
                                    isNewUser = true
                                )
                            )
                        }
                        is ClerkApiResult.Failure -> tokenResult.toApiError()
                    }
                }
            }
            is ClerkApiResult.Failure -> attemptResult.toApiError()
        }
    }

    private suspend fun createSignIn(email: String): ClerkApiResult<ClerkSignInResponse> {
        return postForm(
            path = "/v1/client/sign_ins",
            params = mapOf(
                "identifier" to email
            )
        )
    }

    private suspend fun prepareSignInFirstFactor(
        signInId: String,
        emailAddressId: String
    ): ClerkApiResult<ClerkSignInResponse> {
        return postForm(
            path = "/v1/client/sign_ins/$signInId/prepare_first_factor",
            params = mapOf(
                "strategy" to STRATEGY_EMAIL_CODE,
                "email_address_id" to emailAddressId
            )
        )
    }

    private suspend fun attemptSignInFirstFactor(
        signInId: String,
        code: String
    ): ClerkApiResult<ClerkSignInResponse> {
        return postForm(
            path = "/v1/client/sign_ins/$signInId/attempt_first_factor",
            params = mapOf(
                "strategy" to STRATEGY_EMAIL_CODE,
                "code" to code
            )
        )
    }

    private suspend fun createSignUp(email: String): ClerkApiResult<ClerkSignUpResponse> {
        return postForm(
            path = "/v1/client/sign_ups",
            params = mapOf(
                "email_address" to email
            )
        )
    }

    private suspend fun signOut(): ClerkApiResult<Unit> {
        var sessionId = sessionStore.getSessionId()
        
        if (sessionId.isNullOrBlank()) {
            AppLog.debug("ClerkHttpAuth", "Local sessionId missing, checking server for active sessions")
            when (val clientResult = getClient()) {
                is ClerkApiResult.Success -> {
                    sessionId = clientResult.body.sessions
                        ?.firstOrNull { it.status == "active" }
                        ?.id
                    if (sessionId == null) {
                        AppLog.debug("ClerkHttpAuth", "No active sessions found on server")
                        return ClerkApiResult.Success(Unit)
                    }
                    AppLog.debug("ClerkHttpAuth", "Found active session on server: $sessionId")
                }
                is ClerkApiResult.Failure -> {
                    AppLog.warn("ClerkHttpAuth", "Failed to check server for sessions: ${clientResult.message}")
                    return ClerkApiResult.Success(Unit) // Best effort
                }
            }
        }

        return postFormNoParse(
            path = "/v1/client/sessions/$sessionId/remove",
            params = emptyMap()
        )
    }

    private suspend fun prepareSignUpVerification(
        signUpId: String
    ): ClerkApiResult<ClerkSignUpResponse> {
        return postForm(
            path = "/v1/client/sign_ups/$signUpId/prepare_verification",
            params = mapOf(
                "strategy" to STRATEGY_EMAIL_CODE
            )
        )
    }

    private suspend fun attemptSignUpVerification(
        signUpId: String,
        code: String
    ): ClerkApiResult<ClerkSignUpResponse> {
        return postForm(
            path = "/v1/client/sign_ups/$signUpId/attempt_verification",
            params = mapOf(
                "strategy" to STRATEGY_EMAIL_CODE,
                "code" to code
            )
        )
    }

    private suspend fun getSessionToken(
        sessionId: String
    ): ClerkApiResult<ClerkTokenResponse> {
        return postForm(
            path = "/v1/client/sessions/$sessionId/tokens",
            params = emptyMap()
        )
    }

    private suspend fun getClient(): ClerkApiResult<ClerkClientResponse> {
        return getRequest(path = "/v1/client")
    }

    private suspend inline fun <reified T> getRequest(
        path: String
    ): ClerkApiResult<T> {
        return try {
            val deviceId = sessionStore.getOrCreateDeviceId()
            val deviceToken = sessionStore.getDeviceToken()
            val response = httpClient.get("$baseUrl$path?_is_native=true") {
                headers.append("clerk-api-version", ClerkConfig.API_VERSION)
                headers.append("x-mobile", "1")
                headers.append("x-native-device-id", deviceId)
                deviceToken?.let { headers.append(HttpHeaders.Authorization, it) }
                accept(ContentType.Application.Json)
            }
            val responseText = response.bodyAsText()
            if (response.status.value in 200..299) {
                val parsed = decodeResponse<T>(responseText)
                if (parsed != null) {
                    ClerkApiResult.Success(parsed)
                } else {
                    ClerkApiResult.Failure(response.status.value, null, "Unexpected Clerk response")
                }
            } else {
                val parsedError = parseError(responseText)
                ClerkApiResult.Failure(response.status.value, parsedError?.error?.code, parsedError?.error?.message ?: "Request failed")
            }
        } catch (e: Exception) {
            ClerkApiResult.Failure(0, null, e.message ?: "Request failed")
        }
    }

    private suspend inline fun <reified T> postForm(
        path: String,
        params: Map<String, String>
    ): ClerkApiResult<T> {
        return try {
            val deviceId = sessionStore.getOrCreateDeviceId()
            val deviceToken = sessionStore.getDeviceToken()
            AppLog.debug(
                "ClerkHttpAuth",
                "request path=$path baseUrl=$baseUrl deviceToken=${if (deviceToken.isNullOrBlank()) "missing" else "present"}"
            )
            val response = httpClient.submitForm(
                url = "$baseUrl$path?_is_native=true",
                formParameters = Parameters.build {
                    params.forEach { (key, value) -> append(key, value) }
                }
            ) {
                headers.append("clerk-api-version", ClerkConfig.API_VERSION)
                headers.append("x-mobile", "1")
                headers.append("x-native-device-id", deviceId)
                deviceToken?.let { headers.append(HttpHeaders.Authorization, it) }
                accept(ContentType.Application.Json)
            }
            response.headers[HttpHeaders.Authorization]?.let { sessionStore.saveDeviceToken(it) }
            val responseText = response.bodyAsText()

            if (response.status.value in 200..299) {
                val parsedError = parseError(responseText)
                if (parsedError?.error != null) {
                    ClerkApiResult.Failure(
                        status = response.status.value,
                        errorCode = parsedError.error.code,
                        message = parsedError.error.longMessage
                            ?: parsedError.error.message
                            ?: "Clerk request failed"
                    )
                } else {
                    val parsed = decodeResponse<T>(responseText)
                    if (parsed != null) {
                        ClerkApiResult.Success(parsed)
                    } else {
                        ClerkApiResult.Failure(
                            status = response.status.value,
                            errorCode = null,
                            message = "Unexpected Clerk response"
                        )
                    }
                }
            } else {
                val parsedError = parseError(responseText)
                ClerkApiResult.Failure(
                    status = response.status.value,
                    errorCode = parsedError?.error?.code,
                    message = parsedError?.error?.longMessage
                        ?: parsedError?.error?.message
                        ?: "Clerk request failed"
                )
            }
        } catch (e: Exception) {
            ClerkApiResult.Failure(
                status = 0,
                errorCode = null,
                message = e.message ?: "Clerk request failed"
            )
        }
    }

    private suspend fun postFormNoParse(
        path: String,
        params: Map<String, String>
    ): ClerkApiResult<Unit> {
        return try {
            val deviceId = sessionStore.getOrCreateDeviceId()
            val deviceToken = sessionStore.getDeviceToken()
            AppLog.debug(
                "ClerkHttpAuth",
                "request path=$path baseUrl=$baseUrl deviceToken=${if (deviceToken.isNullOrBlank()) "missing" else "present"}"
            )
            val response = httpClient.submitForm(
                url = "$baseUrl$path?_is_native=true",
                formParameters = Parameters.build {
                    params.forEach { (key, value) -> append(key, value) }
                }
            ) {
                headers.append("clerk-api-version", ClerkConfig.API_VERSION)
                headers.append("x-mobile", "1")
                headers.append("x-native-device-id", deviceId)
                deviceToken?.let { headers.append(HttpHeaders.Authorization, it) }
                accept(ContentType.Application.Json)
            }
            response.headers[HttpHeaders.Authorization]?.let { sessionStore.saveDeviceToken(it) }
            val responseText = response.bodyAsText()

            if (response.status.value in 200..299) {
                val parsedError = parseError(responseText)
                if (parsedError?.error != null) {
                    ClerkApiResult.Failure(
                        status = response.status.value,
                        errorCode = parsedError.error.code,
                        message = parsedError.error.longMessage
                            ?: parsedError.error.message
                            ?: "Clerk request failed"
                    )
                } else {
                    ClerkApiResult.Success(Unit)
                }
            } else {
                val parsedError = parseError(responseText)
                ClerkApiResult.Failure(
                    status = response.status.value,
                    errorCode = parsedError?.error?.code,
                    message = parsedError?.error?.longMessage
                        ?: parsedError?.error?.message
                        ?: "Clerk request failed"
                )
            }
        } catch (e: Exception) {
            ClerkApiResult.Failure(
                status = 0,
                errorCode = null,
                message = e.message ?: "Clerk request failed"
            )
        }
    }

    private fun parseError(responseText: String): ParsedClerkError? {
        val element = runCatching { json.parseToJsonElement(responseText) }.getOrNull() as? JsonObject
            ?: return null
        val errors = element["errors"] as? JsonArray ?: return null
        val firstError = errors.firstOrNull() as? JsonObject ?: return null
        return ParsedClerkError(
            error = ClerkError(
                message = firstError["message"]?.jsonPrimitive?.contentOrNull,
                code = firstError["code"]?.jsonPrimitive?.contentOrNull,
                longMessage = firstError["long_message"]?.jsonPrimitive?.contentOrNull
            ),
            traceId = element["clerk_trace_id"]?.jsonPrimitive?.contentOrNull
                ?: element["clerkTraceId"]?.jsonPrimitive?.contentOrNull
        )
    }

    private inline fun <reified T> decodeResponse(responseText: String): T? {
        val direct = runCatching { json.decodeFromString<T>(responseText) }.getOrNull()
        if (direct != null) {
            return direct
        }
        val element = runCatching { json.parseToJsonElement(responseText) }.getOrNull() as? JsonObject
            ?: return null
        val candidates = mutableListOf<JsonObject>()
        (element["response"] as? JsonObject)?.let { candidates.add(it) }
        (element["sign_in"] as? JsonObject)?.let { candidates.add(it) }
        (element["sign_up"] as? JsonObject)?.let { candidates.add(it) }
        if (element.size == 1) {
            (element.values.firstOrNull() as? JsonObject)?.let { candidates.add(it) }
        }
        for (candidate in candidates) {
            val parsed = runCatching { json.decodeFromJsonElement<T>(candidate) }.getOrNull()
            if (parsed != null) {
                return parsed
            }
        }
        return null
    }

    private sealed class ClerkApiResult<out T> {
        data class Success<T>(val body: T) : ClerkApiResult<T>()
        data class Failure(val status: Int, val errorCode: String?, val message: String) : ClerkApiResult<Nothing>()
    }

    private fun ClerkApiResult.Failure.toApiError(): ApiResult.Error {
        val errorMessage = if (errorCode != null) "[$errorCode] $message" else message
        return ApiResult.Error(code = status, message = errorMessage)
    }

    private enum class Flow {
        SignIn,
        SignUp
    }

    private data class ParsedClerkError(
        val error: ClerkError,
        val traceId: String?
    )

    private fun isAlreadySignedIn(result: ClerkApiResult.Failure): Boolean {
        val message = result.message.lowercase()
        return result.errorCode in ALREADY_SIGNED_IN_CODES || "already signed in" in message
    }

    companion object {
        private const val STRATEGY_EMAIL_CODE = "email_code"
        private const val STATUS_COMPLETE = "complete"
        private val IDENTIFIER_NOT_FOUND_CODES = setOf(
            "form_identifier_not_found",
            "identifier_not_found",
            "form_identifier_invalid"
        )
        private val ALREADY_SIGNED_IN_CODES = setOf(
            "already_signed_in",
            "client_already_signed_in"
        )
    }
}
