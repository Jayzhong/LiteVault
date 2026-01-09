package com.lite.vault.data.source.litevault

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ApiUserProfile(
    val id: String,
    val clerkUserId: String? = null,
    val email: String,
    val displayName: String? = null,
    val nickname: String? = null,
    val avatarUrl: String? = null,
    val bio: String? = null,
    val preferences: ApiUserPreferences? = null,
    val plan: String? = null,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class ApiUserPreferences(
    val defaultLanguage: String? = null,
    val timezone: String? = null,
    val aiSuggestionsEnabled: Boolean? = null
)

@Serializable
data class ApiUpdatePreferencesRequest(
    val defaultLanguage: String? = null,
    val timezone: String? = null,
    val aiSuggestionsEnabled: Boolean? = null
)

@Serializable
data class ApiUpdateProfileRequest(
    val nickname: String? = null,
    val avatarUrl: String? = null,
    val bio: String? = null
)

@Serializable
data class ApiCreateItemRequest(
    val rawText: String,
    val enrich: Boolean = true,
    val tagIds: List<String> = emptyList()
)

@Serializable
data class ApiUpdateItemRequest(
    val action: String? = null,
    val title: String? = null,
    val summary: String? = null,
    val tags: List<String>? = null,
    val acceptedSuggestionIds: List<String> = emptyList(),
    val rejectedSuggestionIds: List<String> = emptyList(),
    val addedTagIds: List<String> = emptyList(),
    @SerialName("originalText")
    val originalText: String? = null
)

@Serializable
data class ApiUpdateItemResponse(
    val id: String,
    val status: String,
    val title: String? = null,
    val summary: String? = null,
    val tags: List<ApiTag> = emptyList(),
    val updatedAt: String,
    val confirmedAt: String? = null
)

@Serializable
data class ApiTag(
    val id: String,
    val name: String,
    val color: String? = null
)

@Serializable
data class ApiSuggestedTag(
    val id: String,
    val name: String,
    val status: String,
    val confidence: Double? = null
)

@Serializable
data class ApiAttachment(
    val id: String,
    val uploadId: String,
    val displayName: String,
    val mimeType: String? = null,
    val sizeBytes: Long? = null,
    val kind: String,
    val createdAt: String
)

@Serializable
data class ApiItem(
    val id: String,
    val rawText: String,
    val title: String? = null,
    val summary: String? = null,
    val tags: List<ApiTag> = emptyList(),
    val suggestedTags: List<ApiSuggestedTag> = emptyList(),
    val status: String,
    val sourceType: String? = null,
    val enrichmentMode: String? = null,
    val createdAt: String,
    val updatedAt: String? = null,
    val confirmedAt: String? = null,
    val attachmentCount: Int? = null,
    val attachments: List<ApiAttachment> = emptyList()
)

@Serializable
data class ApiPendingItemsResponse(
    val items: List<ApiItem>,
    val total: Int
)

@Serializable
data class ApiPagination(
    val cursor: String? = null,
    val hasMore: Boolean = false
)

@Serializable
data class ApiLibraryResponse(
    val items: List<ApiItem>,
    val pagination: ApiPagination
)

@Serializable
data class ApiSearchResponse(
    val items: List<ApiSearchItem>,
    val mode: String,
    val pagination: ApiPagination,
    val total: Int? = null
)

@Serializable
data class ApiSearchItem(
    val id: String,
    val title: String? = null,
    val summary: String? = null,
    val tags: List<ApiTag> = emptyList(),
    val sourceType: String? = null,
    val createdAt: String,
    val confirmedAt: String? = null,
    val attachmentCount: Int? = null
)
