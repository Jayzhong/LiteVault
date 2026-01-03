package com.lite.vault

import androidx.compose.ui.window.ComposeUIViewController
import com.lite.vault.core.logging.LogPolicy
import com.lite.vault.core.logging.initLogging
import com.lite.vault.di.initKoin
import kotlin.native.Platform

@OptIn(kotlin.experimental.ExperimentalNativeApi::class)
fun MainViewController() = ComposeUIViewController(
    configure = {
        val policy = if (Platform.isDebugBinary) LogPolicy.Debug else LogPolicy.Release
        initLogging(policy)
        initKoin()
    }
) { App() }
