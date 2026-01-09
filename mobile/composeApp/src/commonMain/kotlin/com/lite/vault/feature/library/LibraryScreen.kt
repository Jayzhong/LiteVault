package com.lite.vault.feature.library

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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.waitForUpOrCancellation
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.boundsInParent
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lite.vault.core.designsystem.theme.AppSpacing
import com.lite.vault.core.designsystem.theme.AppTypography
import com.lite.vault.core.designsystem.theme.MintColors
import com.lite.vault.domain.model.Item
import com.lite.vault.domain.model.SourceType
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import kotlin.time.Clock
import mobile.composeapp.generated.resources.Res
import mobile.composeapp.generated.resources.*
import org.jetbrains.compose.resources.stringResource

@Composable
fun LibraryScreen(
    onItemClick: (String) -> Unit,
    requestSearchFocusKey: Int = 0,
    viewModel: LibraryViewModel = rememberLibraryViewModel()
) {
    val state by viewModel.state.collectAsState()
    val focusRequester = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current
    var searchBounds by remember { mutableStateOf<Rect?>(null) }
    var handledFocusKey by remember { mutableStateOf(0) }
    LaunchedEffect(Unit) {
        viewModel.onIntent(LibraryIntent.Retry)
    }
    LaunchedEffect(requestSearchFocusKey) {
        if (requestSearchFocusKey > handledFocusKey) {
            handledFocusKey = requestSearchFocusKey
            focusRequester.requestFocus()
            keyboardController?.show()
        } else {
            focusManager.clearFocus()
            keyboardController?.hide()
        }
    }

    val timeZone = runCatching { TimeZone.of(state.timezoneId) }.getOrElse { TimeZone.currentSystemDefault() }
    val labels = LibraryLabels(
        today = stringResource(Res.string.library_group_today),
        yesterday = stringResource(Res.string.library_group_yesterday),
        thisWeek = stringResource(Res.string.library_group_week),
        thisMonth = stringResource(Res.string.library_group_month),
        older = stringResource(Res.string.library_group_older)
    )
    val groups = groupItems(state.items, timeZone, labels)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFFAFCFB))
            .verticalScroll(rememberScrollState())
            .pointerInput(searchBounds) {
                awaitEachGesture {
                    val down = awaitFirstDown(requireUnconsumed = false)
                    val bounds = searchBounds
                    if (bounds != null && !bounds.contains(down.position)) {
                        focusManager.clearFocus()
                        keyboardController?.hide()
                    }
                    waitForUpOrCancellation()
                }
            }
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(AppSpacing.lg)
    ) {
        Text(
            text = stringResource(Res.string.library_title),
            style = AppTypography.H1.copy(fontSize = 30.sp, fontWeight = FontWeight.Bold),
            modifier = Modifier.padding(start = 4.dp, top = 12.dp, bottom = 4.dp)
        )

        OutlinedTextField(
            value = state.query,
            onValueChange = { viewModel.onIntent(LibraryIntent.QueryChanged(it)) },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = null,
                    tint = Color(0xFF9CA3AF)
                )
            },
            placeholder = {
                Text(
                    text = stringResource(Res.string.library_search_placeholder),
                    style = AppTypography.BodySmall.copy(color = Color(0xFF9CA3AF))
                )
            },
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = MintColors.White,
                unfocusedContainerColor = Color(0xFFF3F4F6),
                focusedBorderColor = MintColors.MintPrimary.copy(alpha = 0.5f),
                unfocusedBorderColor = Color.Transparent,
                cursorColor = MintColors.MintDeep
            ),
            textStyle = AppTypography.Body.copy(fontWeight = FontWeight.Medium, fontSize = 14.sp),
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 4.dp)
                .focusRequester(focusRequester)
                .onGloballyPositioned { coordinates ->
                    searchBounds = coordinates.boundsInParent()
                }
        )

        if (state.isLoading || state.isSearching) {
            Text(text = stringResource(Res.string.common_loading), style = AppTypography.Caption)
        } else if (state.errorMessage != null) {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                Text(
                    text = stringResource(Res.string.library_error),
                    style = AppTypography.Body
                )
                Button(
                    onClick = { viewModel.onIntent(LibraryIntent.Retry) },
                    colors = ButtonDefaults.buttonColors(containerColor = MintColors.MintTint)
                ) {
                    Text(
                        text = stringResource(Res.string.common_retry),
                        style = AppTypography.Caption.copy(color = MintColors.DarkAnchor)
                    )
                }
            }
        } else {
            groups.forEach { group ->
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
                    SectionHeader(title = group.title)
                    group.items.forEach { item ->
                        LibraryItemCard(item, onClick = { onItemClick(item.id) })
                    }
                }
            }

            if (groups.isEmpty()) {
                Text(
                    text = stringResource(Res.string.library_empty),
                    style = AppTypography.BodySmall
                )
            }
        }

        Spacer(modifier = Modifier.height(AppSpacing.lg))
        Text(
            text = stringResource(Res.string.library_end),
            style = AppTypography.Caption.copy(
                letterSpacing = 1.4.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFFD1D5DB),
                fontSize = 10.sp
            ),
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
        Spacer(modifier = Modifier.height(AppSpacing.xl))
    }
}

