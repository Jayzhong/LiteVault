package com.lite.vault.core.logging

object Redactor {
    private val authHeaderRegex = Regex("(?i)(authorization|cookie|set-cookie)\\s*:\\s*[^\\r\\n]+")
    private val authKeyValueRegex = Regex("(?i)(authorization|cookie|set-cookie)\\s*=\\s*[^\\s;]+")
    private val bearerRegex = Regex("(?i)bearer\\s+[A-Za-z0-9-_=\\.]+")
    private val jwtRegex = Regex("\\b[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\b")
    private val otpRegex = Regex("(?i)(code|otp|verification|verif|pin)\\s*[:=]\\s*\\d{4,8}")
    private val otpJsonRegex = Regex("(?i)(\"(code|otp|verification_code|verificationCode|pin)\"\\s*:\\s*\")\\d{4,8}\"")
    private val rawTextJsonRegex = Regex("(?i)(\"raw[_-]?text\"\\s*:\\s*\")([^\"]*)\"")
    private val rawTextKvRegex = Regex("(?i)(raw[_-]?text\\s*[:=]\\s*)([^\\s,}]+)")
    private val responseTextRegex = Regex(
        "(?s)(Text:\\s*\\\")(.*?)(\\\")"
    )
    private val emailRegex = Regex(
        "\\b([A-Za-z0-9._%+-])([A-Za-z0-9._%+-]*?)@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})\\b"
    )
    private val sensitiveKeys = setOf(
        "raw_text",
        "raw-text",
        "rawtext",
        "code",
        "otp",
        "verification_code",
        "verificationcode",
        "token",
        "authorization",
        "cookie",
        "email",
        "identifier"
    )

    fun redact(message: String): String {
        var result = message
        result = redactRawText(result)
        result = redactResponseText(result)
        result = redactHeaders(result)
        result = redactBearer(result)
        result = redactJwt(result)
        result = redactOtp(result)
        result = maskEmails(result)
        return result
    }

    fun redactAttributes(attributes: Map<String, String>): Map<String, String> {
        if (attributes.isEmpty()) return attributes
        return attributes.mapValues { (key, value) ->
            val normalizedKey = key.lowercase()
            if (normalizedKey in sensitiveKeys) {
                redactSensitiveValue(normalizedKey, value)
            } else {
                redact(value)
            }
        }
    }

    fun redactThrowable(throwable: Throwable): Throwable {
        val message = throwable.message?.let { redact(it) }
        return Throwable(message)
    }

    private fun redactSensitiveValue(key: String, value: String): String {
        return if (key == "raw_text" || key == "raw-text" || key == "rawtext") {
            "[REDACTED_TEXT len=${value.length}]"
        } else {
            redact(value)
        }
    }

    private fun redactRawText(input: String): String {
        var result = rawTextJsonRegex.replace(input) { match ->
            val value = match.groupValues[2]
            "${match.groupValues[1]}[REDACTED_TEXT len=${value.length}]\""
        }
        result = rawTextKvRegex.replace(result) { match ->
            val value = match.groupValues[2]
            "${match.groupValues[1]}[REDACTED_TEXT len=${value.length}]"
        }
        return result
    }

    private fun redactResponseText(input: String): String {
        return responseTextRegex.replace(input) { match ->
            val value = match.groupValues[2]
            "${match.groupValues[1]}[REDACTED_TEXT len=${value.length}]${match.groupValues[3]}"
        }
    }

    private fun redactHeaders(input: String): String {
        var result = authHeaderRegex.replace(input) { match ->
            val header = match.groupValues[1]
            "$header: [REDACTED]"
        }
        result = authKeyValueRegex.replace(result) { match ->
            val header = match.groupValues[1]
            "$header=[REDACTED]"
        }
        return result
    }

    private fun redactBearer(input: String): String {
        return bearerRegex.replace(input) { _ -> "Bearer [REDACTED]" }
    }

    private fun redactJwt(input: String): String {
        return jwtRegex.replace(input) { _ -> "[REDACTED_JWT]" }
    }

    private fun redactOtp(input: String): String {
        var result = otpRegex.replace(input) { match ->
            val key = match.value.substringBefore(":").substringBefore("=").trim()
            "$key=[REDACTED_CODE]"
        }
        result = otpJsonRegex.replace(result) { match ->
            "${match.groupValues[1]}[REDACTED_CODE]\""
        }
        return result
    }

    private fun maskEmails(input: String): String {
        return emailRegex.replace(input) { match ->
            val first = match.groupValues[1]
            val domain = match.groupValues[3]
            "${first}***@$domain"
        }
    }
}
