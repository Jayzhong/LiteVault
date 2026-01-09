package com.lite.vault.feature.me

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.lite.vault.core.designsystem.theme.AppSpacing
import com.lite.vault.core.designsystem.theme.AppTypography
import com.lite.vault.core.designsystem.theme.MintColors
import mobile.composeapp.generated.resources.Res
import mobile.composeapp.generated.resources.*
import org.jetbrains.compose.resources.stringResource

@Composable
fun MeScreen(
    onEditProfile: () -> Unit = {},
    onLoggedOut: () -> Unit = {},
    refreshKey: Int = 0,
    viewModel: MeViewModel = rememberMeViewModel()
) {
    val state by viewModel.state.collectAsState()
    val profile = state.profile
    val showLogoutDialog = remember { mutableStateOf(false) }
    val displayName = profile?.nickname
        ?: profile?.displayName
        ?: stringResource(Res.string.me_default_name)
    val nickname = profile?.nickname?.takeIf { it.isNotBlank() }
    val bio = profile?.bio ?: stringResource(Res.string.me_default_bio)
    val email = profile?.email ?: stringResource(Res.string.me_email_placeholder)
    val planLabel = profile?.plan?.takeIf { it.isNotBlank() }?.uppercase()
        ?: stringResource(Res.string.me_plan_free)

    LaunchedEffect(refreshKey) {
        if (refreshKey > 0) {
            viewModel.onIntent(MeIntent.Refresh)
        }
    }
    LaunchedEffect(state.logoutTick) {
        if (state.logoutTick > 0) {
            onLoggedOut()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MintColors.White)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = AppSpacing.xl)
            .padding(top = AppSpacing.lg, bottom = AppSpacing.xxl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppSpacing.lg)
    ) {
        Spacer(modifier = Modifier.height(AppSpacing.lg))

        ProfileHeader(
            displayName = displayName,
            nickname = nickname,
            bio = bio,
            onEditProfile = onEditProfile
        )

        InfoCard(
            email = email,
            planLabel = planLabel
        )

        LogoutButton(
            enabled = !state.isLoggingOut,
            onClick = { showLogoutDialog.value = true }
        )

        if (state.isLoading && profile == null) {
            Text(
                text = stringResource(Res.string.common_loading),
                style = AppTypography.Caption.copy(color = MintColors.TextSecondary)
            )
        }

        if (state.errorMessage != null) {
            Text(
                text = stringResource(Res.string.me_error),
                style = AppTypography.Caption.copy(color = MintColors.TextSecondary)
            )
        }
    }

    if (showLogoutDialog.value) {
        LogoutDialog(
            isLoggingOut = state.isLoggingOut,
            onConfirm = {
                showLogoutDialog.value = false
                viewModel.onIntent(MeIntent.Logout)
            },
            onDismiss = { if (!state.isLoggingOut) showLogoutDialog.value = false }
        )
    }
}

@Composable
private fun ProfileHeader(
    displayName: String,
    nickname: String?,
    bio: String,
    onEditProfile: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
    ) {
        Box(
            modifier = Modifier.size(132.dp),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .shadow(16.dp, CircleShape)
                    .background(MintColors.White, CircleShape)
                    .border(2.dp, MintColors.MintPrimary.copy(alpha = 0.25f), CircleShape)
                    .padding(6.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(MintColors.LightSurface, CircleShape)
                        .border(2.dp, MintColors.MintPrimary.copy(alpha = 0.1f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = MintColors.Border,
                        modifier = Modifier.size(64.dp)
                    )
                }
            }

            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .offset(x = (-4).dp, y = (-4).dp)
                    .size(32.dp)
                    .shadow(8.dp, CircleShape)
                    .background(MintColors.White, CircleShape)
                    .border(1.dp, MintColors.Border, CircleShape)
                    .clickable { },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.PhotoCamera,
                    contentDescription = null,
                    tint = MintColors.MintPrimary,
                    modifier = Modifier.size(18.dp)
                )
            }
        }

        Text(
            text = displayName,
            style = AppTypography.H1,
            textAlign = TextAlign.Center
        )

        if (!nickname.isNullOrBlank()) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(MintColors.MintTint)
                    .border(1.dp, MintColors.MintPrimary.copy(alpha = 0.2f), RoundedCornerShape(50))
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text(
                    text = stringResource(Res.string.me_nickname_format, nickname),
                    style = AppTypography.Caption.copy(
                        color = MintColors.MintDeep,
                        fontWeight = FontWeight.Medium
                    )
                )
            }
        }

        Text(
            text = bio,
            style = AppTypography.Body.copy(color = MintColors.TextSecondary),
            textAlign = TextAlign.Center
        )

        OutlinedButton(
            onClick = onEditProfile,
            border = androidx.compose.foundation.BorderStroke(1.dp, MintColors.Border),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = MintColors.DarkAnchor,
                containerColor = MintColors.White
            ),
            modifier = Modifier
                .widthIn(max = 200.dp)
                .fillMaxWidth()
        ) {
            Icon(
                imageVector = Icons.Default.Edit,
                contentDescription = null,
                tint = MintColors.DarkAnchor,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.size(AppSpacing.sm))
            Text(
                text = stringResource(Res.string.me_edit_profile),
                style = AppTypography.Button.copy(color = MintColors.DarkAnchor)
            )
        }
    }
}

