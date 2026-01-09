package com.lite.vault.domain.usecase

import com.lite.vault.domain.repository.ItemRepository

class ConfirmItemUseCase(
    private val repository: ItemRepository
) {
    suspend operator fun invoke(
        itemId: String,
        acceptedSuggestionIds: List<String> = emptyList(),
        rejectedSuggestionIds: List<String> = emptyList(),
        addedTagIds: List<String> = emptyList(),
        title: String? = null,
        summary: String? = null,
        tags: List<String>? = null,
        originalText: String? = null
    ) = repository.confirmItem(
        itemId = itemId,
        acceptedSuggestionIds = acceptedSuggestionIds,
        rejectedSuggestionIds = rejectedSuggestionIds,
        addedTagIds = addedTagIds,
        title = title,
        summary = summary,
        tags = tags,
        originalText = originalText
    )
}
