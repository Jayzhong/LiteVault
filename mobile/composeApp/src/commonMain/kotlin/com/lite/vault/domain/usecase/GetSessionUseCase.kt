package com.lite.vault.domain.usecase

import com.lite.vault.core.network.ApiResult
import com.lite.vault.domain.model.Session
import com.lite.vault.domain.repository.AuthRepository

/**
 * UseCase: Get current session (if any)
 */
class GetSessionUseCase(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(): ApiResult<Session?> {
        return authRepository.getSession()
    }
}
