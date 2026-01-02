package com.lite.vault.core.designsystem.components

import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import com.lite.vault.core.designsystem.theme.AppShapes
import com.lite.vault.core.designsystem.theme.AppTypography
import com.lite.vault.core.designsystem.theme.MintColors

/**
 * LiteVault TextField Component
 * 
 * Features:
 * - Border color changes on focus (Border → MintPrimary)
 * - Optional trailing icon (e.g., edit pencil)
 * - Rounded corners (12dp)
 */
@Composable
fun AppTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    trailingIcon: @Composable (() -> Unit)? = null,
    enabled: Boolean = true,
    readOnly: Boolean = false,
    singleLine: Boolean = true,
    maxLines: Int = 1,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Done,
    onImeAction: () -> Unit = {}
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        placeholder = placeholder?.let {
            { Text(it, style = AppTypography.Body.copy(color = MintColors.TextSecondary)) }
        },
        trailingIcon = trailingIcon,
        enabled = enabled,
        readOnly = readOnly,
        singleLine = singleLine,
        maxLines = maxLines,
        textStyle = AppTypography.Body,
        shape = AppShapes.TextField,
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = MintColors.LightSurface, // Or slightly darker if needed
            unfocusedContainerColor = MintColors.LightSurface,
            disabledContainerColor = MintColors.LightSurface,
            focusedBorderColor = MintColors.MintPrimary,
            unfocusedBorderColor = MintColors.Border, // Or Transparnt if purely filled
            disabledBorderColor = MintColors.Border,
            focusedTextColor = MintColors.DarkAnchor,
            unfocusedTextColor = MintColors.DarkAnchor,
            cursorColor = MintColors.MintDeep
        ),
        keyboardOptions = KeyboardOptions(
            keyboardType = keyboardType,
            imeAction = imeAction
        ),
        keyboardActions = KeyboardActions(
            onDone = { onImeAction() },
            onGo = { onImeAction() },
            onSearch = { onImeAction() },
            onSend = { onImeAction() },
            onNext = { onImeAction() }
        ),
        interactionSource = interactionSource
    )
}
