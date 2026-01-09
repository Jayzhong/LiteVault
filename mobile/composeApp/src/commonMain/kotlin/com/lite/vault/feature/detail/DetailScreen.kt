package com.lite.vault.feature.detail

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.layout
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.lite.vault.core.logging.AppLog
import com.lite.vault.core.designsystem.components.AppButton
import com.lite.vault.core.designsystem.components.AppButtonVariant
import com.lite.vault.core.designsystem.components.AppDialog
import com.lite.vault.core.designsystem.theme.AppSpacing
import com.lite.vault.core.designsystem.theme.AppTypography
import com.lite.vault.core.designsystem.theme.MintColors
import com.lite.vault.domain.model.Item
import com.lite.vault.domain.model.ItemStatus
import com.lite.vault.domain.model.SuggestedTag
import com.lite.vault.domain.model.SuggestedTagStatus
import com.lite.vault.domain.model.Tag
import kotlinx.datetime.Instant
import kotlinx.datetime.Month
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import mobile.composeapp.generated.resources.Res
import mobile.composeapp.generated.resources.*
import org.jetbrains.compose.resources.stringResource

@Composable
fun DetailScreen(
    itemId: String,
    onBack: () -> Unit,
    viewModel: DetailViewModel = rememberDetailViewModel()
) {
    val state by viewModel.state.collectAsState()
    val item = state.item
    var menuExpanded by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }

    LaunchedEffect(itemId) {
        viewModel.load(itemId, resetEditing = true)
    }
    LaunchedEffect(item, state.isEditing, state.isUpdating, state.isLoading) {
        if (item != null) {
            val tagDetails = item.tags.joinToString(prefix = "[", postfix = "]") { tag ->
                "${tag.name}:${tag.color}"
            }
            val suggestedDetails = item.suggestedTags.joinToString(prefix = "[", postfix = "]") { tag ->
                "${tag.name}:${tag.status}${tag.confidence?.let { ":$it" } ?: ""}"
            }
            AppLog.debug(
                "DetailScreen",
                "render itemId=${item.id} status=${item.status} " +
                    "titleLen=${item.title?.length ?: 0} summaryLen=${item.summary?.length ?: 0} " +
                    "rawTextLen=${item.rawText.length} tags=${item.tags.size} " +
                    "suggested=${item.suggestedTags.size} editing=${state.isEditing} updating=${state.isUpdating} " +
                    "tagDetails=$tagDetails suggestedDetails=$suggestedDetails " +
                    "tagInputs=${state.tagInputs.joinToString(prefix = "[", postfix = "]")}"
            )
        } else if (state.isLoading) {
            AppLog.debug("DetailScreen", "render loading itemId=$itemId")
        }
    }
    LaunchedEffect(state.isDeleted) {
        if (state.isDeleted) {
            onBack()
        }
    }

    Scaffold(
        containerColor = MintColors.White,
        bottomBar = {
            if (item != null && !state.isLoading) {
                DetailBottomBar(
                    item = item,
                    isEditing = state.isEditing,
                    isUpdating = state.isUpdating,
                    onConfirm = { viewModel.onIntent(DetailIntent.ConfirmChanges) },
                    onEdit = { viewModel.onIntent(DetailIntent.EditClicked) },
                    onCancel = { viewModel.onIntent(DetailIntent.CancelEdit) }
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MintColors.White)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = AppSpacing.xl, vertical = AppSpacing.lg)
                .padding(bottom = paddingValues.calculateBottomPadding() + AppSpacing.lg),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.lg)
        ) {
            DetailTopBar(
                onBack = onBack,
                menuExpanded = menuExpanded,
                onMenuClick = { menuExpanded = true },
                onMenuDismiss = { menuExpanded = false },
                onDeleteClick = {
                    menuExpanded = false
                    showDeleteDialog = true
                }
            )

            when {
                state.isLoading -> {
                    Text(
                        text = stringResource(Res.string.common_loading),
                        style = AppTypography.BodySmall
                    )
                }
                state.errorMessage != null -> {
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
                        Text(
                            text = state.errorMessage ?: stringResource(Res.string.error_network_message),
                            style = AppTypography.BodySmall
                        )
                        OutlinedButton(
                            onClick = { viewModel.onIntent(DetailIntent.Retry) },
                            border = BorderStroke(1.dp, MintColors.Border)
                        ) {
                            Text(
                                text = stringResource(Res.string.common_retry),
                                style = AppTypography.Caption.copy(color = MintColors.DarkAnchor)
                            )
                        }
                    }
                }
                item != null -> {
                    DetailContent(
                        item = item,
                        state = state,
                        onIntent = viewModel::onIntent
                    )
                }
            }
        }
    }

    if (showDeleteDialog) {
        AppDialog(
            title = stringResource(Res.string.detail_delete_title),
            message = stringResource(Res.string.detail_delete_message),
            onDismiss = { if (!state.isUpdating) showDeleteDialog = false },
            icon = {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(MintColors.Error.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = null,
                        tint = MintColors.Error,
                        modifier = Modifier.size(22.dp)
                    )
                }
            },
            actionButton = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    AppButton(
                        text = stringResource(Res.string.item_detail_cancel),
                        onClick = { showDeleteDialog = false },
                        variant = AppButtonVariant.SECONDARY,
                        enabled = !state.isUpdating,
                        modifier = Modifier.weight(1f)
                    )
                    Button(
                        onClick = {
                            showDeleteDialog = false
                            viewModel.onIntent(DetailIntent.DeleteConfirmed)
                        },
                        enabled = !state.isUpdating,
                        shape = RoundedCornerShape(50),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MintColors.Error,
                            contentColor = MintColors.White,
                            disabledContainerColor = MintColors.Border,
                            disabledContentColor = MintColors.TextSecondary
                        ),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = stringResource(Res.string.detail_delete_confirm),
                            style = AppTypography.Button
                        )
                    }
                }
            }
        )
    }

    if (state.isTagEditorOpen && item != null) {
        TagEditorDialog(
            state = state,
            item = item,
            onIntent = viewModel::onIntent
        )
    }
}

