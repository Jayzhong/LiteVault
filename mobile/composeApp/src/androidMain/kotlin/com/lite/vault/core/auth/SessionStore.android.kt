package com.lite.vault.core.auth

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.util.UUID

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "session_prefs")

/**
 * Android SessionStore using DataStore
 * 
 * V1: Uses DataStore for both flag and token (simple)
 * V2 TODO: Move token to Android Keystore for encryption
 */
actual class SessionStore(private val context: Context) {
    private val SESSION_TOKEN_KEY = stringPreferencesKey("session_token")
    private val IS_SIGNED_IN_KEY = booleanPreferencesKey("is_signed_in")
    private val DEVICE_TOKEN_KEY = stringPreferencesKey("clerk_device_token")
    private val DEVICE_ID_KEY = stringPreferencesKey("clerk_device_id")
    
    actual suspend fun saveSession(token: String) {
        context.dataStore.edit { prefs ->
            prefs[SESSION_TOKEN_KEY] = token
            prefs[IS_SIGNED_IN_KEY] = true
        }
    }
    
    actual suspend fun getSession(): String? {
        return context.dataStore.data.map { prefs ->
            prefs[SESSION_TOKEN_KEY]
        }.first()
    }
    
    actual suspend fun clearSession() {
        context.dataStore.edit { prefs ->
            prefs.remove(SESSION_TOKEN_KEY)
            prefs[IS_SIGNED_IN_KEY] = false
        }
    }
    
    actual suspend fun isSignedIn(): Boolean {
        return context.dataStore.data.map { prefs ->
            prefs[IS_SIGNED_IN_KEY] ?: false
        }.first()
    }

    actual suspend fun saveDeviceToken(token: String) {
        context.dataStore.edit { prefs ->
            prefs[DEVICE_TOKEN_KEY] = token
        }
    }

    actual suspend fun getDeviceToken(): String? {
        return context.dataStore.data.map { prefs ->
            prefs[DEVICE_TOKEN_KEY]
        }.first()
    }

    actual suspend fun clearDeviceToken() {
        context.dataStore.edit { prefs ->
            prefs.remove(DEVICE_TOKEN_KEY)
        }
    }

    actual suspend fun getOrCreateDeviceId(): String {
        val existing = context.dataStore.data.map { prefs ->
            prefs[DEVICE_ID_KEY]
        }.first()
        if (!existing.isNullOrBlank()) {
            return existing
        }
        val generated = UUID.randomUUID().toString()
        context.dataStore.edit { prefs ->
            prefs[DEVICE_ID_KEY] = generated
        }
        return generated
    }
}
