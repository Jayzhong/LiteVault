package com.lite.vault.data.source.litevault

import com.lite.vault.config.apiBaseUrl
import com.lite.vault.config.devUserId
import com.lite.vault.core.auth.SessionStore
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

class LiteVaultApi(
    private val httpClient: HttpClient,
    private val sessionStore: SessionStore,
    private val logger: Logger
) {
    private val baseUrl: String = apiBaseUrl().trimEnd('/')

    suspend fun getMe(): ApiUserProfile {
        val response = httpClient.get(url("/auth/me")) {
            applyAuth()
        }
        return response.ensureBody()
    }

    suspend fun updatePreferences(request: ApiUpdatePreferencesRequest): ApiUserProfile {
        val response = httpClient.patch(url("/auth/me/preferences")) {
            applyAuth()
            contentType(ContentType.Application.Json)
            setBody(request)
        }
        return response.ensureBody()
    }

    suspend fun updateProfile(request: ApiUpdateProfileRequest): ApiUserProfile {
        val response = httpClient.patch(url("/auth/me/profile")) {
            applyAuth()
            contentType(ContentType.Application.Json)
            setBody(request)
        }
        return response.ensureBody()
    }

    suspend fun createItem(request: ApiCreateItemRequest, idempotencyKey: String?): ApiItem {
        val response = httpClient.post(url("/items")) {
            applyAuth()
            contentType(ContentType.Application.Json)
            idempotencyKey?.let { header("Idempotency-Key", it) }
            setBody(request)
        }
        return response.ensureBody()
    }

    suspend fun getPendingItems(): ApiPendingItemsResponse {
        val response = httpClient.get(url("/items/pending")) {
            applyAuth()
        }
        return response.ensureBody()
    }

    suspend fun getItem(itemId: String): ApiItem {
        val response = httpClient.get(url("/items/$itemId")) {
            applyAuth()
        }
        return response.ensureBody()
    }

    suspend fun updateItem(itemId: String, request: ApiUpdateItemRequest): ApiUpdateItemResponse {
        val response = httpClient.patch(url("/items/$itemId")) {
            applyAuth()
            contentType(ContentType.Application.Json)
            setBody(request)
        }
        return response.ensureBody()
    }

    suspend fun getLibrary(cursor: String?, limit: Int): ApiLibraryResponse {
        val response = httpClient.get(url("/library")) {
            applyAuth()
            parameter("cursor", cursor)
            parameter("limit", limit)
        }
        return response.ensureBody()
    }

    suspend fun search(query: String, cursor: String?, limit: Int): ApiSearchResponse {
        val response = httpClient.get(url("/search")) {
            applyAuth()
            parameter("q", query)
            parameter("cursor", cursor)
            parameter("limit", limit)
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
            logger.warn("LiteVaultApi", "Request failed status=$statusCode body=${responseText.take(300)}")
            throw ApiException(statusCode, responseText)
        }
        return body()
    }
}
