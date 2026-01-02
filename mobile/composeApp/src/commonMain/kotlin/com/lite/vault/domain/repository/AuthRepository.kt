package com.lite.vault.domain.repository

import com.lite.vault.core.network.ApiResult
import com.lite.vault.domain.model.Session

/**
 * Auth Repository Interface (Domain Layer)
 */
interface AuthRepository {
    suspend fun sendVerificationCode(email: String): ApiResult<Unit>
    suspend fun verifyCode(email: String, code: String): ApiResult<Session>
    suspend fun getSession(): ApiResult<Session?>
    suspend fun logout(): ApiResult<Unit>
}
