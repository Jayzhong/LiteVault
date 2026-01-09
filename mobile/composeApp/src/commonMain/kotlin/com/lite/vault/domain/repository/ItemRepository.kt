package com.lite.vault.domain.repository

import com.lite.vault.core.network.ApiResult
import com.lite.vault.domain.model.Item

interface ItemRepository {
    suspend fun createItem(rawText: String, enrich: Boolean, tagIds: List<String> = emptyList()): ApiResult<Item>
    suspend fun getPendingItems(): ApiResult<List<Item>>
    suspend fun getItem(itemId: String): ApiResult<Item>
    suspend fun confirmItem(
        itemId: String,
        acceptedSuggestionIds: List<String> = emptyList(),
        rejectedSuggestionIds: List<String> = emptyList(),
        addedTagIds: List<String> = emptyList(),
        title: String? = null,
        summary: String? = null,
        tags: List<String>? = null,
        originalText: String? = null
    ): ApiResult<Unit>
    suspend fun updateItem(
        itemId: String,
        title: String? = null,
        summary: String? = null,
        originalText: String? = null,
        tags: List<String>? = null
    ): ApiResult<Unit>
    suspend fun discardItem(itemId: String): ApiResult<Unit>
}
