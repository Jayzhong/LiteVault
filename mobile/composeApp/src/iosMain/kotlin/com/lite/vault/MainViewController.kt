package com.lite.vault

import androidx.compose.ui.window.ComposeUIViewController
import com.lite.vault.di.initKoin

fun MainViewController() = ComposeUIViewController(
    configure = {
        initKoin()
    }
) { App() }
