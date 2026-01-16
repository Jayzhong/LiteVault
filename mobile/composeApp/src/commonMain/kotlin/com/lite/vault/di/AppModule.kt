package com.lite.vault.di

import com.lite.vault.core.logging.loggingModule
import com.lite.vault.core.navigation.Navigator
import com.lite.vault.core.network.createHttpClient
import com.lite.vault.data.repository.AuthRepositoryImpl
import com.lite.vault.data.repository.ItemRepositoryImpl
import com.lite.vault.data.repository.LibraryRepositoryImpl
import com.lite.vault.data.repository.UserRepositoryImpl
import com.lite.vault.data.source.AuthDataSource
import com.lite.vault.data.source.clerk.ClerkHttpAuthDataSource
import com.lite.vault.data.source.litevault.LiteVaultApi
import com.lite.vault.domain.repository.AuthRepository
import com.lite.vault.domain.repository.ItemRepository
import com.lite.vault.domain.repository.LibraryRepository
import com.lite.vault.domain.repository.UserRepository
import com.lite.vault.domain.usecase.CreateItemUseCase
import com.lite.vault.domain.usecase.ConfirmItemUseCase
import com.lite.vault.domain.usecase.DiscardItemUseCase
import com.lite.vault.domain.usecase.GetLibraryUseCase
import com.lite.vault.domain.usecase.GetItemUseCase
import com.lite.vault.domain.usecase.GetPendingItemsUseCase
import com.lite.vault.domain.usecase.GetSessionUseCase
import com.lite.vault.domain.usecase.GetUserProfileUseCase
import com.lite.vault.domain.usecase.LogoutUseCase
import com.lite.vault.domain.usecase.SearchLibraryUseCase
import com.lite.vault.domain.usecase.SendVerificationCodeUseCase
import com.lite.vault.domain.usecase.UpdateItemUseCase
import com.lite.vault.domain.usecase.UpdateUserProfileUseCase
import com.lite.vault.domain.usecase.UpdateUserPreferencesUseCase
import com.lite.vault.domain.usecase.VerifyCodeUseCase
import com.lite.vault.feature.auth.LoginViewModel
import com.lite.vault.feature.home.HomeViewModel
import com.lite.vault.feature.detail.DetailViewModel
import com.lite.vault.feature.library.LibraryViewModel
import com.lite.vault.feature.me.EditProfileViewModel
import com.lite.vault.feature.me.MeViewModel
import org.koin.core.context.startKoin
import org.koin.core.module.Module
import org.koin.dsl.KoinAppDeclaration
import org.koin.dsl.module

/**
 * Common App Module (shared across Android + iOS)
 */
fun appModule() = module {
    // Network
    single { createHttpClient(get()) }

    // Navigation
    single { Navigator() }

    // LiteVault API
    single { LiteVaultApi(get(), get(), get(), get()) }

    // Shared Clerk Frontend API implementation
    single<AuthDataSource> { ClerkHttpAuthDataSource(get(), get()) }

    // Repositories
    single<AuthRepository> { AuthRepositoryImpl(get(), get()) }
    single<ItemRepository> { ItemRepositoryImpl(get()) }
    single<LibraryRepository> { LibraryRepositoryImpl(get()) }
    single<UserRepository> { UserRepositoryImpl(get(), get()) }

    // Use Cases
    factory { SendVerificationCodeUseCase(get()) }
    factory { VerifyCodeUseCase(get()) }
    factory { GetSessionUseCase(get()) }
    factory { LogoutUseCase(get()) }
    factory { CreateItemUseCase(get()) }
    factory { GetPendingItemsUseCase(get()) }
    factory { GetItemUseCase(get()) }
    factory { ConfirmItemUseCase(get()) }
    factory { DiscardItemUseCase(get()) }
    factory { UpdateItemUseCase(get()) }
    factory { GetLibraryUseCase(get()) }
    factory { SearchLibraryUseCase(get()) }
    factory { GetUserProfileUseCase(get()) }
    factory { UpdateUserPreferencesUseCase(get()) }
    factory { UpdateUserProfileUseCase(get()) }

    // ViewModels
    factory { LoginViewModel(get(), get()) }
    factory { HomeViewModel(get(), get(), get(), get()) }
    factory { LibraryViewModel(get(), get()) }
    factory { MeViewModel(get(), get()) }
    factory { EditProfileViewModel(get(), get()) }
    factory { DetailViewModel(get(), get(), get(), get()) }
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
        modules(loggingModule(), appModule(), platformModule())
    }
}
