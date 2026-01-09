package com.lite.vault.domain.model

import kotlinx.datetime.Instant

enum class ItemStatus {
    ENRICHING,
    READY_TO_CONFIRM,
    ARCHIVED,
    DISCARDED,
    FAILED;

    companion object
}

enum class SourceType {
    NOTE,
    ARTICLE;

    companion object
}

data class Tag(
    val id: String,
    val name: String,
    val color: String
)

enum class SuggestedTagStatus {
    PENDING,
    ACCEPTED,
    REJECTED;

    companion object
}

data class SuggestedTag(
    val id: String,
    val name: String,
    val status: SuggestedTagStatus,
    val confidence: Double? = null
)

data class Attachment(
    val id: String,
    val uploadId: String,
    val displayName: String,
    val mimeType: String?,
    val sizeBytes: Long?,
    val kind: String,
    val createdAt: Instant
)

data class Item(
    val id: String,
    val rawText: String,
    val title: String?,
    val summary: String?,
    val tags: List<Tag>,
    val suggestedTags: List<SuggestedTag> = emptyList(),
    val status: ItemStatus,
    val sourceType: SourceType?,
    val createdAt: Instant,
    val updatedAt: Instant,
    val confirmedAt: Instant?,
    val attachmentCount: Int,
    val attachments: List<Attachment>
)

data class Pagination(
    val cursor: String?,
    val hasMore: Boolean
)

data class PagedItems(
    val items: List<Item>,
    val pagination: Pagination,
    val total: Int? = null,
    val mode: String? = null
)
