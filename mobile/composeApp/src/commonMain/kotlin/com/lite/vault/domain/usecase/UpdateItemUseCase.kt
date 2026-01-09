package com.lite.vault.domain.usecase

import com.lite.vault.domain.repository.ItemRepository

class UpdateItemUseCase(
    private val repository: ItemRepository
) {
    suspend operator fun invoke(
        itemId: String,
        title: String? = null,
        summary: String? = null,
        originalText: String? = null,
        tags: List<String>? = null
    ) = repository.updateItem(
        itemId = itemId,
        title = title,
        summary = summary,
        originalText = originalText,
        tags = tags
    )
}
