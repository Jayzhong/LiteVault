package com.lite.vault.feature.me

import com.lite.vault.domain.model.UserProfile

data class EditProfileState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val errorMessage: String? = null,
    val profile: UserProfile? = null,
    val nicknameInput: String = "",
    val bioInput: String = "",
    val avatarUrlInput: String = "",
    val isSaved: Boolean = false
)

sealed class EditProfileIntent {
    data object Refresh : EditProfileIntent()
    data object Save : EditProfileIntent()
    data object ConsumeSaved : EditProfileIntent()
    data class NicknameChanged(val value: String) : EditProfileIntent()
    data class BioChanged(val value: String) : EditProfileIntent()
}
