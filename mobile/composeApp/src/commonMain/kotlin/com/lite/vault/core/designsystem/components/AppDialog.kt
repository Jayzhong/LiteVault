package com.lite.vault.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.lite.vault.core.designsystem.theme.AppShapes
import com.lite.vault.core.designsystem.theme.AppSpacing
import com.lite.vault.core.designsystem.theme.AppTypography
import com.lite.vault.core.designsystem.theme.MintColors

/**
 * LiteVault Dialog Component
 * 
 * Features:
 * - Modal overlay with scrim (40% black)
 * - Rounded card (20dp)
 * - Icon + Title + Message + Action button
 */
@Composable
fun AppDialog(
    title: String,
    message: String,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    icon: @Composable (() -> Unit)? = null,
    actionButton: @Composable (() -> Unit)? = null
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = modifier.width(320.dp),
            shape = AppShapes.Dialog,
            colors = CardDefaults.cardColors(
                containerColor = MintColors.White
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(AppSpacing.lg),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
            ) {
                // Icon (if provided)
                icon?.invoke()
                
                // Title
                Text(
                    text = title,
                    style = AppTypography.H3,
                    textAlign = TextAlign.Center
                )
                
                // Message
                Text(
                    text = message,
                    style = AppTypography.Body.copy(color = MintColors.TextSecondary),
                    textAlign = TextAlign.Center
                )
                
                // Action Button
                actionButton?.let {
                    Spacer(modifier = Modifier.height(AppSpacing.sm))
                    it()
                }
            }
        }
    }
}

/**
 * Error Dialog Variant
 * Pre-configured with error icon and styling
 */
@Composable
fun AppErrorDialog(
    title: String,
    message: String,
    actionButtonText: String,
    onActionClick: () -> Unit,
    onDismiss: () -> Unit
) {
    AppDialog(
        title = title,
        message = message,
        onDismiss = onDismiss,
        icon = {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(MintColors.Error.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = MintColors.Error,
                    modifier = Modifier.size(24.dp)
                )
            }
        },
        actionButton = {
            AppButton(
                text = actionButtonText,
                onClick = {
                    onDismiss()
                    onActionClick()
                },
                variant = AppButtonVariant.PRIMARY,
                modifier = Modifier.fillMaxWidth()
            )
        }
    )
}
