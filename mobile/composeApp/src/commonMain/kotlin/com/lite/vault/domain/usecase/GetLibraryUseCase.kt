package com.lite.vault.domain.usecase

import com.lite.vault.domain.repository.LibraryRepository

class GetLibraryUseCase(
    private val repository: LibraryRepository
) {
    suspend operator fun invoke(cursor: String? = null, limit: Int = 20) =
        repository.getLibrary(cursor = cursor, limit = limit)
}
