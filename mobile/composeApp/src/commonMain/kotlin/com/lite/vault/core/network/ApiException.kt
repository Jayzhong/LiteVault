package com.lite.vault.core.network

/**
 * Exception for non-2xx API responses.
 */
class ApiException(
    val statusCode: Int,
    val responseBody: String
) : RuntimeException("API request failed with status $statusCode")
