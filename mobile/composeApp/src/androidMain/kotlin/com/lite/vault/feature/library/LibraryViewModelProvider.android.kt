package com.lite.vault.feature.library

import androidx.compose.runtime.Composable
import org.koin.compose.viewmodel.koinViewModel

@Composable
actual fun rememberLibraryViewModel(): LibraryViewModel = koinViewModel()
