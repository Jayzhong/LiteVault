package com.lite.vault.feature.detail

import androidx.compose.runtime.Composable
import org.koin.compose.koinInject

@Composable
actual fun rememberDetailViewModel(): DetailViewModel = koinInject()
