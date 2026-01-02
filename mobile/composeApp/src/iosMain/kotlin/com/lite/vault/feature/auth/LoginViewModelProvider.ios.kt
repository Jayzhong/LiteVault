package com.lite.vault.feature.auth

import androidx.compose.runtime.Composable
import org.koin.compose.koinInject

@Composable
actual fun rememberLoginViewModel(): LoginViewModel = koinInject()
