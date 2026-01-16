package com.lite.vault.core.logging

import io.github.aakira.napier.Antilog
import io.github.aakira.napier.LogLevel as NapierLogLevel

internal enum class LogSeverity {
    Debug,
    Info,
    Warn,
    Error
}

internal object LoggingConfig {
    var policy: LogPolicy = LogPolicy.Release
        set(value) {
            field = value
            Redactor.isEnabled = (value == LogPolicy.Release)
        }
}

internal fun LogPolicy.allows(level: LogSeverity): Boolean = when (this) {
    LogPolicy.Debug -> true
    LogPolicy.Release -> level >= LogSeverity.Warn
}

internal fun NapierLogLevel.toSeverity(): LogSeverity = when (this) {
    NapierLogLevel.VERBOSE -> LogSeverity.Debug
    NapierLogLevel.DEBUG -> LogSeverity.Debug
    NapierLogLevel.INFO -> LogSeverity.Info
    NapierLogLevel.WARNING -> LogSeverity.Warn
    NapierLogLevel.ERROR -> LogSeverity.Error
    NapierLogLevel.ASSERT -> LogSeverity.Error
}

internal class FilteringAntilog(
    private val policy: LogPolicy,
    private val delegate: Antilog
) : Antilog() {
    override fun isEnable(priority: NapierLogLevel, tag: String?): Boolean {
        return policy.allows(priority.toSeverity())
    }

    override fun performLog(
        priority: NapierLogLevel,
        tag: String?,
        throwable: Throwable?,
        message: String?
    ) {
        delegate.log(priority, tag, throwable, message)
    }
}
