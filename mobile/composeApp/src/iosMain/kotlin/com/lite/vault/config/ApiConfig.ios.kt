package com.lite.vault.config

import platform.Foundation.NSBundle

actual fun apiBaseUrl(): String {
    val configured = NSBundle.mainBundle.objectForInfoDictionaryKey("LITEVAULT_API_BASE_URL") as? String
    val defaultUrl = "http://localhost:8080/api/v1"
    val trimmed = configured?.trim().orEmpty()
    val lower = trimmed.lowercase()
    val looksInvalid = lower == "http" ||
        lower == "https" ||
        lower == "http://" ||
        lower == "https://" ||
        lower.startsWith("http://http") ||
        lower.startsWith("https://http") ||
        lower.startsWith("http://https") ||
        lower.startsWith("https://https")
    val resolved = if (trimmed.isBlank() || trimmed.contains("$(") || looksInvalid) {
        defaultUrl
    } else {
        trimmed
    }
    val normalized = normalizeBaseUrl(resolved)
    val finalUrl = if (isInvalidNormalizedUrl(normalized)) {
        normalizeBaseUrl(defaultUrl)
    } else {
        normalized
    }
    println("ApiConfig apiBaseUrl configured='$trimmed' resolved='$resolved' final='$finalUrl'")
    return finalUrl
}

private fun normalizeBaseUrl(raw: String): String {
    var url = raw.trim().trimEnd('/')
    if (!url.contains("://")) {
        url = "http://$url"
    }

    val schemeSeparator = "://"
    val schemeEnd = url.indexOf(schemeSeparator)
    val scheme = url.substring(0, schemeEnd)
    val remainder = url.substring(schemeEnd + schemeSeparator.length)
    val pathIndex = remainder.indexOf('/')
    val hostPort = if (pathIndex >= 0) remainder.substring(0, pathIndex) else remainder
    val path = if (pathIndex >= 0) remainder.substring(pathIndex) else ""

    val host = hostPort.substringBefore(':').lowercase()
    val port = hostPort.substringAfter(':', "")
    val isLocalHost = host == "localhost" || host == "127.0.0.1" || host == "0.0.0.0"
    val normalizedHost = if (host == "localhost") "127.0.0.1" else host
    val resolvedPort = if (port.isBlank() && isLocalHost) "8080" else port
    val updatedHostPort = if (resolvedPort.isBlank()) {
        normalizedHost
    } else {
        "$normalizedHost:$resolvedPort"
    }
    url = "$scheme://$updatedHostPort$path"

    val hasApiVersion = Regex("/api/v\\d+").containsMatchIn(url)
    val hasApiRoot = url.endsWith("/api") || url.contains("/api/")
    url = when {
        hasApiVersion -> url
        url.endsWith("/api") -> "$url/v1"
        hasApiRoot -> url
        else -> "$url/api/v1"
    }
    return url.trimEnd('/')
}

private fun isInvalidNormalizedUrl(url: String): Boolean {
    val schemeSeparator = "://"
    val schemeEnd = url.indexOf(schemeSeparator)
    if (schemeEnd <= 0) return true
    val remainder = url.substring(schemeEnd + schemeSeparator.length)
    val host = remainder.substringBefore('/').substringBefore(':').lowercase()
    if (host.isBlank()) return true
    return host == "http" || host == "https"
}
