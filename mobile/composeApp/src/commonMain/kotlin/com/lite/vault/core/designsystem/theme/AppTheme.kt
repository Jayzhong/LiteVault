package com.lite.vault.core.designsystem.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = MintColors.MintDeep,
    onPrimary = MintColors.White,
    primaryContainer = MintColors.MintTint,
    onPrimaryContainer = MintColors.DarkAnchor,
    
    surface = MintColors.LightSurface,
    onSurface = MintColors.DarkAnchor,
    surfaceVariant = MintColors.White,
    onSurfaceVariant = MintColors.TextSecondary,
    
    error = MintColors.Error,
    onError = MintColors.White,
    
    outline = MintColors.Border,
    outlineVariant = MintColors.TextSecondary
)

/**
 * LiteVault App Theme
 * Applies Mint design tokens to Material3 theme
 */
@Composable
fun AppTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        content = content
    )
}
