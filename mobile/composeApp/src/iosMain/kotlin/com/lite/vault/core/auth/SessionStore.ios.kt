package com.lite.vault.core.auth

import platform.Foundation.NSUserDefaults
import platform.Foundation.NSUUID

/**
 * iOS SessionStore using NSUserDefaults
 * 
 * V1: Simple NSUserDefaults storage
 * V2 TODO: Use Keychain for sensitive token storage
 */
actual class SessionStore {
    private val userDefaults = NSUserDefaults.standardUserDefaults
    
    private val SESSION_TOKEN_KEY = "session_token"
    private val SESSION_ID_KEY = "session_id"
    private val SESSION_EMAIL_KEY = "session_email"
    private val IS_SIGNED_IN_KEY = "is_signed_in"
    private val DEVICE_TOKEN_KEY = "clerk_device_token"
    private val DEVICE_ID_KEY = "clerk_device_id"
    
    actual suspend fun saveSession(token: String, sessionId: String, email: String?) {
        userDefaults.setObject(token, forKey = SESSION_TOKEN_KEY)
        userDefaults.setObject(sessionId, forKey = SESSION_ID_KEY)
        email?.let { userDefaults.setObject(it, forKey = SESSION_EMAIL_KEY) }
        userDefaults.setBool(true, forKey = IS_SIGNED_IN_KEY)
    }
    
    actual suspend fun getSession(): String? {
        return userDefaults.stringForKey(SESSION_TOKEN_KEY)
    }

    actual suspend fun getSessionId(): String? {
        return userDefaults.stringForKey(SESSION_ID_KEY)
    }

    actual suspend fun getEmail(): String? {
        return userDefaults.stringForKey(SESSION_EMAIL_KEY)
    }
    
    actual suspend fun clearSession() {
        userDefaults.removeObjectForKey(SESSION_TOKEN_KEY)
        userDefaults.removeObjectForKey(SESSION_ID_KEY)
        userDefaults.removeObjectForKey(SESSION_EMAIL_KEY)
        userDefaults.setBool(false, forKey = IS_SIGNED_IN_KEY)
    }
    
    actual suspend fun isSignedIn(): Boolean {
        return userDefaults.boolForKey(IS_SIGNED_IN_KEY)
    }

    actual suspend fun saveDeviceToken(token: String) {
        userDefaults.setObject(token, forKey = DEVICE_TOKEN_KEY)
    }

    actual suspend fun getDeviceToken(): String? {
        return userDefaults.stringForKey(DEVICE_TOKEN_KEY)
    }

    actual suspend fun clearDeviceToken() {
        userDefaults.removeObjectForKey(DEVICE_TOKEN_KEY)
    }

    actual suspend fun getOrCreateDeviceId(): String {
        val existing = userDefaults.stringForKey(DEVICE_ID_KEY)
        if (!existing.isNullOrBlank()) {
            return existing
        }
        val generated = NSUUID().UUIDString
        userDefaults.setObject(generated, forKey = DEVICE_ID_KEY)
        return generated
    }
}
