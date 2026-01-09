package com.lite.vault.data.repository

import com.lite.vault.core.logging.AppLog
import com.lite.vault.core.network.ApiResult
import com.lite.vault.core.network.apiCall
import com.lite.vault.data.source.litevault.ApiUpdatePreferencesRequest
import com.lite.vault.data.source.litevault.ApiUpdateProfileRequest
import com.lite.vault.data.source.litevault.LiteVaultApi
import com.lite.vault.data.source.litevault.toDomain
import com.lite.vault.domain.model.UserProfile
import com.lite.vault.domain.repository.UserRepository

class UserRepositoryImpl(
    private val api: LiteVaultApi
) : UserRepository {
    override suspend fun getProfile(): ApiResult<UserProfile> {
        AppLog.debug("UserRepository", "getProfile")
        return apiCall {
            api.getMe().toDomain()
        }
    }

    override suspend fun updatePreferences(
        defaultLanguage: String?,
        timezone: String?,
        aiSuggestionsEnabled: Boolean?
    ): ApiResult<UserProfile> {
        AppLog.info("UserRepository", "updatePreferences ai=$aiSuggestionsEnabled")
        return apiCall {
            api.updatePreferences(
                ApiUpdatePreferencesRequest(
                    defaultLanguage = defaultLanguage,
                    timezone = timezone,
                    aiSuggestionsEnabled = aiSuggestionsEnabled
                )
            ).toDomain()
        }
    }

    override suspend fun updateProfile(
        nickname: String?,
        avatarUrl: String?,
        bio: String?
    ): ApiResult<UserProfile> {
        AppLog.info("UserRepository", "updateProfile nickname=${nickname?.isNotBlank() == true}")
        return apiCall {
            api.updateProfile(
                ApiUpdateProfileRequest(
                    nickname = nickname,
                    avatarUrl = avatarUrl,
                    bio = bio
                )
            ).toDomain()
        }
    }
}
