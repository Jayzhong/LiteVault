package com.lite.vault.feature.me

import com.lite.vault.domain.model.UserProfile

/**
 * Me MVI Contract
 */
data class MeState(
    val isLoading: Boolean = false,
    val isLoggingOut: Boolean = false,
    val profile: UserProfile? = null,
    val errorMessage: String? = null,
    val logoutTick: Int = 0
)

sealed class MeIntent {
    data object Refresh : MeIntent()
    data object Logout : MeIntent()
}
