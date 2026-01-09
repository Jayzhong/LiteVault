package com.lite.vault.domain.usecase

import com.lite.vault.domain.repository.UserRepository

class UpdateUserProfileUseCase(
    private val repository: UserRepository
) {
    suspend operator fun invoke(
        nickname: String? = null,
        avatarUrl: String? = null,
        bio: String? = null
    ) = repository.updateProfile(
        nickname = nickname,
        avatarUrl = avatarUrl,
        bio = bio
    )
}
