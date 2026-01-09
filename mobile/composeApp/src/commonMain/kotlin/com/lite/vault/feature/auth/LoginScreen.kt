package com.lite.vault.feature.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.lite.vault.core.designsystem.components.*
import com.lite.vault.core.designsystem.theme.*
import com.lite.vault.core.navigation.Navigator
import mobile.composeapp.generated.resources.Res
import mobile.composeapp.generated.resources.*
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.input.pointer.pointerInput

/**
 * Login Screen
 * 
 * Features:
 * - Email input with trailing edit icon
 * - 6-digit code input (individual boxes)
 * - Resend timer button
 * - Primary CTA buttons
 * - Error dialog
 * - Terms footer
 */
@Composable
fun LoginScreen(
    navigator: Navigator,
    viewModel: LoginViewModel = rememberLoginViewModel()
) {
    val state by viewModel.state.collectAsState()
    var showErrorDialog by remember { mutableStateOf(false) }
    var errorTitle by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf("") }
    
    // Collect effects for navigation and error handling
    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is LoginEffect.NavigateToHome -> {
                    navigator.navigate(com.lite.vault.core.navigation.Screen.Home)
                }
                is LoginEffect.NavigateToEditProfile -> {
                    navigator.navigate(com.lite.vault.core.navigation.Screen.EditProfile)
                }
                is LoginEffect.ShowError -> {
                    errorTitle = effect.title
                    errorMessage = effect.message
                    showErrorDialog = true
                }
            }
        }
    }
    
    val focusManager = LocalFocusManager.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTapGestures(onTap = {
                    focusManager.clearFocus()
                })
            },
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(AppSpacing.xl),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(AppSpacing.lg)
        ) {
            Spacer(modifier = Modifier.height(AppSpacing.xxl))
            
            // Logo + App Name + Slogan
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
            ) {
               // Logo
               Image(
                   painter = painterResource(Res.drawable.logo),
                   contentDescription = null,
                   modifier = Modifier.size(96.dp)
               )
                
                Text(
                    text = stringResource(Res.string.app_name),
                    style = AppTypography.H1.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                )
                
                Text(
                    text = stringResource(Res.string.app_slogan),
                    style = AppTypography.Body.copy(color = MintColors.TextSecondary),
                    textAlign = TextAlign.Center
                )
            }
            
            Spacer(modifier = Modifier.height(AppSpacing.lg))
            
            // Email Section
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                Text(
                    text = stringResource(Res.string.login_email_label),
                    style = AppTypography.Label
                )
                
                AppTextField(
                    value = state.email,
                    onValueChange = { viewModel.onIntent(LoginIntent.EmailChanged(it)) },
                    placeholder = stringResource(Res.string.login_email_placeholder),
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next,
                    enabled = !state.isCodeSent,
                    trailingIcon = {
                        IconButton(onClick = {}) {
                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = null,
                                tint = MintColors.TextSecondary
                            )
                        }
                    }
                )
            }
            
            // Verification Code Section (visible after code sent)
            if (state.isCodeSent) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = stringResource(Res.string.login_code_label),
                            style = AppTypography.Label
                        )
                        
                        // Resend Timer
                        AppPill(
                            text = if (state.resendCountdown > 0) {
                                stringResource(Res.string.login_resend_timer, formatTime(state.resendCountdown))
                            } else {
                                "Resend"
                            },
                            enabled = state.isResendEnabled,
                            icon = if (state.isResendEnabled) {
                                { Icon(
                                    imageVector = Icons.Default.Refresh,
                                    contentDescription = null,
                                    tint = MintColors.MintDeep,
                                    modifier = Modifier.size(16.dp)
                                )}
                            } else null
                        )
                    }
                    
                    AppCodeInput(
                        code = state.verificationCode,
                        onCodeChange = { viewModel.onIntent(LoginIntent.CodeChanged(it)) },
                        onCodeComplete = {
                            // Auto-submit when code complete (optional)
                        }
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(AppSpacing.md))
            
            // Primary CTA Button
            if (!state.isCodeSent) {
                AppButton(
                    text = stringResource(Res.string.login_send_code),
                    onClick = { viewModel.onIntent(LoginIntent.SendCodeClicked) },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !state.isLoading && state.email.isNotBlank()
                )
            } else {
                AppButton(
                    text = stringResource(Res.string.login_continue),
                    onClick = { viewModel.onIntent(LoginIntent.VerifyCodeClicked) },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !state.isLoading && state.verificationCode.length == 6
                )
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Terms Footer
            Text(
                text = buildAnnotatedString {
                    append("By continuing, you agree to our ")
                    withStyle(SpanStyle(color = MintColors.MintDeep)) {
                        append(stringResource(Res.string.login_terms_service))
                    }
                    append(" and ")
                    withStyle(SpanStyle(color = MintColors.MintDeep)) {
                        append(stringResource(Res.string.login_privacy))
                    }
                },
                style = AppTypography.Caption,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = AppSpacing.lg)
            )
        }
        
        // Error Dialog
        if (showErrorDialog) {
            AppErrorDialog(
                title = errorTitle,
                message = errorMessage,
                actionButtonText = stringResource(Res.string.error_try_again),
                onActionClick = {
                    // Retry logic (for V1, just close dialog)
                },
                onDismiss = { showErrorDialog = false }
            )
        }
    }
}

/**
 * Format countdown time (e.g., 59 → "0:59")
 */
private fun formatTime(seconds: Int): String {
    val mins = seconds / 60
    val secs = seconds % 60
    return "$mins:${secs.toString().padStart(2, '0')}"
}
