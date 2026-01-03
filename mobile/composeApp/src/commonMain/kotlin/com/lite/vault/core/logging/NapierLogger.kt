package com.lite.vault.core.logging

import io.github.aakira.napier.Napier

internal class NapierLogger(private val policy: LogPolicy) : Logger {
    override fun debug(tag: String, message: String, throwable: Throwable?) {
        log(LogSeverity.Debug, tag, message, throwable)
    }

    override fun info(tag: String, message: String, throwable: Throwable?) {
        log(LogSeverity.Info, tag, message, throwable)
    }

    override fun warn(tag: String, message: String, throwable: Throwable?) {
        log(LogSeverity.Warn, tag, message, throwable)
    }

    override fun error(tag: String, message: String, throwable: Throwable?) {
        log(LogSeverity.Error, tag, message, throwable)
    }

    override fun event(name: String, attributes: Map<String, String>) {
        if (!policy.allows(LogSeverity.Info)) return
        val safeAttributes = Redactor.redactAttributes(attributes)
        val payload = if (safeAttributes.isEmpty()) {
            "event=$name"
        } else {
            val formatted = safeAttributes.entries.joinToString(" ") { (key, value) ->
                "$key=$value"
            }
            "event=$name $formatted"
        }
        Napier.i(payload, tag = "Event")
    }

    private fun log(level: LogSeverity, tag: String, message: String, throwable: Throwable?) {
        if (!policy.allows(level)) return
        val safeMessage = Redactor.redact(message)
        val safeThrowable = throwable?.let { Redactor.redactThrowable(it) }
        when (level) {
            LogSeverity.Debug -> Napier.d(safeMessage, tag = tag, throwable = safeThrowable)
            LogSeverity.Info -> Napier.i(safeMessage, tag = tag, throwable = safeThrowable)
            LogSeverity.Warn -> Napier.w(safeMessage, tag = tag, throwable = safeThrowable)
            LogSeverity.Error -> Napier.e(safeMessage, tag = tag, throwable = safeThrowable)
        }
    }
}
