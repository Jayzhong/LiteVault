package com.lite.vault.feature.me

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lite.vault.core.logging.AppLog
import com.lite.vault.core.network.ApiResult
import com.lite.vault.domain.model.UserProfile
import com.lite.vault.domain.usecase.GetUserProfileUseCase
import com.lite.vault.domain.usecase.UpdateUserProfileUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class EditProfileViewModel(
    private val getUserProfileUseCase: GetUserProfileUseCase,
    private val updateUserProfileUseCase: UpdateUserProfileUseCase
) : ViewModel() {

    private val _state = MutableStateFlow(EditProfileState())
    val state: StateFlow<EditProfileState> = _state.asStateFlow()

    init {
        loadProfile()
    }

    fun onIntent(intent: EditProfileIntent) {
        when (intent) {
            EditProfileIntent.Refresh -> loadProfile()
            EditProfileIntent.Save -> saveProfile()
            EditProfileIntent.ConsumeSaved -> _state.update { it.copy(isSaved = false) }
            is EditProfileIntent.NicknameChanged -> _state.update { it.copy(nicknameInput = intent.value) }
            is EditProfileIntent.BioChanged -> _state.update { it.copy(bioInput = intent.value) }
        }
    }

    private fun loadProfile() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, errorMessage = null) }
            when (val result = getUserProfileUseCase()) {
                is ApiResult.Success -> {
                    applyProfile(result.data)
                }
                is ApiResult.Error -> {
                    AppLog.warn("EditProfileViewModel", "load failed: ${result.message}")
                    _state.update { it.copy(isLoading = false, errorMessage = result.message) }
                }
            }
        }
    }

    private fun applyProfile(profile: UserProfile) {
        _state.update {
            it.copy(
                isLoading = false,
                errorMessage = null,
                profile = profile,
                nicknameInput = profile.nickname.orEmpty(),
                bioInput = profile.bio.orEmpty(),
                avatarUrlInput = profile.avatarUrl.orEmpty()
            )
        }
    }

    private fun saveProfile() {
        val current = _state.value
        if (current.isSaving) return
        viewModelScope.launch {
            val profile = current.profile
            _state.update { it.copy(isSaving = true, errorMessage = null) }
            val nickname = current.nicknameInput.trim()
            val bio = current.bioInput.trimEnd()
            val nicknameUpdate = if (nickname.isBlank()) null else nickname
            val bioUpdate = if (profile?.bio != bio) bio else null
            val avatarUpdate = null

            AppLog.info("EditProfileViewModel", "save profile")
            when (val result = updateUserProfileUseCase(
                nickname = nicknameUpdate,
                avatarUrl = avatarUpdate,
                bio = bioUpdate
            )) {
                is ApiResult.Success -> {
                    _state.update {
                        it.copy(
                            isSaving = false,
                            isSaved = true,
                            profile = result.data,
                            nicknameInput = result.data.nickname.orEmpty(),
                            bioInput = result.data.bio.orEmpty(),
                            avatarUrlInput = result.data.avatarUrl.orEmpty()
                        )
                    }
                }
                is ApiResult.Error -> {
                    AppLog.warn("EditProfileViewModel", "save failed: ${result.message}")
                    _state.update { it.copy(isSaving = false, errorMessage = result.message) }
                }
            }
        }
    }
}
