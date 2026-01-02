package com.lite.vault.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.lite.vault.core.designsystem.theme.AppShapes
import com.lite.vault.core.designsystem.theme.AppSpacing
import com.lite.vault.core.designsystem.theme.AppTypography
import com.lite.vault.core.designsystem.theme.MintColors

/**
 * 6-Digit Code Input Component
 * 
 * Features:
 * - 6 individual boxes (48dp x 56dp each)
 * - Active box has MintPrimary border (2dp)
 * - Auto-focus next box on input
 * - Auto-focus previous box on backspace
 */
@Composable
fun AppCodeInput(
    code: String,
    onCodeChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    onCodeComplete: (() -> Unit)? = null
) {
    val codeLength = 6
    val focusRequesters = remember { List(codeLength) { FocusRequester() } }
    var focusedIndex by remember { mutableStateOf(0) }
    
    LaunchedEffect(code) {
        if (code.length == codeLength && onCodeComplete != null) {
            onCodeComplete()
        }
    }
    
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
    ) {
        repeat(codeLength) { index ->
            val char = code.getOrNull(index)?.toString() ?: ""
            val isFocused = focusedIndex == index
            
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp)
                    .background(MintColors.LightSurface, AppShapes.CodeBox)
                    .border(
                        width = if (isFocused) 2.dp else 1.dp,
                        color = if (isFocused) MintColors.MintPrimary else MintColors.Border,
                        shape = AppShapes.CodeBox
                    )
                    .focusRequester(focusRequesters[index])
                    .onKeyEvent { event ->
                        if (event.type == KeyEventType.KeyDown && event.key == Key.Backspace) {
                            if (char.isEmpty() && index > 0 && code.isNotEmpty()) {
                                val safeIndex = minOf(index, code.length)
                                val newCode = code.removeRange(safeIndex - 1, safeIndex)
                                onCodeChange(newCode)
                                focusRequesters[index - 1].requestFocus()
                                true
                            } else {
                                false
                            }
                        } else {
                            false
                        }
                    }
                    .onFocusChanged { 
                        if (it.isFocused) focusedIndex = index 
                    },
                contentAlignment = Alignment.Center
            ) {
                BasicTextField(
                    value = char,
                    onValueChange = { newValue ->
                        val digits = newValue.filter { it.isDigit() }
                        when {
                            digits.isEmpty() && code.length > index -> {
                                val newCode = code.removeRange(index, index + 1)
                                onCodeChange(newCode)
                                if (index > 0) {
                                    focusRequesters[index - 1].requestFocus()
                                }
                            }
                            digits.length == 1 -> {
                                val newCode = updateCode(code, index, digits)
                                onCodeChange(newCode)
                                if (index < codeLength - 1) {
                                    focusRequesters[index + 1].requestFocus()
                                }
                            }
                            digits.length > 1 -> {
                                val newCode = if (digits.length >= codeLength) {
                                    digits.take(codeLength)
                                } else {
                                    updateCode(code, index, digits)
                                }
                                onCodeChange(newCode)
                                val nextIndex = (index + digits.length).coerceAtMost(codeLength - 1)
                                focusRequesters[nextIndex].requestFocus()
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(AppSpacing.sm),
                    textStyle = AppTypography.H2.copy(
                        textAlign = TextAlign.Center,
                        color = MintColors.DarkAnchor
                    ),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    cursorBrush = SolidColor(MintColors.MintDeep)
                )
            }
        }
    }
    
    // Auto-focus first box on initial composition
    LaunchedEffect(Unit) {
        if (code.isEmpty()) {
            focusRequesters[0].requestFocus()
        }
    }
}

private fun updateCode(current: String, startIndex: Int, digits: String): String {
    val slots = MutableList(6) { ' ' }
    current.forEachIndexed { index, char ->
        if (index < slots.size) {
            slots[index] = char
        }
    }
    var position = startIndex
    digits.forEach { char ->
        if (position < slots.size) {
            slots[position] = char
            position++
        }
    }
    return slots.joinToString("").filter { it.isDigit() }
}
