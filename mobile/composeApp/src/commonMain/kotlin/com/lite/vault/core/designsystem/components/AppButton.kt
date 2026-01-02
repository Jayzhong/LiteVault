package com.lite.vault.core.designsystem.components

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.lite.vault.core.designsystem.theme.AppShapes
import com.lite.vault.core.designsystem.theme.AppTypography
import com.lite.vault.core.designsystem.theme.MintColors

enum class AppButtonVariant {
    PRIMARY,
    SECONDARY,
    TEXT
}

/**
 * LiteVault Button Component
 * 
 * Variants:
 * - PRIMARY: MintDeep background with white text (accessible CTA)
 * - SECONDARY: MintTint background with DarkAnchor text
 * - TEXT: No background, MintDeep text
 */
@Composable
fun AppButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: AppButtonVariant = AppButtonVariant.PRIMARY,
    enabled: Boolean = true
) {
    when (variant) {
        AppButtonVariant.PRIMARY -> {
            Button(
                onClick = onClick,
                modifier = modifier.heightIn(min = 56.dp),
                enabled = enabled,
                shape = AppShapes.Button,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MintColors.MintPrimary,
                    contentColor = MintColors.White,
                    disabledContainerColor = MintColors.Border,
                    disabledContentColor = MintColors.TextSecondary
                ),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp)
            ) {
                Text(text, style = AppTypography.Button)
            }
        }
        AppButtonVariant.SECONDARY -> {
            Button(
                onClick = onClick,
                modifier = modifier.heightIn(min = 56.dp),
                enabled = enabled,
                shape = AppShapes.Button,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MintColors.MintTint,
                    contentColor = MintColors.DarkAnchor,
                    disabledContainerColor = MintColors.Border,
                    disabledContentColor = MintColors.TextSecondary
                ),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp)
            ) {
                Text(text, style = AppTypography.Button.copy(color = MintColors.DarkAnchor))
            }
        }
        AppButtonVariant.TEXT -> {
            TextButton(
                onClick = onClick,
                modifier = modifier,
                enabled = enabled,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = MintColors.MintDeep,
                    disabledContentColor = MintColors.TextSecondary
                )
            ) {
                Text(text, style = AppTypography.Button.copy(color = MintColors.MintDeep))
            }
        }
    }
}