@Composable
private fun InfoCard(
    email: String,
    planLabel: String
) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MintColors.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth(),
        border = androidx.compose.foundation.BorderStroke(1.dp, MintColors.Border.copy(alpha = 0.6f))
    ) {
        Column {
            InfoRow(
                icon = Icons.Default.Email,
                label = stringResource(Res.string.me_email_label),
                content = {
                    Text(
                        text = email,
                        style = AppTypography.BodySmall.copy(color = MintColors.TextSecondary),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            )
            HorizontalDivider(
                modifier = Modifier.padding(horizontal = AppSpacing.lg),
                color = MintColors.Border.copy(alpha = 0.6f)
            )
            InfoRow(
                icon = Icons.Default.Verified,
                label = stringResource(Res.string.me_plan_label),
                content = {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(MintColors.MintTint)
                            .border(1.dp, MintColors.MintPrimary.copy(alpha = 0.2f), RoundedCornerShape(50))
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = planLabel,
                            style = AppTypography.Label.copy(
                                color = MintColors.MintDeep,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }
            )
        }
    }
}

@Composable
private fun InfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    content: @Composable () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = AppSpacing.lg, vertical = AppSpacing.md),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MintColors.TextSecondary,
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = label,
                style = AppTypography.Body.copy(
                    color = MintColors.DarkAnchor,
                    fontWeight = FontWeight.Medium
                )
            )
        }
        content()
    }
}

@Composable
private fun LogoutButton(
    enabled: Boolean,
    onClick: () -> Unit
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        border = androidx.compose.foundation.BorderStroke(1.dp, MintColors.Border.copy(alpha = 0.6f)),
        shape = RoundedCornerShape(24.dp),
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = MintColors.Error,
            containerColor = MintColors.White,
            disabledContentColor = MintColors.TextSecondary
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(
            imageVector = Icons.AutoMirrored.Filled.Logout,
            contentDescription = null,
            tint = MintColors.Error,
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.size(AppSpacing.sm))
        Text(
            text = stringResource(Res.string.me_logout),
            style = AppTypography.Button.copy(color = MintColors.Error)
        )
    }
}

@Composable
private fun LogoutDialog(
    isLoggingOut: Boolean,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MintColors.Black.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = AppSpacing.lg),
                shape = RoundedCornerShape(28.dp),
                colors = CardDefaults.cardColors(containerColor = MintColors.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 12.dp)
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = AppSpacing.lg, vertical = AppSpacing.xl),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                ) {
                    Box(
                        modifier = Modifier.size(56.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .matchParentSize()
                                .clip(CircleShape)
                                .background(MintColors.LightSurface),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.Logout,
                                contentDescription = null,
                                tint = MintColors.TextSecondary,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .offset(x = (-2).dp, y = (-2).dp)
                                .size(12.dp)
                                .clip(CircleShape)
                                .background(MintColors.MintPrimary)
                                .border(2.dp, MintColors.White, CircleShape)
                        )
                    }

                    Text(
                        text = stringResource(Res.string.me_logout_title),
                        style = AppTypography.H2,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        text = stringResource(Res.string.me_logout_message),
                        style = AppTypography.Body.copy(color = MintColors.TextSecondary),
                        textAlign = TextAlign.Center
                    )

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                    ) {
                        OutlinedButton(
                            onClick = onConfirm,
                            enabled = !isLoggingOut,
                            border = BorderStroke(1.dp, MintColors.Border),
                            shape = RoundedCornerShape(20.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = MintColors.Error,
                                containerColor = MintColors.White,
                                disabledContentColor = MintColors.TextSecondary
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                        ) {
                            Text(
                                text = if (isLoggingOut) {
                                    stringResource(Res.string.me_logout_loading)
                                } else {
                                    stringResource(Res.string.me_logout_confirm)
                                },
                                style = AppTypography.Button.copy(color = MintColors.Error)
                            )
                        }
                        OutlinedButton(
                            onClick = onDismiss,
                            enabled = !isLoggingOut,
                            border = BorderStroke(0.dp, Color.Transparent),
                            shape = RoundedCornerShape(20.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = MintColors.TextSecondary,
                                containerColor = Color.Transparent,
                                disabledContentColor = MintColors.TextSecondary
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                        ) {
                            Text(
                                text = stringResource(Res.string.me_logout_cancel),
                                style = AppTypography.Button.copy(color = MintColors.TextSecondary)
                            )
                        }
                    }
                }
            }
        }
    }
}
