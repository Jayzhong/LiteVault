package com.lite.vault.feature.home

import androidx.compose.runtime.Composable
import org.koin.compose.viewmodel.koinViewModel

@Composable
actual fun rememberHomeViewModel(): HomeViewModel = koinViewModel()
