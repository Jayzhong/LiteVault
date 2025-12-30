package com.lite.vault

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform