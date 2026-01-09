package com.lite.vault.domain.usecase

import com.lite.vault.domain.repository.UserRepository

class UpdateUserPreferencesUseCase(
    private val repository: UserRepository
) {
    suspend operator fun invoke(
        defaultLanguage: String? = null,
        timezone: String? = null,
        aiSuggestionsEnabled: Boolean? = null
    ) = repository.updatePreferences(
        defaultLanguage = defaultLanguage,
        timezone = timezone,
        aiSuggestionsEnabled = aiSuggestionsEnabled
    )
}