@Composable
private fun DetailTopBar(
    onBack: () -> Unit,
    menuExpanded: Boolean,
    onMenuClick: () -> Unit,
    onMenuDismiss: () -> Unit,
    onDeleteClick: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBack) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = null,
                tint = MintColors.DarkAnchor
            )
        }
        Box {
            IconButton(onClick = onMenuClick) {
                Icon(
                    imageVector = Icons.Default.MoreHoriz,
                    contentDescription = null,
                    tint = MintColors.DarkAnchor
                )
            }
            DropdownMenu(
                expanded = menuExpanded,
                onDismissRequest = onMenuDismiss
            ) {
                DropdownMenuItem(
                    text = { Text(text = stringResource(Res.string.detail_menu_delete)) },
                    onClick = onDeleteClick,
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = null,
                            tint = MintColors.Error
                        )
                    }
                )
            }
        }
    }
}

@Composable
private fun DetailContent(
    item: Item,
    state: DetailState,
    onIntent: (DetailIntent) -> Unit
) {
    val timeZone = TimeZone.currentSystemDefault()
    val displayDate = detailDateLabel(item.createdAt, timeZone)
    val isEditable = state.isEditing || item.status == ItemStatus.READY_TO_CONFIRM

    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.lg)) {
        Text(
            text = displayDate,
            style = AppTypography.Caption.copy(color = MintColors.TextSecondary)
        )
        if (isEditable) {
            BasicTextField(
                value = state.titleInput,
                onValueChange = { onIntent(DetailIntent.TitleChanged(it)) },
                textStyle = AppTypography.H1,
                modifier = Modifier.fillMaxWidth(),
                enabled = !state.isUpdating,
                decorationBox = { innerTextField ->
                    if (state.titleInput.isBlank()) {
                        Text(
                            text = stringResource(Res.string.common_untitled),
                            style = AppTypography.H1.copy(color = MintColors.TextSecondary)
                        )
                    }
                    innerTextField()
                }
            )
        } else {
            Text(
                text = item.title ?: stringResource(Res.string.common_untitled),
                style = AppTypography.H1,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
        }

        SummaryCard(
            text = if (isEditable) state.summaryInput else item.summary ?: item.rawText,
            isEditable = isEditable,
            showEditingPill = state.isEditing,
            isUpdating = state.isUpdating,
            onTextChanged = { onIntent(DetailIntent.SummaryChanged(it)) }
        )

        TagsSection(
            item = item,
            state = state,
            isEditable = isEditable,
            onIntent = onIntent
        )

        HorizontalDivider(color = MintColors.Border)

        OriginalContentSection(
            item = item,
            state = state,
            isEditable = isEditable,
            onIntent = onIntent
        )

        Spacer(modifier = Modifier.height(AppSpacing.lg))
    }
}

