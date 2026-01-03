package com.lite.vault.core.logging

import io.github.aakira.napier.Antilog
import io.github.aakira.napier.LogLevel
import io.github.aakira.napier.Napier
import platform.Foundation.NSLog

actual fun initLogging(policy: LogPolicy) {
    LoggingConfig.policy = policy
    val baseAntilog = IosNSLogAntilog(defaultTag = "LiteVault")
    Napier.base(FilteringAntilog(policy, baseAntilog))
}

private class IosNSLogAntilog(
    private val defaultTag: String = "app"
) : Antilog() {
    override fun performLog(
        priority: LogLevel,
        tag: String?,
        throwable: Throwable?,
        message: String?
    ) {
        val level = when (priority) {
            LogLevel.VERBOSE -> "V"
            LogLevel.DEBUG -> "D"
            LogLevel.INFO -> "I"
            LogLevel.WARNING -> "W"
            LogLevel.ERROR -> "E"
            LogLevel.ASSERT -> "A"
        }
        val safeTag = tag ?: defaultTag
        val base = "[$level] $safeTag ${message.orEmpty()}"
        val full = if (throwable != null) {
            "$base\n${throwable.stackTraceToString()}"
        } else {
            base
        }
        logLine(full)
    }
}

private fun logLine(message: String) {
    // NSLog treats format strings; escape % to avoid varargs crashes.
    val safe = message.replace("%", "%%")
    NSLog(safe)
}
