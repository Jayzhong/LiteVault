package com.lite.vault.core.logging

import org.koin.core.module.Module
import org.koin.dsl.module

fun loggingModule(): Module = module {
    single<Logger> { NapierLogger(LoggingConfig.policy) }
}
