package com.lite.vault.config

import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

object ClerkConfig {
    // Ideally this should be in BuildConfig or checking build types
    // TODO: handle the key
    const val PUBLISHABLE_KEY = "pk_test_"
    const val API_VERSION = "2025-11-10"

    @OptIn(ExperimentalEncodingApi::class)
    fun frontendApiBaseUrl(): String {
        val key = PUBLISHABLE_KEY.trim()
        val encoded = when {
            key.startsWith("pk_test_") -> key.removePrefix("pk_test_")
            key.startsWith("pk_live_") -> key.removePrefix("pk_live_")
            else -> error("Unsupported Clerk publishable key format")
        }
        val decoded = decodeBase64Url(encoded)
        val domain = decoded.removeSuffix("$")
        return "https://$domain"
    }

    @OptIn(ExperimentalEncodingApi::class)
    private fun decodeBase64Url(encoded: String): String {
        val normalized = encoded.replace('-', '+').replace('_', '/')
        val paddingSize = (4 - normalized.length % 4) % 4
        val padded = normalized + "=".repeat(paddingSize)
        return Base64.decode(padded).decodeToString()
    }
}
