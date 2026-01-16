package com.lite.vault.data.source.litevault

import com.lite.vault.config.apiBaseUrl
import com.lite.vault.config.devUserId
import com.lite.vault.core.auth.SessionStore
import com.lite.vault.core.auth.TokenUtils
import com.lite.vault.core.logging.Logger
import com.lite.vault.core.network.ApiException
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.request.parameter
import io.ktor.client.request.patch
import io.ktor.client.statement.bodyAsText
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.Url
import io.ktor.http.contentType
import com.lite.vault.core.network.ApiResult

import com.lite.vault.domain.repository.AuthRepository

class LiteVaultApi(
    private val httpClient: HttpClient,
    private val sessionStore: SessionStore,
    private val authRepository: AuthRepository,
    private val logger: Logger
) {
    private val baseUrl: String = apiBaseUrl().trimEnd('/')

    suspend fun getMe(): ApiUserProfile = request {
        val result = httpClient.get(url("/auth/me")) { applyAuth() }
        // Use a temporary variable to allow logging the raw body if needed, 
        // but since request/ensureBody handles the deserialization, 
        // we'll just return it and let the request helper do its job.
        result
    }

    suspend fun updatePreferences(request: ApiUpdatePreferencesRequest): ApiUserProfile = request {
        httpClient.patch(url("/auth/me/preferences")) {
            applyAuth()
            contentType(ContentType.Application.Json)
            setBody(request)
        }
    }

    suspend fun updateProfile(request: ApiUpdateProfileRequest): ApiUserProfile = request {
        httpClient.patch(url("/auth/me/profile")) {
            applyAuth()
            contentType(ContentType.Application.Json)
            setBody(request)
        }
    }

    suspend fun createItem(request: ApiCreateItemRequest, idempotencyKey: String?): ApiItem = request {
        httpClient.post(url("/items")) {
            applyAuth()
            contentType(ContentType.Application.Json)
            idempotencyKey?.let { header("Idempotency-Key", it) }
            setBody(request)
        }
    }

    suspend fun getPendingItems(): ApiPendingItemsResponse = request {
        httpClient.get(url("/items/pending")) {
            applyAuth()
        }
    }

    suspend fun getItem(itemId: String): ApiItem = request {
        httpClient.get(url("/items/$itemId")) {
            applyAuth()
        }
    }

    suspend fun updateItem(itemId: String, request: ApiUpdateItemRequest): ApiUpdateItemResponse = request {
        httpClient.patch(url("/items/$itemId")) {
            applyAuth()
            contentType(ContentType.Application.Json)
            setBody(request)
        }
    }

    suspend fun getLibrary(cursor: String?, limit: Int): ApiLibraryResponse = request {
        httpClient.get(url("/library")) {
            applyAuth()
            parameter("cursor", cursor)
            parameter("limit", limit)
        }
    }

    suspend fun search(query: String, cursor: String?, limit: Int): ApiSearchResponse = request {
        httpClient.get(url("/search")) {
            applyAuth()
            parameter("q", query)
            parameter("cursor", cursor)
            parameter("limit", limit)
        }
    }

    /**
     * Helper to execute a request with automatic token refresh retry on 401.
     */
    private suspend inline fun <reified T> request(
        crossinline block: suspend () -> HttpResponse
    ): T {
        // Pre-emptive Token Refresh: Check if token is about to expire before sending request
        val currentToken = sessionStore.getSession()
        if (TokenUtils.isAboutToExpire(currentToken)) {
            logger.info("LiteVaultApi", "Token about to expire, pre-emptively refreshing")
            when (val refreshResult = authRepository.refreshToken()) {
                is ApiResult.Success -> logger.info("LiteVaultApi", "Pre-emptive refresh successful")
                is ApiResult.Error -> logger.warn("LiteVaultApi", "Pre-emptive refresh failed: ${refreshResult.message}")
            }
        }

        var response = block()
        if (response.status.value == 401) {
            logger.info("LiteVaultApi", "Unauthorized (401), attempting token refresh")
            when (val refreshResult = authRepository.refreshToken()) {
                is ApiResult.Success -> {
                    logger.info("LiteVaultApi", "Token refresh successful, retrying request")
                    response = block() // Retry the request with new token
                }
                is ApiResult.Error -> {
                    logger.warn("LiteVaultApi", "Token refresh failed: ${refreshResult.message}")
                }
            }
        }
        return response.ensureBody()
    }

    private fun url(path: String): String = "$baseUrl$path"

    private suspend fun HttpRequestBuilder.applyAuth() {
        val token = sessionStore.getSession().orEmpty()
        val isJwt = token.count { it == '.' } >= 2
        if (token.isNotBlank() && isJwt) {
            header(HttpHeaders.Authorization, "Bearer $token")
            logger.debug("LiteVaultApi", "Using Clerk JWT auth")
        } else {
            val configuredDevUserId = devUserId().trim()
            val useDevAuth = configuredDevUserId.isNotBlank() || isDevBaseUrl(baseUrl)
            if (!useDevAuth) {
                logger.debug("LiteVaultApi", "Dev auth disabled for baseUrl")
                return
            }
            val devId = if (configuredDevUserId.isNotBlank()) {
                logger.debug("LiteVaultApi", "Using dev auth from config")
                configuredDevUserId
            } else {
                logger.debug("LiteVaultApi", "Using dev auth from device id")
                sessionStore.getOrCreateDeviceId()
            }
            header("X-Dev-User-Id", devId)
        }
    }

    private fun isDevBaseUrl(url: String): Boolean {
        val host = runCatching { Url(url).host.lowercase() }.getOrDefault(url.lowercase())
        return host == "localhost" ||
            host == "127.0.0.1" ||
            host == "10.0.2.2" ||
            host == "10.0.3.2" ||
            host.endsWith(".local") ||
            host.contains("dev") ||
            host.contains("test") ||
            host.contains("staging")
    }

    private suspend inline fun <reified T> HttpResponse.ensureBody(): T {
        val statusCode = status.value
        if (statusCode !in 200..299) {
            val responseText = bodyAsText()
            logger.warn("LiteVaultApi", "Request failed status=$statusCode")
            throw ApiException(statusCode, responseText)
        }
        return body()
    }
}
