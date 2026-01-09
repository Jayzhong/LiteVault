package com.lite.vault.feature.home

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Article
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lite.vault.core.designsystem.theme.AppSpacing
import com.lite.vault.core.designsystem.theme.AppTypography
import com.lite.vault.core.designsystem.theme.MintColors
import com.lite.vault.domain.model.Item
import com.lite.vault.domain.model.ItemStatus
import com.lite.vault.domain.model.SourceType
import kotlin.time.Clock
import kotlin.math.roundToInt
import mobile.composeapp.generated.resources.Res
import mobile.composeapp.generated.resources.*
import org.jetbrains.compose.resources.stringResource

@Composable
fun HomeScreen(
    onViewAll: () -> Unit,
    onItemClick: (String) -> Unit,
    viewModel: HomeViewModel = rememberHomeViewModel()
) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(Unit) {
        viewModel.onIntent(HomeIntent.RefreshAll)
    }

    val greetingName = state.greetingName.ifBlank { stringResource(Res.string.home_default_name) }
    val processingItem = state.pendingItems.firstOrNull { it.status == ItemStatus.ENRICHING }
    val pendingItem = state.pendingItems.firstOrNull {
        it.status == ItemStatus.READY_TO_CONFIRM || it.status == ItemStatus.FAILED
    }
    val recentItems = state.recentItems.take(3)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MintColors.White)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(AppSpacing.lg)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
            Text(
                text = state.dateLabel,
                style = AppTypography.Label.copy(
                    color = MintColors.MintPrimary,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.1.sp
                ),
                modifier = Modifier.padding(top = 12.dp)
            )
            Text(
                text = stringResource(Res.string.home_greeting, greetingName),
                style = AppTypography.H2.copy(fontWeight = FontWeight.Bold)
            )
        }

        CaptureCard(
            value = state.inputText,
            onValueChange = { viewModel.onIntent(HomeIntent.InputChanged(it)) },
            useAiEnabled = state.useAiEnabled,
            onToggleAi = { viewModel.onIntent(HomeIntent.ToggleUseAi) },
            onSave = { viewModel.onIntent(HomeIntent.SaveClicked) },
            isSaving = state.isSaving
        )

        if (processingItem != null) {
            StatusHeader(title = stringResource(Res.string.home_ai_processing), dotColor = MintColors.MintPrimary)
            ProcessingCard()
        } else if (pendingItem != null) {
            StatusHeader(title = stringResource(Res.string.home_pending_review), dotColor = MintColors.MintPrimary)
            PendingReviewCard(item = pendingItem, onClick = { onItemClick(pendingItem.id) })
        }

        if (recentItems.isNotEmpty()) {
            RecentCapturesSection(
                items = recentItems,
                onViewAll = onViewAll,
                onItemClick = onItemClick
            )
        }

        Spacer(modifier = Modifier.height(AppSpacing.xl))
    }
}

@Composable
private fun CaptureCard(
    value: String,
    onValueChange: (String) -> Unit,
    useAiEnabled: Boolean,
    onToggleAi: () -> Unit,
    onSave: () -> Unit,
    isSaving: Boolean
) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MintColors.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, MintColors.Border, RoundedCornerShape(24.dp))
                .padding(4.dp),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = AppSpacing.md, vertical = AppSpacing.md),
                verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
            ) {
                BasicTextField(
                    value = value,
                    onValueChange = onValueChange,
                    textStyle = AppTypography.Body.copy(
                        color = MintColors.DarkAnchor,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Medium,
                        lineHeight = 24.sp
                    ),
                    cursorBrush = Brush.verticalGradient(
                        listOf(MintColors.MintDeep, MintColors.MintDeep)
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 120.dp),
                    decorationBox = { innerTextField ->
                        if (value.isBlank()) {
                            Text(
                                text = stringResource(Res.string.home_capture_placeholder),
                                style = AppTypography.Body.copy(
                                    color = Color(0xFF9CA3AF),
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            )
                        }
                        innerTextField()
                    }
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    UseAiToggleButton(
                        enabled = useAiEnabled,
                        onClick = onToggleAi
                    )
                    PrimaryCapsuleButton(
                        text = if (isSaving) {
                            stringResource(Res.string.home_saving)
                        } else {
                            stringResource(Res.string.home_save)
                        },
                        onClick = onSave,
                        enabled = value.isNotBlank() && !isSaving
                    )
                }
            }
        }
    }
}

