package com.lite.vault.data.repository

import com.lite.vault.core.logging.AppLog
import com.lite.vault.core.network.ApiResult
import com.lite.vault.core.network.apiCall
import com.lite.vault.data.source.litevault.LiteVaultApi
import com.lite.vault.data.source.litevault.toDomain
import com.lite.vault.domain.model.PagedItems
import com.lite.vault.domain.repository.LibraryRepository

class LibraryRepositoryImpl(
    private val api: LiteVaultApi
) : LibraryRepository {
    override suspend fun getLibrary(cursor: String?, limit: Int): ApiResult<PagedItems> {
        AppLog.debug("LibraryRepository", "getLibrary cursor=$cursor")
        return apiCall {
            api.getLibrary(cursor = cursor, limit = limit).toDomain()
        }
    }

    override suspend fun searchLibrary(query: String, cursor: String?, limit: Int): ApiResult<PagedItems> {
        AppLog.debug("LibraryRepository", "searchLibrary query=$query")
        return apiCall {
            api.search(query = query, cursor = cursor, limit = limit).toDomain()
        }
    }
}
