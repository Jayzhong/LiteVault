package com.lite.vault.core.network

import com.lite.vault.core.logging.Logger
import io.ktor.client.plugins.api.createClientPlugin
import io.ktor.http.Headers
import io.ktor.util.AttributeKey
import kotlin.time.TimeMark
import kotlin.time.TimeSource

class SafeNetworkLoggingConfig {
    lateinit var logger: Logger
    var tag: String = "Network"
}

val SafeNetworkLogging = createClientPlugin("SafeNetworkLogging", ::SafeNetworkLoggingConfig) {
    val config = pluginConfig

    onRequest { request, _ ->
        request.attributes.put(SafeNetworkStartTimeKey, TimeSource.Monotonic.markNow())
    }

    onResponse { response ->
        val logger = config.logger
        val startTime = response.call.request.attributes.getOrNull(SafeNetworkStartTimeKey)
    val latencyMs = startTime?.elapsedNow()?.inWholeMilliseconds
    val method = response.call.request.method.value
    val requestUrl = response.call.request.url
    val path = requestUrl.encodedPath
    val status = response.status.value
    val traceId = findTraceId(response.headers)
    val url = buildUrlLabel(
        scheme = requestUrl.protocol.name,
        host = requestUrl.host,
        port = requestUrl.port,
        path = path
    )

    val message = buildMessage(
        method = method,
        path = path,
        url = url,
        status = status.toString(),
        latencyMs = latencyMs,
        traceId = traceId
    )
    logger.info(config.tag, message)
    }
}

internal val SafeNetworkStartTimeKey = AttributeKey<TimeMark>("SafeNetworkStartTime")

internal fun buildMessage(
    method: String,
    path: String,
    url: String? = null,
    status: String,
    latencyMs: Long?,
    traceId: String?,
    error: String? = null
): String {
    val latencyPart = latencyMs?.let { " latency_ms=$it" } ?: ""
    val tracePart = traceId?.let { " trace_id=$it" } ?: ""
    val errorPart = error?.let { " error=$it" } ?: ""
    val urlPart = url?.let { " url=$it" } ?: ""
    return "method=$method path=$path$urlPart status=$status$latencyPart$tracePart$errorPart"
}

internal fun buildUrlLabel(
    scheme: String,
    host: String,
    port: Int,
    path: String
): String {
    val portPart = if (port == 80 || port == 443) "" else ":$port"
    return "$scheme://$host$portPart$path"
}

internal fun findTraceId(headers: Headers): String? {
    val candidates = listOf(
        "x-request-id",
        "x-correlation-id",
        "x-trace-id",
        "trace-id",
        "x-amzn-trace-id",
        "x-b3-traceid",
        "x-cloud-trace-context",
        "clerk-trace-id",
        "clerk_trace_id"
    )
    for (name in candidates) {
        headers[name]?.let { return it }
    }
    return null
}