@Composable
private fun UseAiToggleButton(
    enabled: Boolean,
    onClick: () -> Unit
) {
    val background = if (enabled) MintColors.MintPrimary else Color(0xFFF8FAFC)
    val contentColor = if (enabled) MintColors.White else MintColors.TextSecondary
    val iconColor = if (enabled) MintColors.White else Color(0xFF9CA3AF)
    val borderColor = if (enabled) Color.Transparent else Color(0xFFE7E5E4)

    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(
            containerColor = background,
            contentColor = contentColor
        ),
        border = if (enabled) null else androidx.compose.foundation.BorderStroke(1.dp, borderColor),
        shape = RoundedCornerShape(50),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            horizontal = 12.dp,
            vertical = 6.dp
        )
    ) {
        Icon(
            imageVector = Icons.Default.AutoAwesome,
            contentDescription = null,
            tint = iconColor,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = stringResource(Res.string.home_use_ai),
            style = AppTypography.Caption.copy(
                color = contentColor,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp
            )
        )
    }
}

@Composable
private fun PrimaryCapsuleButton(
    text: String,
    onClick: () -> Unit,
    enabled: Boolean
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = MintColors.MintPrimary,
            contentColor = MintColors.White,
            disabledContainerColor = MintColors.Border,
            disabledContentColor = MintColors.TextSecondary
        ),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            horizontal = 24.dp,
            vertical = 10.dp
        )
    ) {
        Text(
            text = text,
            style = AppTypography.Button.copy(fontSize = 14.sp, fontWeight = FontWeight.Bold)
        )
    }
}

@Composable
private fun StatusHeader(title: String, dotColor: Color) {
    val transition = rememberInfiniteTransition()
    val pingScale by transition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.8f,
        animationSpec = infiniteRepeatable(tween(1200), RepeatMode.Restart)
    )
    val pingAlpha by transition.animateFloat(
        initialValue = 0.6f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(tween(1200), RepeatMode.Restart)
    )

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
    ) {
        Box(modifier = Modifier.size(10.dp), contentAlignment = Alignment.Center) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .scale(pingScale)
                    .alpha(pingAlpha)
                    .clip(CircleShape)
                    .background(dotColor)
            )
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(dotColor)
            )
        }
        Text(
            text = title,
            style = AppTypography.Label.copy(
                color = MintColors.MintPrimary,
                letterSpacing = 1.2.sp,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp
            )
        )
    }
}

@Composable
private fun ProcessingCard() {
    val transition = rememberInfiniteTransition()
    val shimmerAlpha by transition.animateFloat(
        initialValue = 0.35f,
        targetValue = 0.7f,
        animationSpec = infiniteRepeatable(tween(1100), RepeatMode.Reverse)
    )
    val shimmerOffset by transition.animateFloat(
        initialValue = -1f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1800), RepeatMode.Restart)
    )
    val spinRotation by transition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(1400), RepeatMode.Restart)
    )

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MintColors.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, MintColors.MintPrimary.copy(alpha = 0.2f), RoundedCornerShape(16.dp))
        ) {
            val density = LocalDensity.current
            val shimmerWidth = with(density) { maxWidth.toPx() }
            val shimmerOffsetPx = (shimmerOffset * shimmerWidth).roundToInt()

            Box(
                modifier = Modifier
                    .matchParentSize()
                    .offset { IntOffset(shimmerOffsetPx, 0) }
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                Color.Transparent,
                                MintColors.MintPrimary.copy(alpha = 0.08f),
                                Color.Transparent
                            )
                        )
                    )
            )
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(AppSpacing.lg),
                verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                            ShimmerPill(alpha = shimmerAlpha, width = 64.dp, height = 16.dp)
                            ShimmerPill(alpha = shimmerAlpha, width = 40.dp, height = 16.dp)
                        }
                        ShimmerLine(widthFraction = 0.7f, alpha = shimmerAlpha, height = 16.dp)
                    }
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(MintColors.MintPrimary.copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = null,
                            tint = MintColors.MintPrimary.copy(alpha = 0.6f),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    ShimmerLine(widthFraction = 1f, alpha = shimmerAlpha, height = 10.dp)
                    ShimmerLine(widthFraction = 0.85f, alpha = shimmerAlpha, height = 10.dp)
                    ShimmerLine(widthFraction = 0.6f, alpha = shimmerAlpha, height = 10.dp)
                }

                Row(horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                    ShimmerPill(alpha = shimmerAlpha, width = 48.dp, height = 20.dp)
                    ShimmerPill(alpha = shimmerAlpha, width = 56.dp, height = 20.dp)
                    ShimmerPill(alpha = shimmerAlpha, width = 42.dp, height = 20.dp)
                }

                DashedDivider(color = MintColors.Border.copy(alpha = 0.6f))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Sync,
                        contentDescription = null,
                        tint = MintColors.MintPrimary.copy(alpha = 0.7f),
                        modifier = Modifier
                            .size(16.dp)
                            .rotate(spinRotation)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                    Text(
                        text = stringResource(Res.string.home_processing_helper),
                        style = AppTypography.Caption.copy(
                            color = MintColors.MintPrimary.copy(alpha = 0.8f),
                            fontWeight = FontWeight.Medium
                        )
                    )
                }
            }
        }
    }
}

