package com.lite.vault

import android.app.Application
import android.content.pm.ApplicationInfo
import com.lite.vault.core.logging.LogPolicy
import com.lite.vault.core.logging.initLogging
import com.lite.vault.di.initKoin
import org.koin.android.ext.koin.androidContext
import org.koin.android.ext.koin.androidLogger

class LiteVaultApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        val isDebuggable = (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        val policy = if (isDebuggable) LogPolicy.Debug else LogPolicy.Release
        initLogging(policy)
        
        // Initialize Koin
        initKoin {
            androidLogger()
            androidContext(this@LiteVaultApplication)
        }
    }
}
