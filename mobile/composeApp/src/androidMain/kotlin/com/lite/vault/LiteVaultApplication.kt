package com.lite.vault

import android.app.Application
import com.lite.vault.di.initKoin
import org.koin.android.ext.koin.androidContext
import org.koin.android.ext.koin.androidLogger

class LiteVaultApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Initialize Koin
        initKoin {
            androidLogger()
            androidContext(this@LiteVaultApplication)
        }
    }
}
