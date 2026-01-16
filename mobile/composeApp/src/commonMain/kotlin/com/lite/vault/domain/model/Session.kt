package com.lite.vault.domain.model

import kotlinx.serialization.Serializable

/**
 * Domain model for user session
 */
@Serializable
data class Session(
    val token: String,
    val sessionId: String,
    val userId: String,
    val email: String,
    val isNewUser: Boolean = false
)
