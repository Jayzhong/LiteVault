package com.lite.vault.domain.usecase

import com.lite.vault.core.network.ApiResult
import com.lite.vault.domain.repository.AuthRepository

/**
 * UseCase: Logout current session
 */
class LogoutUseCase(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(): ApiResult<Unit> {
        return authRepository.logout()
    }
}
