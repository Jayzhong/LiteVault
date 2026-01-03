package com.lite.vault.core.logging

interface Logger {
    fun debug(tag: String, message: String, throwable: Throwable? = null)

    fun info(tag: String, message: String, throwable: Throwable? = null)

    fun warn(tag: String, message: String, throwable: Throwable? = null)

    fun error(tag: String, message: String, throwable: Throwable? = null)

    fun event(name: String, attributes: Map<String, String> = emptyMap())
}

enum class LogPolicy {
    Debug,
    Release
}

expect fun initLogging(policy: LogPolicy)
