package com.lite.vault.config

import platform.Foundation.NSBundle

actual fun devUserId(): String {
    val configured = NSBundle.mainBundle.objectForInfoDictionaryKey("LITEVAULT_DEV_USER_ID") as? String
    val trimmed = configured?.trim().orEmpty()
    return if (trimmed.isBlank() || trimmed.contains("$(")) {
        ""
    } else {
        trimmed
    }
}
