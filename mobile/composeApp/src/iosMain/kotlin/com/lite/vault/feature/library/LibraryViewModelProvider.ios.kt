package com.lite.vault.feature.library

import androidx.compose.runtime.Composable
import org.koin.compose.koinInject

@Composable
actual fun rememberLibraryViewModel(): LibraryViewModel = koinInject()
