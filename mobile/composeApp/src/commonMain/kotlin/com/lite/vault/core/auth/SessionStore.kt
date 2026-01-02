package com.lite.vault.core.auth

/**
 * Session Store Interface
 * 
 * Platform-specific implementations:
 * - Android: DataStore for flags (TODO: Keystore for sensitive tokens)
 * - iOS: Keychain for all session data
 */
expect class SessionStore {
    suspend fun saveSession(token: String)
    suspend fun getSession(): String?
    suspend fun clearSession()
    suspend fun isSignedIn(): Boolean
    suspend fun saveDeviceToken(token: String)
    suspend fun getDeviceToken(): String?
    suspend fun clearDeviceToken()
    suspend fun getOrCreateDeviceId(): String
}
