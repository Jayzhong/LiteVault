package com.lite.vault.data.source

import com.lite.vault.core.network.ApiResult
import com.lite.vault.domain.model.Session

/**
 * AuthDataSource Interface
 *
 * Implementation:
 * - Shared Clerk Frontend API via Ktor (commonMain)
 */
interface AuthDataSource {
    suspend fun sendVerificationCode(email: String): ApiResult<Unit>
    suspend fun verifyCode(email: String, code: String): ApiResult<Session>
    suspend fun refreshSessionToken(sessionId: String): ApiResult<String>
    suspend fun logout(): ApiResult<Unit>
}