@Composable
private fun ShimmerLine(widthFraction: Float, alpha: Float, height: Dp = 12.dp) {
    Box(
        modifier = Modifier
            .fillMaxWidth(widthFraction)
            .height(height)
            .clip(RoundedCornerShape(6.dp))
            .background(Color(0xFFE5E7EB).copy(alpha = alpha))
    )
}

@Composable
private fun ShimmerPill(alpha: Float, width: Dp = 68.dp, height: Dp = 24.dp) {
    Box(
        modifier = Modifier
            .height(height)
            .width(width)
            .clip(RoundedCornerShape(50))
            .background(MintColors.MintPrimary.copy(alpha = alpha * 0.15f))
            .border(1.dp, MintColors.MintPrimary.copy(alpha = alpha * 0.2f), RoundedCornerShape(50))
    )
}

@Composable
private fun PendingReviewCard(item: Item, onClick: () -> Unit) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MintColors.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
        modifier = Modifier.clickable { onClick() }
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.verticalGradient(
                        listOf(Color(0xFFE0F9F5), MintColors.White)
                    )
                )
                .border(1.dp, MintColors.MintPrimary.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
        ) {
            Box(
                modifier = Modifier
                    .size(128.dp)
                    .align(Alignment.TopEnd)
                    .offset(x = 24.dp, y = (-24).dp)
                    .clip(CircleShape)
                    .background(MintColors.MintPrimary.copy(alpha = 0.2f))
                    .blur(48.dp)
            )
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(AppSpacing.lg),
                verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CapsuleLabel(text = sourceLabel(item.sourceType))
                        Spacer(modifier = Modifier.width(AppSpacing.sm))
                        Text(
                            text = timeAgo(item),
                            style = AppTypography.Caption.copy(color = MintColors.TextSecondary)
                        )
                    }
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(MintColors.White)
                            .border(1.dp, MintColors.MintPrimary.copy(alpha = 0.2f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = null,
                            tint = MintColors.MintPrimary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                Text(
                    text = item.title ?: stringResource(Res.string.common_untitled),
                    style = AppTypography.Body.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    ),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = item.summary ?: item.rawText,
                    style = AppTypography.BodySmall.copy(fontSize = 14.sp),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                if (item.tags.isNotEmpty()) {
                    Row(horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                        item.tags.take(3).forEach { tag ->
                            TagChip(text = "#${tag.name}")
                        }
                    }
                }

                DashedDivider(color = MintColors.MintPrimary.copy(alpha = 0.2f))

                Button(
                    onClick = onClick,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MintColors.White,
                        contentColor = MintColors.TextSecondary
                    ),
                    shape = RoundedCornerShape(10.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MintColors.Border),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = null,
                        tint = MintColors.TextSecondary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                    Text(
                        text = stringResource(Res.string.home_edit),
                        style = AppTypography.Caption.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                    )
                }
            }
        }
    }
}

@Composable
private fun CapsuleLabel(text: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(MintColors.MintPrimary)
            .border(1.dp, MintColors.MintPrimary.copy(alpha = 0.2f), RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 2.dp)
    ) {
        Text(
            text = text,
            style = AppTypography.Caption.copy(
                color = MintColors.White,
                fontWeight = FontWeight.Bold,
                fontSize = 10.sp,
                letterSpacing = 1.sp
            )
        )
    }
}

