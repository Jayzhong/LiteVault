package com.lite.vault.core.network

import com.lite.vault.core.logging.Logger
import io.ktor.client.HttpClient
import io.ktor.client.engine.darwin.Darwin

actual fun createHttpClient(logger: Logger): HttpClient {
    return HttpClient(Darwin) {
        engine {
            configureRequest {
                setTimeoutInterval(30.0)
            }
        }
        configureHttpClient(logger)
    }
}
