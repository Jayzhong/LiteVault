package com.lite.vault.feature.library

import com.lite.vault.domain.model.Item

/**
 * Library MVI Contract
 */
data class LibraryState(
    val query: String = "",
    val items: List<Item> = emptyList(),
    val isLoading: Boolean = false,
    val isSearching: Boolean = false,
    val errorMessage: String? = null,
    val timezoneId: String = "UTC"
)

sealed class LibraryIntent {
    data class QueryChanged(val value: String) : LibraryIntent()
    data object Retry : LibraryIntent()
}
