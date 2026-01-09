package com.lite.vault.data.repository

import com.lite.vault.core.auth.SessionStore
import com.lite.vault.core.network.ApiResult
import com.lite.vault.data.source.AuthDataSource
import com.lite.vault.domain.model.Session
import com.lite.vault.domain.repository.AuthRepository

/**
 * AuthRepository Implementation
 * 
 * Responsibilities:
 * - Delegate to AuthDataSource for API calls
 * - Persist session to SessionStore on successful login
 * - Retrieve session from SessionStore
 */
class AuthRepositoryImpl(
    private val authDataSource: AuthDataSource,
    private val sessionStore: SessionStore
) : AuthRepository {
    
    override suspend fun sendVerificationCode(email: String): ApiResult<Unit> {
        return authDataSource.sendVerificationCode(email)
    }
    
    override suspend fun verifyCode(email: String, code: String): ApiResult<Session> {
        val result = authDataSource.verifyCode(email, code)
        
        // Persist session on success
        if (result is ApiResult.Success) {
            sessionStore.saveSession(result.data.token)
        }
        
        return result
    }
    
    override suspend fun getSession(): ApiResult<Session?> {
        return try {
            val token = sessionStore.getSession()
            if (token != null && sessionStore.isSignedIn()) {
                // V1: Return a placeholder session (no user endpoint yet)
                ApiResult.Success(
                    Session(
                        token = token,
                        userId = "current-user",
                        email = "user@litevault.app",
                        isNewUser = false
                    )
                )
            } else {
                ApiResult.Success(null)
            }
        } catch (e: Exception) {
            ApiResult.Error(message = e.message ?: "Failed to get session")
        }
    }
    
    override suspend fun logout(): ApiResult<Unit> {
        return try {
            val remoteResult = authDataSource.logout()
            sessionStore.clearSession()
            sessionStore.clearDeviceToken()
            when (remoteResult) {
                is ApiResult.Success -> ApiResult.Success(Unit)
                is ApiResult.Error -> remoteResult
            }
        } catch (e: Exception) {
            ApiResult.Error(message = e.message ?: "Failed to logout")
        }
    }
}
