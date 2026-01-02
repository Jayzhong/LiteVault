package com.lite.vault.feature.auth

/**
 * Login MVI Contract
 */
data class LoginState(
    val email: String = "",
    val verificationCode: String = "",
    val isCodeSent: Boolean = false,
    val isLoading: Boolean = false,
    val resendCountdown: Int = 0,  // seconds remaining
    val isResendEnabled: Boolean = true
)

sealed class LoginIntent {
    data class EmailChanged(val email: String) : LoginIntent()
    data class CodeChanged(val code: String) : LoginIntent()
    data object SendCodeClicked : LoginIntent()
    data object VerifyCodeClicked : LoginIntent()
    data object ResendCodeClicked : LoginIntent()
    data object DismissError : LoginIntent()
}

sealed class LoginEffect {
    data object NavigateToHome : LoginEffect()
    data class ShowError(val title: String, val message: String) : LoginEffect()
}
