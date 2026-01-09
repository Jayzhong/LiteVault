package com.lite.vault.data.source.litevault

import com.lite.vault.domain.model.Attachment
import com.lite.vault.domain.model.Item
import com.lite.vault.domain.model.ItemStatus
import com.lite.vault.domain.model.PagedItems
import com.lite.vault.domain.model.Pagination
import com.lite.vault.domain.model.SuggestedTag
import com.lite.vault.domain.model.SuggestedTagStatus
import com.lite.vault.domain.model.SourceType
import com.lite.vault.domain.model.Tag
import com.lite.vault.domain.model.UserPreferences
import com.lite.vault.domain.model.UserProfile
import kotlinx.datetime.Instant
import kotlin.time.Clock

private fun parseInstant(value: String?): Instant {
    return try {
        if (value.isNullOrBlank()) {
            Clock.System.now()
        } else {
            Instant.parse(value)
        }
    } catch (_: Exception) {
        Clock.System.now()
    }
}

private fun ItemStatus.Companion.fromApi(value: String): ItemStatus {
    return runCatching { ItemStatus.valueOf(value) }.getOrElse { ItemStatus.ENRICHING }
}

private fun SourceType.Companion.fromApi(value: String?): SourceType? {
    if (value.isNullOrBlank()) return null
    return runCatching { SourceType.valueOf(value) }.getOrNull()
}

private fun SuggestedTagStatus.Companion.fromApi(value: String): SuggestedTagStatus {
    return runCatching { SuggestedTagStatus.valueOf(value) }.getOrElse { SuggestedTagStatus.PENDING }
}

fun ApiTag.toDomain(): Tag {
    return Tag(
        id = id,
        name = name,
        color = color ?: "#6B7280"
    )
}

fun ApiSuggestedTag.toDomain(): SuggestedTag {
    return SuggestedTag(
        id = id,
        name = name,
        status = SuggestedTagStatus.fromApi(status),
        confidence = confidence
    )
}

fun ApiAttachment.toDomain(): Attachment {
    return Attachment(
        id = id,
        uploadId = uploadId,
        displayName = displayName,
        mimeType = mimeType,
        sizeBytes = sizeBytes,
        kind = kind,
        createdAt = parseInstant(createdAt)
    )
}

fun ApiItem.toDomain(): Item {
    val createdInstant = parseInstant(createdAt)
    val updatedInstant = if (updatedAt.isNullOrBlank()) createdInstant else parseInstant(updatedAt)
    return Item(
        id = id,
        rawText = rawText,
        title = title,
        summary = summary,
        tags = tags.map { it.toDomain() },
        suggestedTags = suggestedTags.map { it.toDomain() },
        status = ItemStatus.fromApi(status),
        sourceType = SourceType.fromApi(sourceType),
        createdAt = createdInstant,
        updatedAt = updatedInstant,
        confirmedAt = if (confirmedAt.isNullOrBlank()) null else parseInstant(confirmedAt),
        attachmentCount = attachmentCount ?: 0,
        attachments = attachments.map { it.toDomain() }
    )
}

fun ApiLibraryResponse.toDomain(): PagedItems {
    return PagedItems(
        items = items.map { it.toDomain() },
        pagination = Pagination(
            cursor = pagination.cursor,
            hasMore = pagination.hasMore
        )
    )
}

fun ApiSearchResponse.toDomain(): PagedItems {
    return PagedItems(
        items = items.map { it.toDomain() },
        pagination = Pagination(
            cursor = pagination.cursor,
            hasMore = pagination.hasMore
        ),
        total = total,
        mode = mode
    )
}

private fun ApiSearchItem.toDomain(): Item {
    val createdInstant = parseInstant(createdAt)
    val updatedInstant = if (confirmedAt.isNullOrBlank()) createdInstant else parseInstant(confirmedAt)
    val resolvedRawText = summary ?: title.orEmpty()
    return Item(
        id = id,
        rawText = resolvedRawText,
        title = title,
        summary = summary,
        tags = tags.map { it.toDomain() },
        suggestedTags = emptyList(),
        status = ItemStatus.ARCHIVED,
        sourceType = SourceType.fromApi(sourceType),
        createdAt = createdInstant,
        updatedAt = updatedInstant,
        confirmedAt = if (confirmedAt.isNullOrBlank()) null else parseInstant(confirmedAt),
        attachmentCount = attachmentCount ?: 0,
        attachments = emptyList()
    )
}

fun ApiPendingItemsResponse.toDomain(): List<Item> = items.map { it.toDomain() }

fun ApiUserProfile.toDomain(): UserProfile {
    val preferences = preferences ?: ApiUserPreferences()
    return UserProfile(
        id = id,
        email = email,
        displayName = displayName,
        nickname = nickname,
        avatarUrl = avatarUrl,
        bio = bio,
        preferences = UserPreferences(
            defaultLanguage = preferences.defaultLanguage ?: "en",
            timezone = preferences.timezone ?: "UTC",
            aiSuggestionsEnabled = preferences.aiSuggestionsEnabled ?: true
        ),
        plan = plan ?: "free",
        createdAt = parseInstant(createdAt),
        updatedAt = parseInstant(updatedAt)
    )
}
