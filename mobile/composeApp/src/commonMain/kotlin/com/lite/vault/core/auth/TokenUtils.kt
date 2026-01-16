package com.lite.vault.core.auth

import io.ktor.util.decodeBase64String
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import com.lite.vault.core.logging.AppLog
import kotlin.time.Clock

/**
 * Utility for parsing JWT tokens and checking expiration.
 */
object TokenUtils {
    private val json = Json { ignoreUnknownKeys = true }

    /**
     * Checks if the given JWT token is expired or will expire within [bufferSeconds].
     */
    fun isAboutToExpire(token: String?, bufferSeconds: Long = 10): Boolean {
        if (token.isNullOrBlank()) return true
        
        return try {
            val parts = token.split(".")
            if (parts.size != 3) return true
            
            // payload is second part
            val payload = parts[1].decodeBase64String()
            val jsonElement = json.parseToJsonElement(payload)
            val exp = jsonElement.jsonObject["exp"]?.jsonPrimitive?.longOrNull ?: return true
            
            // Match the pattern used in HomeScreen.kt and LiteVaultMappers.kt
            val nowMs = Clock.System.now().toEpochMilliseconds()
            val expMs = exp * 1000
            val bufferMs = bufferSeconds * 1000
            
            val diffMs = expMs - nowMs
            
            // Use explicit CompareTo to be 100% safe
            val isNear = diffMs.compareTo(bufferMs) < 0
            
            if (isNear) {
                AppLog.debug("TokenUtils", "Token near expiry: diff=${diffMs}ms")
            }
            
            isNear
        } catch (e: Exception) {
            AppLog.warn("TokenUtils", "Token parse failed: ${e.message}")
            true
        }
    }
}
