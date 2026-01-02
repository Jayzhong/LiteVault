package com.lite.vault.di

import com.lite.vault.core.navigation.Navigator
import com.lite.vault.core.network.createHttpClient
import com.lite.vault.data.repository.AuthRepositoryImpl
import com.lite.vault.data.source.AuthDataSource
import com.lite.vault.data.source.clerk.ClerkHttpAuthDataSource
import com.lite.vault.domain.repository.AuthRepository
import com.lite.vault.domain.usecase.GetSessionUseCase
import com.lite.vault.domain.usecase.LogoutUseCase
import com.lite.vault.domain.usecase.SendVerificationCodeUseCase
import com.lite.vault.domain.usecase.VerifyCodeUseCase
import com.lite.vault.feature.auth.LoginViewModel
import org.koin.core.context.startKoin
import org.koin.core.module.Module
import org.koin.dsl.KoinAppDeclaration
import org.koin.dsl.module

/**
 * Common App Module (shared across Android + iOS)
 */
fun appModule() = module {
    // Network
    single { createHttpClient() }
    
    // Navigation
    single { Navigator() }

    // Shared Clerk Frontend API implementation
    single<AuthDataSource> { ClerkHttpAuthDataSource(get(), get()) }
    
    // Repositories
    single<AuthRepository> { AuthRepositoryImpl(get(), get()) }
    
    // Use Cases
    factory { SendVerificationCodeUseCase(get()) }
    factory { VerifyCodeUseCase(get()) }
    factory { GetSessionUseCase(get()) }
    factory { LogoutUseCase(get()) }
    
    // ViewModels
    factory { LoginViewModel(get(), get()) }
}

/**
 * Platform Module (expect/actual)
 * Provides platform-specific dependencies like SessionStore
 */
expect fun platformModule(): Module

/**
 * Initialize Koin
 */
fun initKoin(config: KoinAppDeclaration? = null) {
    startKoin {
        config?.invoke(this)
        modules(appModule(), platformModule())
    }
}