@Composable
private fun TagChip(text: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(MintColors.White)
            .border(1.dp, MintColors.Border, RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(
            text = text,
            style = AppTypography.Caption.copy(
                color = MintColors.TextSecondary,
                fontWeight = FontWeight.SemiBold,
                fontSize = 10.sp
            )
        )
    }
}

@Composable
private fun RecentCapturesSection(
    items: List<Item>,
    onViewAll: () -> Unit,
    onItemClick: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(Res.string.home_recent_captures),
                style = AppTypography.BodySmall.copy(
                    color = MintColors.TextSecondary,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp,
                    fontSize = 14.sp
                )
            )
            Text(
                text = stringResource(Res.string.home_view_all),
                style = AppTypography.Caption.copy(
                    color = MintColors.MintPrimary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp
                ),
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { onViewAll() }
                    .padding(horizontal = 4.dp, vertical = 2.dp)
            )
        }

        items.forEach { item ->
            RecentCaptureCard(item = item, onClick = { onItemClick(item.id) })
        }
    }
}

@Composable
private fun RecentCaptureCard(item: Item, onClick: () -> Unit) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MintColors.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .clickable { onClick() }
            .border(1.dp, MintColors.Border, RoundedCornerShape(16.dp))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.md),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(tagDotColor(item))
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                    Text(
                        text = item.tags.firstOrNull()?.name
                            ?: stringResource(Res.string.common_capture),
                        style = AppTypography.Caption.copy(
                            fontWeight = FontWeight.SemiBold,
                            color = MintColors.TextSecondary
                        )
                    )
                }
                Text(
                    text = timeAgo(item),
                    style = AppTypography.Caption.copy(color = Color(0xFF9CA3AF))
                )
            }

            if (item.sourceType == SourceType.ARTICLE) {
                Row(horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm), verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFF3F4F6)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Article,
                            contentDescription = null,
                            tint = Color(0xFF9CA3AF),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = item.title ?: stringResource(Res.string.common_untitled),
                            style = AppTypography.Body.copy(fontWeight = FontWeight.SemiBold),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = item.rawText,
                            style = AppTypography.Caption.copy(color = MintColors.TextSecondary),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            } else {
                Text(
                    text = item.title ?: stringResource(Res.string.common_untitled),
                    style = AppTypography.H3,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = item.summary ?: item.rawText,
                    style = AppTypography.BodySmall,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun DashedDivider(color: Color) {
    val strokeWidth = 1.dp
    val dashWidth = 6f
    val gapWidth = 6f
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(strokeWidth)
            .drawBehind {
                val strokePx = strokeWidth.toPx()
                drawLine(
                    color = color,
                    start = androidx.compose.ui.geometry.Offset(0f, strokePx / 2f),
                    end = androidx.compose.ui.geometry.Offset(size.width, strokePx / 2f),
                    strokeWidth = strokePx,
                    cap = StrokeCap.Round,
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(dashWidth, gapWidth), 0f)
                )
            }
    )
}

private fun tagDotColor(item: Item): Color {
    val tagColor = item.tags.firstOrNull()?.color?.trim().orEmpty()
    return parseHexColor(tagColor) ?: MintColors.MintPrimary
}

private fun parseHexColor(value: String): Color? {
    if (!value.startsWith("#")) return null
    val cleaned = value.removePrefix("#")
    val hex = when (cleaned.length) {
        6 -> "FF$cleaned"
        8 -> cleaned
        else -> return null
    }
    return runCatching { Color(hex.toLong(16)) }.getOrNull()
}

@Composable
private fun timeAgo(item: Item): String {
    val now = Clock.System.now().toEpochMilliseconds()
    val then = (item.confirmedAt ?: item.createdAt).toEpochMilliseconds()
    val diffMinutes = ((now - then) / 60000).toInt()
    return when {
        diffMinutes < 1 -> stringResource(Res.string.home_time_just_now)
        diffMinutes < 60 -> stringResource(Res.string.home_time_minutes_ago, diffMinutes)
        diffMinutes < 1440 -> stringResource(Res.string.home_time_hours_ago, diffMinutes / 60)
        else -> stringResource(Res.string.home_time_yesterday)
    }
}

@Composable
private fun sourceLabel(sourceType: SourceType?): String {
    return when (sourceType) {
        SourceType.ARTICLE -> stringResource(Res.string.source_article)
        SourceType.NOTE, null -> stringResource(Res.string.source_note)
    }
}
