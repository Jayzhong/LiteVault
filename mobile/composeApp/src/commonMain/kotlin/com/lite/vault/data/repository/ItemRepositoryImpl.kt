package com.lite.vault.data.repository

import com.lite.vault.core.logging.AppLog
import com.lite.vault.core.network.ApiException
import com.lite.vault.core.network.ApiResult
import com.lite.vault.core.network.apiCall
import com.lite.vault.core.network.generateIdempotencyKey
import com.lite.vault.data.source.litevault.ApiCreateItemRequest
import com.lite.vault.data.source.litevault.ApiUpdateItemRequest
import com.lite.vault.data.source.litevault.LiteVaultApi
import com.lite.vault.data.source.litevault.toDomain
import com.lite.vault.domain.model.Item
import com.lite.vault.domain.repository.ItemRepository

class ItemRepositoryImpl(
    private val api: LiteVaultApi
) : ItemRepository {
    override suspend fun createItem(rawText: String, enrich: Boolean, tagIds: List<String>): ApiResult<Item> {
        AppLog.info("ItemRepository", "createItem enrich=$enrich")
        val idempotencyKey = generateIdempotencyKey()
        return apiCall {
            val response = api.createItem(
                request = ApiCreateItemRequest(rawText = rawText, enrich = enrich, tagIds = tagIds),
                idempotencyKey = idempotencyKey
            )
            response.toDomain()
        }
    }

    override suspend fun getPendingItems(): ApiResult<List<Item>> {
        AppLog.debug("ItemRepository", "getPendingItems")
        return apiCall {
            api.getPendingItems().toDomain()
        }
    }

    override suspend fun getItem(itemId: String): ApiResult<Item> {
        AppLog.debug("ItemRepository", "getItem id=$itemId")
        return try {
            ApiResult.Success(api.getItem(itemId).toDomain())
        } catch (e: ApiException) {
            AppLog.warn("ItemRepository", "getItem failed status=${e.statusCode}, trying fallback")
            val fallback = if (e.statusCode >= 500) {
                loadItemFromFallbacks(itemId)
            } else {
                null
            }
            if (fallback != null) {
                ApiResult.Success(fallback)
            } else {
                ApiResult.Error(
                    code = e.statusCode,
                    message = e.responseBody.ifBlank { e.message ?: "API error" }
                )
            }
        } catch (e: Exception) {
            AppLog.error("ItemRepository", "getItem failed: ${e.message}")
            ApiResult.Error(message = e.message ?: "Unknown error")
        }
    }

    override suspend fun confirmItem(
        itemId: String,
        acceptedSuggestionIds: List<String>,
        rejectedSuggestionIds: List<String>,
        addedTagIds: List<String>,
        title: String?,
        summary: String?,
        tags: List<String>?,
        originalText: String?
    ): ApiResult<Unit> {
        AppLog.info(
            "ItemRepository",
            "confirmItem id=$itemId originalText=${originalText?.length ?: 0} tags=${tags?.size ?: 0}"
        )
        return apiCall {
            api.updateItem(
                itemId = itemId,
                request = ApiUpdateItemRequest(
                    action = "confirm",
                    title = title,
                    summary = summary,
                    tags = tags,
                    originalText = originalText,
                    acceptedSuggestionIds = acceptedSuggestionIds,
                    rejectedSuggestionIds = rejectedSuggestionIds,
                    addedTagIds = addedTagIds
                )
            )
            Unit
        }
    }

    override suspend fun updateItem(
        itemId: String,
        title: String?,
        summary: String?,
        originalText: String?,
        tags: List<String>?
    ): ApiResult<Unit> {
        AppLog.info(
            "ItemRepository",
            "updateItem id=$itemId originalText=${originalText} tags=${tags?.size ?: 0}"
        )
        return apiCall {
            api.updateItem(
                itemId = itemId,
                request = ApiUpdateItemRequest(
                    title = title,
                    summary = summary,
                    tags = tags,
                    originalText = originalText
                )
            )
            Unit
        }
    }

    override suspend fun discardItem(itemId: String): ApiResult<Unit> {
        AppLog.info("ItemRepository", "discardItem id=$itemId")
        return apiCall {
            api.updateItem(
                itemId = itemId,
                request = ApiUpdateItemRequest(action = "discard")
            )
            Unit
        }
    }

    private suspend fun loadItemFromFallbacks(itemId: String): Item? {
        val pendingMatch = runCatching {
            api.getPendingItems().toDomain().firstOrNull { it.id == itemId }
        }.getOrNull()
        if (pendingMatch != null) {
            AppLog.info("ItemRepository", "getItem fallback hit pending id=$itemId")
            return pendingMatch
        }
        val libraryMatch = runCatching {
            api.getLibrary(cursor = null, limit = 50).toDomain().items.firstOrNull { it.id == itemId }
        }.getOrNull()
        if (libraryMatch != null) {
            AppLog.info("ItemRepository", "getItem fallback hit library id=$itemId")
        }
        return libraryMatch
    }
}
