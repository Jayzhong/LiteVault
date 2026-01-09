package com.lite.vault.core.navigation

/**
 * Type-safe navigation screens
 */
sealed class Screen {
    data object Splash : Screen()
    data object Login : Screen()
    data object Home : Screen()
    data object EditProfile : Screen()
}
