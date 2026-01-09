package com.lite.vault.feature.me

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.lite.vault.core.designsystem.theme.AppSpacing
import com.lite.vault.core.designsystem.theme.AppTypography
import com.lite.vault.core.designsystem.theme.MintColors
import mobile.composeapp.generated.resources.Res
import mobile.composeapp.generated.resources.*
import org.jetbrains.compose.resources.stringResource

private const val MaxNicknameLength = 40
private const val MaxBioLength = 200

@Composable
fun EditProfileScreen(
    onBack: () -> Unit,
    onSaved: () -> Unit,
    showBack: Boolean = true,
    viewModel: EditProfileViewModel = rememberEditProfileViewModel()
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(state.isSaved) {
        if (state.isSaved) {
            viewModel.onIntent(EditProfileIntent.ConsumeSaved)
            onSaved()
        }
    }

    Scaffold(
        containerColor = MintColors.White,
        topBar = {
            EditProfileTopBar(onBack = onBack, showBack = showBack)
        },
        bottomBar = {
            EditProfileBottomBar(
                isSaving = state.isSaving,
                onSave = { viewModel.onIntent(EditProfileIntent.Save) }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MintColors.White)
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = AppSpacing.xl, vertical = AppSpacing.lg),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(AppSpacing.lg)
        ) {
            AvatarSection()

            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(AppSpacing.lg)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    Text(
                        text = stringResource(Res.string.me_edit_profile_nickname_label),
                        style = AppTypography.Body.copy(fontWeight = FontWeight.Bold)
                    )
                    ProfileTextField(
                        value = state.nicknameInput,
                        placeholder = stringResource(Res.string.me_edit_profile_nickname_placeholder),
                        onValueChange = {
                            viewModel.onIntent(
                                EditProfileIntent.NicknameChanged(it.take(MaxNicknameLength))
                            )
                        },
                        singleLine = true,
                        maxLines = 1,
                        enabled = !state.isSaving
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    Text(
                        text = stringResource(Res.string.me_edit_profile_bio_label),
                        style = AppTypography.Body.copy(fontWeight = FontWeight.Bold)
                    )
                    ProfileTextField(
                        value = state.bioInput,
                        placeholder = stringResource(Res.string.me_edit_profile_bio_placeholder),
                        onValueChange = {
                            viewModel.onIntent(EditProfileIntent.BioChanged(it.take(MaxBioLength)))
                        },
                        singleLine = false,
                        maxLines = 6,
                        minHeight = 140.dp,
                        iconAlignment = Alignment.BottomEnd,
                        enabled = !state.isSaving
                    )
                    Text(
                        text = stringResource(
                            Res.string.me_edit_profile_bio_count,
                            state.bioInput.length.coerceAtMost(MaxBioLength),
                            MaxBioLength
                        ),
                        style = AppTypography.Caption.copy(color = MintColors.TextSecondary),
                        textAlign = TextAlign.End,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            if (state.isLoading && state.profile == null) {
                Text(
                    text = stringResource(Res.string.common_loading),
                    style = AppTypography.Caption.copy(color = MintColors.TextSecondary)
                )
            }

            if (state.errorMessage != null) {
                Text(
                    text = state.errorMessage ?: stringResource(Res.string.error_network_message),
                    style = AppTypography.Caption.copy(color = MintColors.Error),
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
private fun EditProfileTopBar(
    onBack: () -> Unit,
    showBack: Boolean
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MintColors.White)
            .padding(horizontal = AppSpacing.md, vertical = AppSpacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        if (showBack) {
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = null,
                    tint = MintColors.DarkAnchor
                )
            }
        } else {
            Spacer(modifier = Modifier.size(40.dp))
        }
        Text(
            text = stringResource(Res.string.me_edit_profile),
            style = AppTypography.H3
        )
        Spacer(modifier = Modifier.width(40.dp))
    }
}

@Composable
private fun AvatarSection() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
    ) {
        Box(
            modifier = Modifier
                .size(132.dp)
                .shadow(12.dp, CircleShape)
                .background(MintColors.White, CircleShape)
                .border(2.dp, MintColors.MintPrimary, CircleShape)
                .padding(6.dp)
                .clickable { },
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

            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .size(32.dp)
                    .shadow(8.dp, CircleShape)
                    .background(MintColors.MintPrimary, CircleShape)
                    .border(2.dp, MintColors.White, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.PhotoCamera,
                    contentDescription = null,
                    tint = MintColors.White,
                    modifier = Modifier.size(18.dp)
                )
            }
        }

        Text(
            text = stringResource(Res.string.me_edit_profile_avatar_hint),
            style = AppTypography.Caption.copy(
                color = MintColors.MintPrimary,
                fontWeight = FontWeight.Medium
            )
        )
    }
}

@Composable
private fun ProfileTextField(
    value: String,
    placeholder: String,
    onValueChange: (String) -> Unit,
    singleLine: Boolean,
    maxLines: Int,
    enabled: Boolean,
    minHeight: Dp = 0.dp,
    iconAlignment: Alignment = Alignment.CenterEnd
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    val borderColor = if (isFocused) MintColors.MintPrimary else MintColors.Border

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = minHeight)
            .background(MintColors.LightSurface, RoundedCornerShape(20.dp))
            .border(2.dp, borderColor, RoundedCornerShape(20.dp))
            .padding(horizontal = AppSpacing.md, vertical = AppSpacing.md)
    ) {
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            enabled = enabled,
            interactionSource = interactionSource,
            textStyle = AppTypography.Body.copy(
                color = MintColors.DarkAnchor,
                fontWeight = FontWeight.Medium
            ),
            singleLine = singleLine,
            maxLines = maxLines,
            cursorBrush = SolidColor(MintColors.MintPrimary),
            modifier = Modifier
                .fillMaxWidth()
                .padding(end = 28.dp, bottom = if (iconAlignment == Alignment.BottomEnd) 12.dp else 0.dp),
            decorationBox = { innerTextField ->
                if (value.isBlank()) {
                    Text(
                        text = placeholder,
                        style = AppTypography.Body.copy(
                            color = MintColors.TextSecondary,
                            fontWeight = FontWeight.Medium
                        )
                    )
                }
                innerTextField()
            }
        )

        Icon(
            imageVector = Icons.Default.Edit,
            contentDescription = null,
            tint = MintColors.MintPrimary,
            modifier = Modifier
                .align(iconAlignment)
                .alpha(if (isFocused) 1f else 0f)
                .size(18.dp)
        )
    }
}

@Composable
private fun EditProfileBottomBar(
    isSaving: Boolean,
    onSave: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MintColors.White)
    ) {
        HorizontalDivider(color = MintColors.Border.copy(alpha = 0.5f))
        Column(modifier = Modifier.padding(AppSpacing.lg)) {
            Button(
                onClick = onSave,
                enabled = !isSaving,
                shape = RoundedCornerShape(20.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MintColors.MintPrimary,
                    contentColor = MintColors.White,
                    disabledContainerColor = MintColors.MintPrimary.copy(alpha = 0.6f),
                    disabledContentColor = MintColors.White
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .shadow(10.dp, RoundedCornerShape(20.dp))
            ) {
                Text(
                    text = if (isSaving) {
                        stringResource(Res.string.me_edit_profile_saving)
                    } else {
                        stringResource(Res.string.me_edit_profile_save)
                    },
                    style = AppTypography.Button
                )
            }
        }
    }
}
