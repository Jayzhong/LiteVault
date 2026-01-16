package com.lite.vault.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lite.vault.core.logging.AppLog
import com.lite.vault.core.network.ApiResult
import com.lite.vault.domain.usecase.SendVerificationCodeUseCase
import com.lite.vault.domain.usecase.VerifyCodeUseCase
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

/**
 * LoginViewModel
 * 
 * Handles login flow with MVI pattern:
 * - State: LoginState
 * - Intents: LoginIntent (user actions)
 * - Effects: LoginEffect (one-off side effects like navigation)
 */
class LoginViewModel(
    private val sendVerificationCodeUseCase: SendVerificationCodeUseCase,
    private val verifyCodeUseCase: VerifyCodeUseCase
) : ViewModel() {
    
    private val _state = MutableStateFlow(LoginState())
    val state: StateFlow<LoginState> = _state.asStateFlow()
    
    private val _effect = MutableSharedFlow<LoginEffect>()
    val effect: SharedFlow<LoginEffect> = _effect.asSharedFlow()
    
    private var countdownJob: Job? = null
    
    fun onIntent(intent: LoginIntent) {
        when (intent) {
            is LoginIntent.EmailChanged -> handleEmailChanged(intent.email)
            is LoginIntent.CodeChanged -> handleCodeChanged(intent.code)
            is LoginIntent.SendCodeClicked -> handleSendCode()
            is LoginIntent.VerifyCodeClicked -> handleVerifyCode()
            is LoginIntent.ResendCodeClicked -> handleResendCode()
            is LoginIntent.DismissError -> {} // No-op for V1
        }
    }
    
    private fun handleEmailChanged(email: String) {
        _state.update { it.copy(email = email) }
    }
    
    private fun handleCodeChanged(code: String) {
        _state.update { it.copy(verificationCode = code) }
    }
    
    private fun handleSendCode() {
        val email = _state.value.email.trim()
        if (email.isBlank()) return
        
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            
            when (val result = sendVerificationCodeUseCase(email)) {
                is ApiResult.Success -> {
                    _state.update {
                        it.copy(
                            isLoading = false,
                            isCodeSent = true,
                            resendCountdown = 59,
                            isResendEnabled = false
                        )
                    }
                    startCountdown()
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(isLoading = false) }
                    _effect.emit(
                        // TODO: handle different error types
                        LoginEffect.ShowError(
                            title = "Network Error",
                            message = "Network Error"
                        )
                    )
                    AppLog.error("LoginViewModel", "Network Error: ${result.message}")
                }
            }
        }
    }
    
    private fun handleVerifyCode() {
        val email = _state.value.email.trim()
        val code = _state.value.verificationCode
        
        if (email.isBlank() || code.length != 6) return
        
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            
            when (val result = verifyCodeUseCase(email, code)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(isLoading = false) }
                    if (result.data.isNewUser) {
                        _effect.emit(LoginEffect.NavigateToEditProfile)
                    } else {
                        _effect.emit(LoginEffect.NavigateToHome)
                    }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(isLoading = false) }
                    _effect.emit(
                        LoginEffect.ShowError(
                            title = "Login Failed",
                            message = "Verification failed. Please check the code and try again."
                        )
                    )
                }
            }
        }
    }
    
    private fun handleResendCode() {
        // Re-use send code logic
        handleSendCode()
    }
    
    private fun startCountdown() {
        countdownJob?.cancel()
        countdownJob = viewModelScope.launch {
            while (_state.value.resendCountdown > 0) {
                delay(1000)
                _state.update {
                    val newCountdown = it.resendCountdown - 1
                    it.copy(
                        resendCountdown = newCountdown,
                        isResendEnabled = newCountdown == 0
                    )
                }
            }
        }
    }
    
    override fun onCleared() {
        super.onCleared()
        countdownJob?.cancel()
    }
}
