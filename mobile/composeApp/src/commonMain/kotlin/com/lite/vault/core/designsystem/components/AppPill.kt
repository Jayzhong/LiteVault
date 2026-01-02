package com.lite.vault.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.lite.vault.core.designsystem.theme.AppShapes
import com.lite.vault.core.designsystem.theme.AppSpacing
import com.lite.vault.core.designsystem.theme.AppTypography
import com.lite.vault.core.designsystem.theme.MintColors

/**
 * Resend Timer Pill Component
 * 
 * Features:
 * - Mint tint background
 * - Icon + countdown text
 * - Rounded pill shape (18dp corner radius)
 */
@Composable
fun AppPill(
    text: String,
    modifier: Modifier = Modifier,
    icon: @Composable (() -> Unit)? = null,
    enabled: Boolean = true
) {
    Row(
        modifier = modifier
            .height(36.dp)
            .clip(AppShapes.Chip)
            .background(
                if (enabled) MintColors.MintTint
                else MintColors.Border
            )
            .padding(horizontal = AppSpacing.md, vertical = AppSpacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
    ) {
        icon?.invoke()
        Text(
            text = text,
            style = AppTypography.Caption.copy(
                color = if (enabled) MintColors.MintDeep
                else MintColors.TextSecondary
            )
        )
    }
}
