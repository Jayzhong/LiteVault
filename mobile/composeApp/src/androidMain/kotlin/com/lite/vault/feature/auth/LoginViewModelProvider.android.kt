package com.lite.vault.feature.auth

import androidx.compose.runtime.Composable
import org.koin.compose.viewmodel.koinViewModel

@Composable
actual fun rememberLoginViewModel(): LoginViewModel = koinViewModel()
