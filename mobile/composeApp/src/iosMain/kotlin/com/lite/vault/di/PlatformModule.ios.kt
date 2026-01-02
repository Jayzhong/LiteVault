package com.lite.vault.di

import com.lite.vault.core.auth.SessionStore
import org.koin.core.module.Module
import org.koin.dsl.module

actual fun platformModule(): Module = module {
    single<SessionStore> {
        SessionStore()
    }
}
