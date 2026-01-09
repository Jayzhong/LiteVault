package com.lite.vault.domain.repository

import com.lite.vault.core.network.ApiResult
import com.lite.vault.domain.model.PagedItems

interface LibraryRepository {
    suspend fun getLibrary(cursor: String? = null, limit: Int = 20): ApiResult<PagedItems>
    suspend fun searchLibrary(query: String, cursor: String? = null, limit: Int = 20): ApiResult<PagedItems>
}
