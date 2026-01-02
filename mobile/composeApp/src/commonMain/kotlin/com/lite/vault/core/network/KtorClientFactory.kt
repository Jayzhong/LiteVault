package com.lite.vault.core.network

import io.ktor.client.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json

/**
 * Ktor HttpClient Factory
 * Platform-specific engines provided via expect/actual
 */
expect fun createHttpClient(): HttpClient

/**
 * Shared Ktor client configuration
 */
fun configureHttpClient(httpClient: HttpClient): HttpClient {
    return httpClient.config {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                prettyPrint = true
                isLenient = true
            })
        }
        
        install(Logging) {
            logger = Logger.DEFAULT
            level = LogLevel.BODY
        }
        
        // Timeout configuration
        engine {
            // Platform-specific timeout will be set in actual implementations
        }
    }
}
