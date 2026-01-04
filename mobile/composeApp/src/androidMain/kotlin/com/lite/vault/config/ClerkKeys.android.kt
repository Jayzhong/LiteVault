package com.lite.vault.config

import com.lite.vault.BuildConfig

actual fun clerkPublishableKey(): String = BuildConfig.CLERK_PUBLISHABLE_KEY