@Composable
private fun SummaryCard(
    text: String,
    isEditable: Boolean,
    showEditingPill: Boolean,
    isUpdating: Boolean,
    onTextChanged: (String) -> Unit
) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MintColors.MintTint),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.horizontalGradient(
                        listOf(MintColors.MintTint, MintColors.White)
                    )
                )
                .padding(AppSpacing.lg),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.AutoAwesome,
                        contentDescription = null,
                        tint = MintColors.MintPrimary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                    Text(
                        text = stringResource(Res.string.item_detail_ai_summary),
                        style = AppTypography.Label.copy(
                            color = MintColors.MintDeep,
                            letterSpacing = 1.sp
                        )
                    )
                }
                if (showEditingPill) {
                    EditingPill()
                }
            }

            if (isEditable) {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MintColors.White),
                    border = BorderStroke(1.dp, MintColors.Border)
                ) {
                    BasicTextField(
                        value = text,
                        onValueChange = onTextChanged,
                        textStyle = AppTypography.Body.copy(color = MintColors.DarkAnchor),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(AppSpacing.md),
                        enabled = !isUpdating
                    )
                }
            } else {
                Text(
                    text = text,
                    style = AppTypography.Body
                )
            }
        }
    }
}

@Composable
private fun EditingPill() {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(MintColors.White)
            .border(1.dp, MintColors.MintPrimary.copy(alpha = 0.3f), RoundedCornerShape(50))
            .padding(horizontal = 12.dp, vertical = 4.dp)
    ) {
        Text(
            text = stringResource(Res.string.item_detail_editing),
            style = AppTypography.Caption.copy(color = MintColors.MintDeep, fontWeight = FontWeight.SemiBold)
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TagsSection(
    item: Item,
    state: DetailState,
    isEditable: Boolean,
    onIntent: (DetailIntent) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
        Text(
            text = stringResource(Res.string.item_detail_tags),
            style = AppTypography.Label.copy(letterSpacing = 1.2.sp)
        )

        val tagColorMap = if (isEditable) {
            buildTagColorMap(
                item.tags,
                item.suggestedTags.filter { it.status == SuggestedTagStatus.PENDING }
            )
        } else {
            emptyMap()
        }

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            if (isEditable) {
                state.tagInputs.forEach { tagName ->
                    val dotColor = tagColorMap[normalizeTagKey(tagName)] ?: MintColors.MintPrimary
                    TagEditorChip(
                        label = tagName,
                        dotColor = dotColor,
                        onRemove = { onIntent(DetailIntent.RemoveTag(tagName)) }
                    )
                }
                AddTagsChip(onClick = { onIntent(DetailIntent.OpenTagEditor) })
            } else {
                val displayTags = detailTags(item)
                if (displayTags.isEmpty()) {
                    AddTagsChip(onClick = { onIntent(DetailIntent.OpenTagEditor) })
                } else {
                    displayTags.forEach { tag ->
                        TagChip(label = tag.name, color = tag.color)
                    }
                }
            }
        }
    }
}

@Composable
private fun TagChip(label: String, color: Color) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .border(1.dp, MintColors.Border, RoundedCornerShape(50))
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(color)
        )
        Text(
            text = label,
            style = AppTypography.Caption.copy(color = MintColors.DarkAnchor)
        )
    }
}

@Composable
private fun AddTagsChip(onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .dashedBorder(1.dp, MintColors.Border, 16.dp)
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
    ) {
        Icon(
            imageVector = Icons.Default.Add,
            contentDescription = null,
            tint = MintColors.TextSecondary,
            modifier = Modifier.size(14.dp)
        )
        Text(
            text = stringResource(Res.string.item_detail_add_tags),
            style = AppTypography.Caption.copy(color = MintColors.TextSecondary)
        )
    }
}

