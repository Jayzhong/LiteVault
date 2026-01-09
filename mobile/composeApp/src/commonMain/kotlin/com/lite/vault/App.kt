package com.lite.vault

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import com.lite.vault.core.designsystem.theme.AppTheme
import com.lite.vault.core.designsystem.theme.MintColors
import com.lite.vault.core.navigation.Navigator
import com.lite.vault.core.navigation.Screen
import com.lite.vault.domain.usecase.GetSessionUseCase
import com.lite.vault.feature.auth.LoginScreen
import com.lite.vault.feature.main.MainScreen
import com.lite.vault.feature.me.EditProfileScreen
import kotlinx.coroutines.launch
import org.koin.compose.KoinContext
import org.koin.compose.koinInject

/**
 * Main App Entry
 * 
 * Responsibilities:
 * - Apply AppTheme
 * - Check session on boot
 * - Navigate to Login or Home based on session state
 * - Render current screen from Navigator
 */
@Composable
fun App() {
    KoinContext {
        AppTheme {
            val navigator: Navigator = koinInject()
            val getSessionUseCase: GetSessionUseCase = koinInject()
            val currentScreen by navigator.currentScreen.collectAsState()
            
            // Boot logic: Check session on initial composition
            LaunchedEffect(Unit) {
                launch {
                    val sessionResult = getSessionUseCase()
                    val hasSession = sessionResult.getOrNull() != null
                    
                    if (hasSession) {
                        navigator.reset(Screen.Home)
                    } else {
                        navigator.reset(Screen.Login)
                    }
                }
            }
            
            // Render current screen
            when (currentScreen) {
                Screen.Splash -> SplashScreen()
                Screen.Login -> LoginScreen(navigator)
                Screen.Home -> MainScreen(
                    onLoggedOut = { navigator.reset(Screen.Login) }
                )
                Screen.EditProfile -> EditProfileScreen(
                    onBack = { navigator.reset(Screen.Home) },
                    onSaved = { navigator.reset(Screen.Home) },
                    showBack = false
                )
            }
        }
    }
}

@Composable
private fun SplashScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MintColors.White)
    )
}
