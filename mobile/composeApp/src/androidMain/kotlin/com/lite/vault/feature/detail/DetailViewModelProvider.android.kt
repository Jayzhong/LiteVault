package com.lite.vault.feature.detail

import androidx.compose.runtime.Composable
import org.koin.compose.viewmodel.koinViewModel

@Composable
actual fun rememberDetailViewModel(): DetailViewModel = koinViewModel()