@Composable
private fun TagEditorDialog(
    state: DetailState,
    item: Item,
    onIntent: (DetailIntent) -> Unit
) {
    val selectedTagKeys = state.tagEditorTags.map { it.trim().lowercase() }.toSet()
    val pendingSuggestions = item.suggestedTags.filter { it.status == SuggestedTagStatus.PENDING }
    val suggestedTags = pendingSuggestions.filterNot {
        selectedTagKeys.contains(it.name.trim().lowercase())
    }
    val tagColorMap = buildTagColorMap(item.tags, pendingSuggestions)
    val canAdd = state.tagEditorInput.trim().isNotEmpty()

    Dialog(
        onDismissRequest = { onIntent(DetailIntent.CloseTagEditor) },
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MintColors.Scrim),
            contentAlignment = Alignment.Center
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = AppSpacing.lg),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MintColors.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 12.dp)
            ) {
                Column {
                    Column(
                        modifier = Modifier.padding(horizontal = AppSpacing.lg, vertical = AppSpacing.lg),
                        verticalArrangement = Arrangement.spacedBy(AppSpacing.lg)
                    ) {
                        Text(
                            text = stringResource(Res.string.item_detail_edit_tags),
                            style = AppTypography.H2
                        )

                        TagEditorInputField(
                            value = state.tagEditorInput,
                            canAdd = canAdd,
                            onValueChange = { onIntent(DetailIntent.TagEditorInputChanged(it)) },
                            onAdd = { onIntent(DetailIntent.TagEditorAddTag) }
                        )

                        if (suggestedTags.isNotEmpty()) {
                            SuggestedTagsSection(
                                suggestedTags = suggestedTags,
                                onAddSuggested = { onIntent(DetailIntent.TagEditorAddSuggested(it)) }
                            )
                        }

                        HorizontalDivider(color = MintColors.Border.copy(alpha = 0.6f))

                        TagEditorSelectedSection(
                            tags = state.tagEditorTags,
                            tagColorMap = tagColorMap,
                            onRemove = { onIntent(DetailIntent.TagEditorRemoveTag(it)) }
                        )
                    }

                    HorizontalDivider(color = MintColors.Border.copy(alpha = 0.6f))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = AppSpacing.lg, vertical = AppSpacing.md),
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.md)
                    ) {
                        OutlinedButton(
                            onClick = { onIntent(DetailIntent.CloseTagEditor) },
                            border = BorderStroke(1.dp, MintColors.Border),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(
                                text = stringResource(Res.string.item_detail_cancel),
                                style = AppTypography.Button.copy(color = MintColors.TextSecondary)
                            )
                        }
                        Button(
                            onClick = { onIntent(DetailIntent.SaveTagEditor) },
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MintColors.MintPrimary,
                                contentColor = MintColors.White
                            ),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(
                                text = stringResource(Res.string.item_detail_save_tags),
                                style = AppTypography.Button
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TagEditorInputField(
    value: String,
    canAdd: Boolean,
    onValueChange: (String) -> Unit,
    onAdd: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MintColors.LightSurface)
            .border(1.dp, MintColors.Border, RoundedCornerShape(16.dp))
            .padding(horizontal = AppSpacing.md, vertical = AppSpacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
    ) {
        Icon(
            imageVector = Icons.Default.LocalOffer,
            contentDescription = null,
            tint = MintColors.TextSecondary,
            modifier = Modifier.size(18.dp)
        )
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            textStyle = AppTypography.Body.copy(color = MintColors.DarkAnchor),
            modifier = Modifier.weight(1f),
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { if (canAdd) onAdd() }),
            decorationBox = { innerTextField ->
                if (value.isBlank()) {
                    Text(
                        text = stringResource(Res.string.item_detail_add_tag_placeholder),
                        style = AppTypography.Body.copy(color = MintColors.TextSecondary)
                    )
                }
                innerTextField()
            }
        )
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
                .background(if (canAdd) MintColors.MintPrimary else MintColors.Border)
                .clickable(enabled = canAdd) { onAdd() },
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = stringResource(Res.string.item_detail_add_tag_action),
                tint = MintColors.White,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SuggestedTagsSection(
    suggestedTags: List<SuggestedTag>,
    onAddSuggested: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
        Text(
            text = stringResource(Res.string.item_detail_suggested_tags),
            style = AppTypography.Label.copy(letterSpacing = 1.1.sp)
        )
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            suggestedTags.forEachIndexed { index, tag ->
                SuggestedTagChip(
                    label = tag.name,
                    dotColor = suggestedTagColors[index % suggestedTagColors.size],
                    onClick = { onAddSuggested(tag.name) }
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TagEditorSelectedSection(
    tags: List<String>,
    tagColorMap: Map<String, Color>,
    onRemove: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(Res.string.item_detail_your_tags),
                style = AppTypography.Label.copy(letterSpacing = 1.1.sp)
            )
            TagCountPill(count = tags.size)
        }
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            tags.forEach { tag ->
                val normalized = normalizeTagKey(tag)
                val dotColor = tagColorMap[normalized] ?: MintColors.MintPrimary
                TagEditorChip(label = tag, dotColor = dotColor, onRemove = { onRemove(tag) })
            }
        }
    }
}

