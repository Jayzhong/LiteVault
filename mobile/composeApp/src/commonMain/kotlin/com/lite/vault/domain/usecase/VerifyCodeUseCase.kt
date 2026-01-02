package com.lite.vault.domain.usecase

import com.lite.vault.core.network.ApiResult
import com.lite.vault.domain.model.Session
import com.lite.vault.domain.repository.AuthRepository

/**
 * UseCase: Verify code and return session
 */
class VerifyCodeUseCase(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(email: String, code: String): ApiResult<Session> {
        return authRepository.verifyCode(email, code)
    }
}
