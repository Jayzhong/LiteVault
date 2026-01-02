package com.lite.vault.domain.usecase

import com.lite.vault.core.network.ApiResult
import com.lite.vault.domain.repository.AuthRepository

/**
 * UseCase: Send verification code to email
 */
class SendVerificationCodeUseCase(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(email: String): ApiResult<Unit> {
        return authRepository.sendVerificationCode(email)
    }
}