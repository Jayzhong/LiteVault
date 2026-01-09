package com.lite.vault.core.network

import kotlin.random.Random

/**
 * Generate a random idempotency key for POST requests.
 */
fun generateIdempotencyKey(): String {
    val bytes = ByteArray(16)
    Random.nextBytes(bytes)
    return bytes.joinToString(separator = "") { byte ->
        val value = byte.toInt() and 0xFF
        value.toString(16).padStart(2, '0')
    }
}
