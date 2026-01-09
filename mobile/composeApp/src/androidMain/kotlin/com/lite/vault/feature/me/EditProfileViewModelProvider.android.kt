package com.lite.vault.feature.me

import androidx.compose.runtime.Composable
import org.koin.compose.viewmodel.koinViewModel

@Composable
actual fun rememberEditProfileViewModel(): EditProfileViewModel = koinViewModel()
