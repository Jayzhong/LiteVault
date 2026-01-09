package com.lite.vault.config

import com.lite.vault.BuildConfig

actual fun apiBaseUrl(): String {
    val configured = BuildConfig.LITEVAULT_API_BASE_URL.trim()
    val defaultUrl = "http://10.0.2.2:8080/api/v1"
    return if (configured.isNotBlank()) {
        configured.trimEnd('/')
    } else {
        defaultUrl
    }
}