@Composable
private fun SuggestedTagChip(
    label: String,
    dotColor: Color,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, MintColors.Border, RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(dotColor)
        )
        Text(
            text = label,
            style = AppTypography.Caption.copy(color = MintColors.TextSecondary)
        )
        Icon(
            imageVector = Icons.Default.Add,
            contentDescription = null,
            tint = MintColors.TextSecondary,
            modifier = Modifier.size(14.dp)
        )
    }
}

@Composable
private fun TagEditorChip(label: String, dotColor: Color, onRemove: () -> Unit) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .border(1.dp, MintColors.Border, RoundedCornerShape(50))
            .background(MintColors.White)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
    ) {
        if (!label.trim().startsWith("#")) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(dotColor)
            )
        }
        Text(
            text = label,
            style = AppTypography.Caption.copy(color = MintColors.DarkAnchor)
        )
        Icon(
            imageVector = Icons.Default.Close,
            contentDescription = null,
            tint = MintColors.TextSecondary,
            modifier = Modifier
                .size(14.dp)
                .clickable { onRemove() }
        )
    }
}

@Composable
private fun TagCountPill(count: Int) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(MintColors.MintTint)
            .border(1.dp, MintColors.MintPrimary.copy(alpha = 0.2f), RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 4.dp)
    ) {
        Text(
            text = stringResource(Res.string.item_detail_active_tags, count),
            style = AppTypography.Label.copy(color = MintColors.MintDeep, fontWeight = FontWeight.SemiBold)
        )
    }
}

private val suggestedTagColors = listOf(
    MintColors.MintPrimary,
    Color(0xFF3B82F6),
    Color(0xFFA855F7),
    Color(0xFFF97316)
)

private fun buildTagColorMap(tags: List<Tag>, suggestedTags: List<SuggestedTag>): Map<String, Color> {
    val map = mutableMapOf<String, Color>()
    tags.forEach { tag ->
        val key = normalizeTagKey(tag.name)
        val color = parseHexColor(tag.color) ?: MintColors.MintPrimary
        map[key] = color
    }
    suggestedTags.forEachIndexed { index, tag ->
        val key = normalizeTagKey(tag.name)
        if (!map.containsKey(key)) {
            map[key] = suggestedTagColors[index % suggestedTagColors.size]
        }
    }
    return map
}

private fun normalizeTagKey(value: String): String = value.trim().lowercase()

private fun parseHexColor(value: String?): Color? {
    val raw = value?.trim().orEmpty()
    if (!raw.startsWith("#")) return null
    val cleaned = raw.removePrefix("#")
    val hex = when (cleaned.length) {
        6 -> "FF$cleaned"
        8 -> cleaned
        else -> return null
    }
    return runCatching { Color(hex.toLong(16)) }.getOrNull()
}

