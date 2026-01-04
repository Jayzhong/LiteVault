package com.lite.vault.config

import platform.Foundation.NSBundle

actual fun clerkPublishableKey(): String {
    val value = NSBundle.mainBundle.objectForInfoDictionaryKey("CLERK_PUBLISHABLE_KEY") as? String
    return value?.trim().orEmpty()
}
