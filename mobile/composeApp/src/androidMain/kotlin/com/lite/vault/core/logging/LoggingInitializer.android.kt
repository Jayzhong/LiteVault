package com.lite.vault.core.logging

import io.github.aakira.napier.DebugAntilog
import io.github.aakira.napier.Napier

actual fun initLogging(policy: LogPolicy) {
    LoggingConfig.policy = policy
    val baseAntilog = DebugAntilog(defaultTag = "LiteVault")
    Napier.base(FilteringAntilog(policy, baseAntilog))
}
