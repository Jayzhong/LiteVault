package com.lite.vault.domain.repository

import com.lite.vault.core.network.ApiResult
import com.lite.vault.domain.model.UserProfile

interface UserRepository {
    suspend fun getProfile(): ApiResult<UserProfile>
    suspend fun updateProfile(
        nickname: String? = null,
        avatarUrl: String? = null,
        bio: String? = null
    ): ApiResult<UserProfile>
    suspend fun updatePreferences(
        defaultLanguage: String? = null,
        timezone: String? = null,
        aiSuggestionsEnabled: Boolean? = null
    ): ApiResult<UserProfile>
}
