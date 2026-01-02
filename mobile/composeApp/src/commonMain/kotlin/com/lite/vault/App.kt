package com.lite.vault

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.lite.vault.core.designsystem.theme.AppTheme
import com.lite.vault.core.navigation.Navigator
import com.lite.vault.core.navigation.Screen
import com.lite.vault.domain.usecase.GetSessionUseCase
import com.lite.vault.feature.auth.LoginScreen
import com.lite.vault.feature.home.HomeScreen
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
                Screen.Login -> LoginScreen(navigator)
                Screen.Home -> HomeScreen(navigator)
            }
        }
    }
}