private data class LibraryGroup(val title: String, val items: List<Item>)

private data class LibraryLabels(
    val today: String,
    val yesterday: String,
    val thisWeek: String,
    val thisMonth: String,
    val older: String
)

private fun groupItems(items: List<Item>, timeZone: TimeZone, labels: LibraryLabels): List<LibraryGroup> {
    if (items.isEmpty()) return emptyList()
    val nowDate = Clock.System.now().toLocalDateTime(timeZone).date

    val today = mutableListOf<Item>()
    val yesterday = mutableListOf<Item>()
    val thisWeek = mutableListOf<Item>()
    val thisMonth = mutableListOf<Item>()
    val older = mutableListOf<Item>()

    items.forEach { item ->
        val date = (item.confirmedAt ?: item.createdAt).toLocalDateTime(timeZone).date
        val dayDiff = nowDate.toEpochDays() - date.toEpochDays()
        when {
            dayDiff == 0L -> today.add(item)
            dayDiff == 1L -> yesterday.add(item)
            dayDiff in 2L..6L -> thisWeek.add(item)
            nowDate.year == date.year && nowDate.month == date.month -> thisMonth.add(item)
            else -> older.add(item)
        }
    }

    val groups = mutableListOf<LibraryGroup>()
    if (today.isNotEmpty()) groups.add(LibraryGroup(labels.today, today))
    if (yesterday.isNotEmpty()) groups.add(LibraryGroup(labels.yesterday, yesterday))
    if (thisWeek.isNotEmpty()) groups.add(LibraryGroup(labels.thisWeek, thisWeek))
    if (thisMonth.isNotEmpty()) groups.add(LibraryGroup(labels.thisMonth, thisMonth))
    if (older.isNotEmpty()) groups.add(LibraryGroup(labels.older, older))
    return groups
}

@Composable
private fun SectionHeader(title: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
    ) {
        Text(
            text = title,
            style = AppTypography.BodySmall.copy(
                color = Color(0xFF0D9488),
                letterSpacing = 1.6.sp,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp
            )
        )
        Divider(color = Color(0xFF0D9488).copy(alpha = 0.2f), modifier = Modifier.weight(1f))
    }
}

@Composable
private fun LibraryItemCard(item: Item, onClick: () -> Unit) {
    val shape = RoundedCornerShape(16.dp)
    Card(
        shape = shape,
        colors = CardDefaults.cardColors(containerColor = MintColors.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .clickable { onClick() }
            .border(1.dp, MintColors.Border, shape)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.md),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(tagDotColor(item))
                )
                Text(
                    text = item.tags.firstOrNull()?.name?.uppercase()
                        ?: sourceLabel(item.sourceType),
                    style = AppTypography.Caption.copy(
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF78716C),
                        letterSpacing = 1.sp
                    )
                )
            }

            if (item.sourceType == SourceType.ARTICLE) {
                Row(horizontalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFF3F4F6))
                            .border(1.dp, Color(0xFFE5E7EB), RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Code,
                            contentDescription = null,
                            tint = Color(0xFF60A5FA),
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = item.title ?: stringResource(Res.string.common_untitled),
                            style = AppTypography.Body.copy(
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = MintColors.DarkAnchor
                            ),
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = item.summary ?: item.rawText,
                            style = AppTypography.BodySmall.copy(
                                fontSize = 14.sp,
                                color = Color(0xFF78716C)
                            ),
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            } else {
                Text(
                    text = item.title ?: stringResource(Res.string.common_untitled),
                    style = AppTypography.Body.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = MintColors.DarkAnchor
                    ),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = item.summary ?: item.rawText,
                    style = AppTypography.BodySmall.copy(
                        fontSize = 14.sp,
                        color = Color(0xFF78716C)
                    ),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                item.tags.take(3).forEach { tag ->
                    TagChip(text = "#${tag.name}")
                }
                if (item.sourceType == SourceType.ARTICLE) {
                    TagChip(text = stringResource(Res.string.library_read_time, 5))
                }
            }
        }
    }
}

@Composable
private fun TagChip(text: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(Color(0xFFF9FAFB))
            .border(1.dp, Color(0xFFF3F4F6), RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(
            text = text,
            style = AppTypography.Caption.copy(
                color = Color(0xFF78716C),
                fontWeight = FontWeight.Medium,
                fontSize = 10.sp
            )
        )
    }
}

@Composable
private fun sourceLabel(sourceType: SourceType?): String {
    return when (sourceType) {
        SourceType.ARTICLE -> stringResource(Res.string.source_article)
        SourceType.NOTE -> stringResource(Res.string.source_note)
        null -> stringResource(Res.string.common_capture)
    }
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
