package com.lite.vault.domain.usecase

import com.lite.vault.domain.repository.LibraryRepository

class SearchLibraryUseCase(
    private val repository: LibraryRepository
) {
    suspend operator fun invoke(query: String, cursor: String? = null, limit: Int = 20) =
        repository.searchLibrary(query = query, cursor = cursor, limit = limit)
}