private fun Modifier.dashedBorder(
    strokeWidth: Dp,
    color: Color,
    cornerRadius: Dp,
    intervals: FloatArray = floatArrayOf(8f, 8f)
): Modifier = drawBehind {
    val stroke = Stroke(
        width = strokeWidth.toPx(),
        pathEffect = PathEffect.dashPathEffect(intervals, 0f)
    )
    val radius = cornerRadius.toPx()
    drawRoundRect(
        color = color,
        cornerRadius = CornerRadius(radius, radius),
        style = stroke
    )
}

@Composable
private fun OriginalContentSection(
    item: Item,
    state: DetailState,
    isEditable: Boolean,
    onIntent: (DetailIntent) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(Res.string.item_detail_original_content),
                style = AppTypography.H3
            )
            RawTextPill()
        }

        if (isEditable) {
            Card(
                shape = RoundedCornerShape(18.dp),
                border = BorderStroke(1.dp, MintColors.Border),
                colors = CardDefaults.cardColors(containerColor = MintColors.White)
            ) {
                BasicTextField(
                    value = state.originalTextInput,
                    onValueChange = { onIntent(DetailIntent.OriginalTextChanged(it)) },
                    textStyle = AppTypography.Body.copy(color = MintColors.DarkAnchor),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(AppSpacing.md)
                        .height(180.dp),
                    enabled = !state.isUpdating
                )
            }
            Text(
                text = stringResource(
                    Res.string.item_detail_character_count,
                    state.originalTextInput.length
                ),
                style = AppTypography.Caption.copy(color = MintColors.TextSecondary),
                modifier = Modifier.align(Alignment.End)
            )
    } else {
            var showReadMore by remember(item.id, item.rawText) { mutableStateOf(false) }
            Text(
                text = item.rawText,
                style = AppTypography.BodySmall.copy(color = MintColors.TextSecondary),
                maxLines = Int.MAX_VALUE,
                onTextLayout = { layoutResult ->
                    val shouldShow = layoutResult.lineCount > 6
                    if (showReadMore != shouldShow) {
                        showReadMore = shouldShow
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .layout { measurable, constraints ->
                        measurable.measure(constraints)
                        layout(0, 0) {}
                    }
            )
            Text(
                text = item.rawText,
                style = AppTypography.BodySmall.copy(color = MintColors.TextSecondary),
                maxLines = if (state.isFullText || !showReadMore) Int.MAX_VALUE else 6,
                overflow = TextOverflow.Ellipsis
            )
            if (showReadMore) {
                ReadMoreRow(
                    isExpanded = state.isFullText,
                    onClick = { onIntent(DetailIntent.ToggleFullText) }
                )
            }
        }
    }
}

@Composable
private fun RawTextPill() {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(MintColors.LightSurface)
            .border(1.dp, MintColors.Border, RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 4.dp)
    ) {
        Text(
            text = stringResource(Res.string.item_detail_raw_text),
            style = AppTypography.Label.copy(color = MintColors.TextSecondary)
        )
    }
}

@Composable
private fun ReadMoreRow(isExpanded: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = AppSpacing.xs),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = stringResource(
                if (isExpanded) Res.string.item_detail_read_less else Res.string.item_detail_read_more
            ),
            style = AppTypography.Caption.copy(color = MintColors.TextSecondary, fontWeight = FontWeight.SemiBold)
        )
        Icon(
            imageVector = if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
            contentDescription = null,
            tint = MintColors.TextSecondary
        )
    }
}

