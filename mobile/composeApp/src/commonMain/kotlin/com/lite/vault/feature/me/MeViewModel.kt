package com.lite.vault.feature.me

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lite.vault.core.logging.AppLog
import com.lite.vault.core.network.ApiResult
import com.lite.vault.domain.usecase.GetUserProfileUseCase
import com.lite.vault.domain.usecase.LogoutUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class MeViewModel(
    private val getUserProfileUseCase: GetUserProfileUseCase,
    private val logoutUseCase: LogoutUseCase
) : ViewModel() {

    private val _state = MutableStateFlow(MeState())
    val state: StateFlow<MeState> = _state.asStateFlow()

    init {
        loadProfile()
    }

    fun onIntent(intent: MeIntent) {
        when (intent) {
            MeIntent.Refresh -> loadProfile()
            MeIntent.Logout -> logout()
        }
    }

    private fun loadProfile() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, errorMessage = null) }
            when (val result = getUserProfileUseCase()) {
                is ApiResult.Success -> {
                    AppLog.debug(
                        "MeViewModel",
                        "profile loaded id=${result.data.id} " +
                            "email=${result.data.email} displayName=${result.data.displayName} " +
                            "nickname=${result.data.nickname} plan=${result.data.plan} " +
                            "timezone=${result.data.preferences.timezone} language=${result.data.preferences.defaultLanguage} " +
                            "aiSuggestions=${result.data.preferences.aiSuggestionsEnabled} " +
                            "raw=${result.data}"
                    )
                    _state.update { it.copy(isLoading = false, profile = result.data) }
                }
                is ApiResult.Error -> {
                    AppLog.warn("MeViewModel", "Failed to load profile: ${result.message}")
                    _state.update { it.copy(isLoading = false, errorMessage = result.message) }
                }
            }
        }
    }

    private fun logout() {
        if (_state.value.isLoggingOut) return
        viewModelScope.launch {
            AppLog.info("MeViewModel", "logout requested")
            _state.update { it.copy(isLoggingOut = true, errorMessage = null) }
            when (val result = logoutUseCase()) {
                is ApiResult.Success -> {
                    AppLog.info("MeViewModel", "logout success")
                    _state.update { it.copy(isLoggingOut = false, logoutTick = it.logoutTick + 1) }
                }
                is ApiResult.Error -> {
                    AppLog.warn("MeViewModel", "logout failed: ${result.message}")
                    _state.update {
                        it.copy(
                            isLoggingOut = false,
                            errorMessage = result.message,
                            logoutTick = it.logoutTick + 1
                        )
                    }
                }
            }
        }
    }
}
