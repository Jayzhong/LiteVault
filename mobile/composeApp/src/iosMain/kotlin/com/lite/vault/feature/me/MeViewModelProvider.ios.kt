package com.lite.vault.feature.me

import androidx.compose.runtime.Composable
import org.koin.compose.koinInject

@Composable
actual fun rememberMeViewModel(): MeViewModel = koinInject()
