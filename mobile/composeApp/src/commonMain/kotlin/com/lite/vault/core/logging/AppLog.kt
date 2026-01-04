package com.lite.vault.core.logging

import org.koin.mp.KoinPlatform

/**
 * Facade over Logger that resolves from Koin when available.
 */
object AppLog : Logger {
    override fun debug(tag: String, message: String, throwable: Throwable?) {
        resolve()?.debug(tag, message, throwable)
    }

    override fun info(tag: String, message: String, throwable: Throwable?) {
        resolve()?.info(tag, message, throwable)
    }

    override fun warn(tag: String, message: String, throwable: Throwable?) {
        resolve()?.warn(tag, message, throwable)
    }

    override fun error(tag: String, message: String, throwable: Throwable?) {
        resolve()?.error(tag, message, throwable)
    }

    override fun event(name: String, attributes: Map<String, String>) {
        resolve()?.event(name, attributes)
    }

    private fun resolve(): Logger? = KoinPlatform.getKoinOrNull()?.get<Logger>()
}
