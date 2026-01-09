package com.lite.vault.domain.usecase

import com.lite.vault.domain.repository.ItemRepository

class GetPendingItemsUseCase(
    private val repository: ItemRepository
) {
    suspend operator fun invoke() = repository.getPendingItems()
}
