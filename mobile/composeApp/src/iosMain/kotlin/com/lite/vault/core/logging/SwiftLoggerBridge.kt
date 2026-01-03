package com.lite.vault.core.logging

import org.koin.mp.KoinPlatform

object SwiftLoggerBridge {
    private fun loggerOrNull(): Logger? = KoinPlatform.getKoinOrNull()?.get<Logger>()

    fun debug(tag: String, message: String) {
        loggerOrNull()?.debug(tag, message)
    }

    fun info(tag: String, message: String) {
        loggerOrNull()?.info(tag, message)
    }

    fun warn(tag: String, message: String) {
        loggerOrNull()?.warn(tag, message)
    }

    fun error(tag: String, message: String) {
        loggerOrNull()?.error(tag, message)
    }

    fun event(name: String) {
        loggerOrNull()?.event(name)
    }

    fun eventWithAttributes(name: String, attributes: Map<String, String>) {
        loggerOrNull()?.event(name, attributes)
    }
}
