package com.lite.vault.core.navigation

/**
 * Type-safe navigation screens
 */
sealed class Screen {
    data object Login : Screen()
    data object Home : Screen()
}
