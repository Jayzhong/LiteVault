package com.lite.vault.feature.home

import com.lite.vault.domain.model.Item

/**
 * Home MVI Contract
 */
data class HomeState(
    val dateLabel: String = "",
    val greetingName: String = "",
    val inputText: String = "",
    val useAiEnabled: Boolean = true,
    val isSaving: Boolean = false,
    val pendingItems: List<Item> = emptyList(),
    val recentItems: List<Item> = emptyList(),
    val errorMessage: String? = null
)

sealed class HomeIntent {
    data class InputChanged(val value: String) : HomeIntent()
    data object ToggleUseAi : HomeIntent()
    data object SaveClicked : HomeIntent()
    data object RefreshAll : HomeIntent()
    data object RefreshPending : HomeIntent()
    data object ClearError : HomeIntent()
}
