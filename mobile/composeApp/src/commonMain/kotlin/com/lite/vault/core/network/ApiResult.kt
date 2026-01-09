package com.lite.vault.core.network

/**
 * Unified API Result Type
 */
sealed class ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>()
    data class Error(val code: Int = 0, val message: String) : ApiResult<Nothing>()
    
    fun isSuccess(): Boolean = this is Success
    fun isError(): Boolean = this is Error
    
    fun getOrNull(): T? = when (this) {
        is Success -> data
        is Error -> null
    }
    
    fun errorOrNull(): Error? = when (this) {
        is Success -> null
        is Error -> this
    }
}

/**
 * Helper function to wrap exceptions in ApiResult
 */
suspend inline fun <T> apiCall(block: suspend () -> T): ApiResult<T> {
    return try {
        ApiResult.Success(block())
    } catch (e: ApiException) {
        ApiResult.Error(code = e.statusCode, message = e.responseBody.ifBlank { e.message ?: "API error" })
    } catch (e: Exception) {
        ApiResult.Error(message = e.message ?: "Unknown error")
    }
}
