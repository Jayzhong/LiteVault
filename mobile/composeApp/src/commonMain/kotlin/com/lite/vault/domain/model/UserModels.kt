package com.lite.vault.domain.model

import kotlinx.datetime.Instant

data class UserPreferences(
    val defaultLanguage: String,
    val timezone: String,
    val aiSuggestionsEnabled: Boolean
)

data class UserProfile(
    val id: String,
    val email: String,
    val displayName: String?,
    val nickname: String?,
    val avatarUrl: String?,
    val bio: String?,
    val preferences: UserPreferences,
    val plan: String,
    val createdAt: Instant,
    val updatedAt: Instant
)
