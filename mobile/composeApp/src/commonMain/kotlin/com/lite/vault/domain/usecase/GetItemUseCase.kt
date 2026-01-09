package com.lite.vault.domain.usecase

import com.lite.vault.domain.repository.ItemRepository

class GetItemUseCase(
    private val repository: ItemRepository
) {
    suspend operator fun invoke(itemId: String) = repository.getItem(itemId)
}
