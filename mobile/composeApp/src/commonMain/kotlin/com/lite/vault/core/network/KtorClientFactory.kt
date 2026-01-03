package com.lite.vault.core.network

import com.lite.vault.core.logging.Logger
import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.plugins.HttpResponseValidator
import io.ktor.client.plugins.ResponseException
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import kotlin.time.TimeMark

/**
 * Ktor HttpClient Factory
 * Platform-specific engines provided via expect/actual
 */
expect fun createHttpClient(logger: Logger): HttpClient

/**
 * Shared Ktor client configuration
 */
fun HttpClientConfig<*>.configureHttpClient(logger: Logger) {
    install(ContentNegotiation) {
        json(Json {
            ignoreUnknownKeys = true
            prettyPrint = true
            isLenient = true
        })
    }

    install(SafeNetworkLogging) {
        this.logger = logger
    }

    HttpResponseValidator {
        handleResponseExceptionWithRequest { cause, request ->
            val startTime: TimeMark? = request.attributes.getOrNull(SafeNetworkStartTimeKey)
            val latencyMs = startTime?.elapsedNow()?.inWholeMilliseconds
            val method = request.method.value
            val path = request.url.encodedPath
            val response = (cause as? ResponseException)?.response
            val status = response?.status?.value?.toString() ?: "error"
            val traceId = response?.headers?.let { findTraceId(it) }

            val message = buildMessage(
                method = method,
                path = path,
                status = status,
                latencyMs = latencyMs,
                traceId = traceId,
                error = cause::class.simpleName
            )
            logger.warn("Network", message)
        }
    }
}
