package com.lite.vault.config

import com.lite.vault.BuildConfig

actual fun devUserId(): String = BuildConfig.LITEVAULT_DEV_USER_ID.trim()
