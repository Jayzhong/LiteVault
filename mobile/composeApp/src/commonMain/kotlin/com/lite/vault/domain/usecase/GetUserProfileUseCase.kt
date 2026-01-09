package com.lite.vault.domain.usecase

import com.lite.vault.domain.repository.UserRepository

class GetUserProfileUseCase(
    private val repository: UserRepository
) {
    suspend operator fun invoke() = repository.getProfile()
}
