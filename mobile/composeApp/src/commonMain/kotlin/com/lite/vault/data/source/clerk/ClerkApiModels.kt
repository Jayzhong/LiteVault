package com.lite.vault.data.source.clerk

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ClerkSignInResponse(
    val id: String,
    val status: String,
    @SerialName("created_session_id") val createdSessionId: String? = null,
    @SerialName("supported_first_factors") val supportedFirstFactors: List<ClerkFactor>? = null
)

@Serializable
data class ClerkSignUpResponse(
    val id: String,
    val status: String,
    @SerialName("created_session_id") val createdSessionId: String? = null
)

@Serializable
data class ClerkFactor(
    val strategy: String,
    @SerialName("email_address_id") val emailAddressId: String? = null,
    @SerialName("phone_number_id") val phoneNumberId: String? = null
)

@Serializable
data class ClerkTokenResponse(
    val jwt: String
)

@Serializable
data class ClerkClientResponse(
    val sessions: List<ClerkSession>? = null
)

@Serializable
data class ClerkSession(
    val id: String,
    val status: String,
    @SerialName("user_id") val userId: String? = null,
    @SerialName("last_active_at") val lastActiveAt: Long? = null
)

@Serializable
data class ClerkErrorResponse(
    val errors: List<ClerkError> = emptyList()
)

@Serializable
data class ClerkError(
    val message: String? = null,
    val code: String? = null,
    @SerialName("long_message") val longMessage: String? = null
)