@Composable
private fun DetailBottomBar(
    item: Item,
    isEditing: Boolean,
    isUpdating: Boolean,
    onConfirm: () -> Unit,
    onEdit: () -> Unit,
    onCancel: () -> Unit
) {
    val isReadyToConfirm = item.status == ItemStatus.READY_TO_CONFIRM
    val isArchived = item.status == ItemStatus.ARCHIVED

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(MintColors.White)
            .padding(horizontal = AppSpacing.xl, vertical = AppSpacing.lg)
    ) {
        when {
            isReadyToConfirm -> {
                Button(
                    onClick = onConfirm,
                    enabled = !isUpdating,
                    shape = RoundedCornerShape(50),
                    colors = ButtonDefaults.buttonColors(containerColor = MintColors.MintPrimary),
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 56.dp),
                    contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = null,
                        tint = Color.White
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                    Text(
                        text = if (isUpdating) {
                            stringResource(Res.string.item_detail_saving)
                        } else {
                            stringResource(Res.string.item_detail_confirm_changes)
                        },
                        style = AppTypography.Button
                    )
                }
            }
            isArchived && isEditing -> {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.md)
                ) {
                    OutlinedButton(
                        onClick = onCancel,
                        enabled = !isUpdating,
                        border = BorderStroke(1.dp, MintColors.Border),
                        shape = RoundedCornerShape(50),
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 56.dp),
                        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp)
                    ) {
                        Text(
                            text = stringResource(Res.string.item_detail_cancel),
                            style = AppTypography.Button.copy(color = MintColors.DarkAnchor)
                        )
                    }
                    Button(
                        onClick = onConfirm,
                        enabled = !isUpdating,
                        shape = RoundedCornerShape(50),
                        colors = ButtonDefaults.buttonColors(containerColor = MintColors.MintPrimary),
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 56.dp),
                        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            tint = Color.White
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.sm))
                        Text(
                            text = if (isUpdating) {
                                stringResource(Res.string.item_detail_saving)
                            } else {
                                stringResource(Res.string.item_detail_confirm_changes)
                            },
                            style = AppTypography.Button
                        )
                    }
                }
            }
            isArchived -> {
                OutlinedButton(
                    onClick = onEdit,
                    enabled = !isUpdating,
                    border = BorderStroke(1.dp, MintColors.Border),
                    shape = RoundedCornerShape(50),
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 56.dp),
                    contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MintColors.DarkAnchor)
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = null,
                        tint = MintColors.DarkAnchor
                    )
                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                    Text(
                        text = stringResource(Res.string.item_detail_edit_content),
                        style = AppTypography.Button.copy(color = MintColors.DarkAnchor)
                    )
                }
            }
        }
    }
}

private data class DetailTag(val name: String, val color: Color)

private fun detailTags(item: Item): List<DetailTag> {
    return if (item.tags.isNotEmpty()) {
        item.tags.map { tag ->
            DetailTag(tag.name, parseTagColor(tag))
        }
    } else {
        item.suggestedTags.map { tag ->
            DetailTag(tag.name, MintColors.MintPrimary)
        }
    }
}

private fun parseTagColor(tag: Tag): Color {
    val hex = tag.color.trim().removePrefix("#")
    val fallback = MintColors.MintPrimary
    val value = runCatching { hex.toLong(16) }.getOrNull() ?: return fallback
    val argb = when (hex.length) {
        6 -> 0xFF000000 or value
        8 -> value
        else -> return fallback
    }
    return Color(argb.toInt())
}

@Composable
private fun detailDateLabel(instant: Instant, timeZone: TimeZone): String {
    val dateTime = instant.toLocalDateTime(timeZone)
    val monthLabel = when (dateTime.month) {
        Month.JANUARY -> stringResource(Res.string.month_jan)
        Month.FEBRUARY -> stringResource(Res.string.month_feb)
        Month.MARCH -> stringResource(Res.string.month_mar)
        Month.APRIL -> stringResource(Res.string.month_apr)
        Month.MAY -> stringResource(Res.string.month_may)
        Month.JUNE -> stringResource(Res.string.month_jun)
        Month.JULY -> stringResource(Res.string.month_jul)
        Month.AUGUST -> stringResource(Res.string.month_aug)
        Month.SEPTEMBER -> stringResource(Res.string.month_sep)
        Month.OCTOBER -> stringResource(Res.string.month_oct)
        Month.NOVEMBER -> stringResource(Res.string.month_nov)
        Month.DECEMBER -> stringResource(Res.string.month_dec)
    }
    val hour24 = dateTime.hour
    val hour12 = when {
        hour24 == 0 -> 12
        hour24 > 12 -> hour24 - 12
        else -> hour24
    }
    val minute = dateTime.minute.toString().padStart(2, '0')
    val period = if (hour24 < 12) {
        stringResource(Res.string.time_am)
    } else {
        stringResource(Res.string.time_pm)
    }
    return stringResource(
        Res.string.item_detail_date_format,
        monthLabel,
        dateTime.day,
        hour12,
        minute,
        period
    )
}
