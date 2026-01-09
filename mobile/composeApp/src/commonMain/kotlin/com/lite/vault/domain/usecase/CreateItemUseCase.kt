package com.lite.vault.domain.usecase

import com.lite.vault.domain.repository.ItemRepository

class CreateItemUseCase(
    private val repository: ItemRepository
) {
    suspend operator fun invoke(rawText: String, enrich: Boolean, tagIds: List<String> = emptyList()) =
        repository.createItem(rawText = rawText, enrich = enrich, tagIds = tagIds)
}
