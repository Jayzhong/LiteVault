package com.lite.vault.feature.detail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lite.vault.core.logging.AppLog
import com.lite.vault.core.network.ApiResult
import com.lite.vault.domain.model.Item
import com.lite.vault.domain.model.ItemStatus
import com.lite.vault.domain.model.SuggestedTagStatus
import com.lite.vault.domain.model.Tag
import com.lite.vault.domain.usecase.ConfirmItemUseCase
import com.lite.vault.domain.usecase.DiscardItemUseCase
import com.lite.vault.domain.usecase.GetItemUseCase
import com.lite.vault.domain.usecase.UpdateItemUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.time.Clock

class DetailViewModel(
    private val getItemUseCase: GetItemUseCase,
    private val confirmItemUseCase: ConfirmItemUseCase,
    private val discardItemUseCase: DiscardItemUseCase,
    private val updateItemUseCase: UpdateItemUseCase
) : ViewModel() {

    private val _state = MutableStateFlow(DetailState())
    val state: StateFlow<DetailState> = _state.asStateFlow()

    fun load(itemId: String, resetEditing: Boolean = false) {
        if (itemId.isBlank()) return
        viewModelScope.launch {
            AppLog.debug("DetailViewModel", "load itemId=$itemId")
            _state.update {
                it.copy(
                    itemId = itemId,
                    isLoading = true,
                    errorMessage = null,
                    isDeleted = false,
                    refreshTick = 0
                )
            }
            when (val result = getItemUseCase(itemId)) {
                is ApiResult.Success -> {
                    applyItem(result.data, resetEditing = resetEditing)
                }
                is ApiResult.Error -> {
                    AppLog.warn("DetailViewModel", "load failed: ${result.message}")
                    _state.update { it.copy(isLoading = false, errorMessage = result.message) }
                }
            }
        }
    }

    fun onIntent(intent: DetailIntent) {
        when (intent) {
            DetailIntent.Retry -> load(_state.value.itemId, resetEditing = true)
            DetailIntent.EditClicked -> enterEditMode()
            DetailIntent.CancelEdit -> cancelEdit()
            DetailIntent.ConfirmChanges -> confirmChanges()
            DetailIntent.DeleteConfirmed -> discardItem()
            DetailIntent.ToggleFullText -> _state.update { it.copy(isFullText = !it.isFullText) }
            is DetailIntent.TitleChanged -> _state.update { it.copy(titleInput = intent.value) }
            is DetailIntent.SummaryChanged -> _state.update { it.copy(summaryInput = intent.value) }
            is DetailIntent.OriginalTextChanged -> _state.update { it.copy(originalTextInput = intent.value) }
            is DetailIntent.RemoveTag -> removeTagFromInputs(intent.value)
            DetailIntent.OpenTagEditor -> openTagEditor()
            DetailIntent.CloseTagEditor -> closeTagEditor()
            DetailIntent.SaveTagEditor -> saveTagEditor()
            is DetailIntent.TagEditorInputChanged -> _state.update { it.copy(tagEditorInput = intent.value) }
            DetailIntent.TagEditorAddTag -> addTagFromEditor()
            is DetailIntent.TagEditorRemoveTag -> removeTagFromEditor(intent.value)
            is DetailIntent.TagEditorAddSuggested -> addSuggestedTag(intent.value)
        }
    }

    private fun applyItem(item: Item, resetEditing: Boolean) {
        _state.update { current ->
            val shouldResetInputs = resetEditing || !current.isEditing
            val tags = item.tags.map { it.name }
            current.copy(
                isLoading = false,
                errorMessage = null,
                item = item,
                isEditing = if (resetEditing) false else current.isEditing,
                isTagEditorOpen = if (resetEditing) false else current.isTagEditorOpen,
                tagEditorInput = if (resetEditing) "" else current.tagEditorInput,
                isFullText = if (resetEditing) false else current.isFullText,
                titleInput = if (shouldResetInputs) item.title.orEmpty() else current.titleInput,
                summaryInput = if (shouldResetInputs) item.summary ?: item.rawText else current.summaryInput,
                originalTextInput = if (shouldResetInputs) item.rawText else current.originalTextInput,
                tagInputs = if (shouldResetInputs) tags else current.tagInputs,
                tagEditorTags = if (shouldResetInputs) tags else current.tagEditorTags
            )
        }
    }

    private fun enterEditMode() {
        val item = _state.value.item ?: return
        if (item.status != ItemStatus.ARCHIVED) return
        AppLog.info("DetailViewModel", "enter edit mode itemId=${item.id}")
        _state.update {
            it.copy(
                isEditing = true,
                titleInput = item.title.orEmpty(),
                summaryInput = item.summary ?: item.rawText,
                originalTextInput = item.rawText,
                tagInputs = item.tags.map { tag -> tag.name },
                isTagEditorOpen = false,
                tagEditorInput = "",
                tagEditorTags = item.tags.map { tag -> tag.name }
            )
        }
    }

    private fun cancelEdit() {
        val item = _state.value.item ?: return
        AppLog.info("DetailViewModel", "cancel edit itemId=${item.id}")
        _state.update {
            it.copy(
                isEditing = false,
                titleInput = item.title.orEmpty(),
                summaryInput = item.summary ?: item.rawText,
                originalTextInput = item.rawText,
                tagInputs = item.tags.map { tag -> tag.name },
                isTagEditorOpen = false,
                tagEditorInput = "",
                tagEditorTags = item.tags.map { tag -> tag.name }
            )
        }
    }

    private fun removeTagFromInputs(tagName: String) {
        _state.update { current ->
            current.copy(
                tagInputs = current.tagInputs.filterNot { it.equals(tagName, ignoreCase = true) }
            )
        }
    }

    private fun openTagEditor() {
        val item = _state.value.item ?: return
        AppLog.debug("DetailViewModel", "open tag editor itemId=${item.id}")
        _state.update {
            it.copy(
                isTagEditorOpen = true,
                isEditing = it.isEditing || item.status == ItemStatus.ARCHIVED,
                tagEditorInput = "",
                tagEditorTags = it.tagInputs
            )
        }
    }

    private fun closeTagEditor() {
        _state.update {
            it.copy(
                isTagEditorOpen = false,
                tagEditorInput = "",
                tagEditorTags = it.tagInputs
            )
        }
    }

    private fun saveTagEditor() {
        val pendingInput = _state.value.tagEditorInput.trim()
        val tagsWithPending = if (pendingInput.isNotEmpty()) {
            appendTag(_state.value.tagEditorTags, pendingInput)
        } else {
            _state.value.tagEditorTags
        }
        val normalizedTags = normalizeTags(tagsWithPending)
        AppLog.info("DetailViewModel", "save tag editor tags=${normalizedTags.size}")
        _state.update {
            it.copy(
                isTagEditorOpen = false,
                tagEditorInput = "",
                tagEditorTags = normalizedTags,
                tagInputs = normalizedTags
            )
        }
    }

    private fun addTagFromEditor() {
        val newTag = _state.value.tagEditorInput.trim()
        if (newTag.isBlank()) {
            return
        }
        val updatedTags = appendTag(_state.value.tagEditorTags, newTag)
        _state.update {
            it.copy(
                tagEditorTags = updatedTags,
                tagEditorInput = ""
            )
        }
    }

    private fun removeTagFromEditor(tagName: String) {
        _state.update { current ->
            current.copy(
                tagEditorTags = current.tagEditorTags.filterNot { it.equals(tagName, ignoreCase = true) }
            )
        }
    }

    private fun addSuggestedTag(tagName: String) {
        val updatedTags = appendTag(_state.value.tagEditorTags, tagName)
        _state.update { it.copy(tagEditorTags = updatedTags) }
    }

    private fun appendTag(tags: List<String>, tagName: String): List<String> {
        val trimmed = tagName.trim()
        if (trimmed.isBlank()) return tags
        return if (tags.any { it.equals(trimmed, ignoreCase = true) }) {
            tags
        } else {
            tags + trimmed
        }
    }

    private fun normalizeTags(tags: List<String>): List<String> {
        val unique = linkedSetOf<String>()
        tags.forEach { tag ->
            val trimmed = tag.trim()
            if (trimmed.isNotEmpty() && unique.none { it.equals(trimmed, ignoreCase = true) }) {
                unique.add(trimmed)
            }
        }
        return unique.toList()
    }

    private fun confirmChanges() {
        val current = _state.value
        val item = current.item ?: return
        if (current.isUpdating) return

        when (item.status) {
            ItemStatus.READY_TO_CONFIRM -> confirmItem(item)
            ItemStatus.ARCHIVED -> if (current.isEditing) updateItem(item) else enterEditMode()
            else -> return
        }
    }

    private fun confirmItem(item: Item) {
        viewModelScope.launch {
            AppLog.info("DetailViewModel", "confirm itemId=${item.id}")
            _state.update { it.copy(isUpdating = true, errorMessage = null) }
            val selectedTags = _state.value.tagInputs
            val selectedTagKeys = selectedTags.map { it.trim().lowercase() }.toSet()
            val pendingSuggestions = item.suggestedTags.filter { it.status == SuggestedTagStatus.PENDING }
            val acceptedSuggestions = pendingSuggestions
                .filter { selectedTagKeys.contains(it.name.trim().lowercase()) }
                .map { it.id }
            val rejectedSuggestions = pendingSuggestions
                .filterNot { selectedTagKeys.contains(it.name.trim().lowercase()) }
                .map { it.id }
            val titleInput = _state.value.titleInput.trim()
            val summaryInput = _state.value.summaryInput.trim()
            val originalInput = _state.value.originalTextInput
            val currentTitle = item.title.orEmpty()
            val currentSummary = item.summary ?: item.rawText

            val titleUpdate = if (titleInput != currentTitle) titleInput.ifBlank { null } else null
            val summaryUpdate = if (summaryInput != currentSummary) summaryInput.ifBlank { null } else null
            val originalTextUpdate = if (originalInput != item.rawText) originalInput else null
            AppLog.info(
                "DetailViewModel",
                "confirm changes title=${titleUpdate != null} summary=${summaryUpdate != null} " +
                    "originalText=${originalTextUpdate?.length ?: 0} rawText=${item.rawText.length}"
            )

            if (originalTextUpdate != null) {
                AppLog.info(
                    "DetailViewModel",
                    "confirm pre-update originalText len=${originalTextUpdate.length}"
                )
                when (val updateResult = updateItemUseCase(
                    itemId = item.id,
                    originalText = originalTextUpdate
                )) {
                    is ApiResult.Success -> {
                        AppLog.info("DetailViewModel", "originalText pre-update success itemId=${item.id}")
                    }
                    is ApiResult.Error -> {
                        AppLog.warn(
                            "DetailViewModel",
                            "originalText pre-update failed: ${updateResult.message}"
                        )
                        _state.update { it.copy(isUpdating = false, errorMessage = updateResult.message) }
                        return@launch
                    }
                }
            }

            val currentTags = item.tags.map { it.name }.sorted()
            val newTags = _state.value.tagInputs
            val tagsUpdate = if (newTags.sorted() != currentTags) newTags else null

            when (val result = confirmItemUseCase(
                itemId = item.id,
                acceptedSuggestionIds = acceptedSuggestions,
                rejectedSuggestionIds = rejectedSuggestions,
                title = titleUpdate,
                summary = summaryUpdate,
                tags = tagsUpdate,
                originalText = originalTextUpdate
            )) {
                is ApiResult.Success -> {
                    AppLog.info("DetailViewModel", "confirm api success itemId=${item.id}")
                    val now = Clock.System.now()
                    val updatedTags = tagsUpdate?.map { name ->
                        val existing = item.tags.firstOrNull { tag ->
                            tag.name.equals(name, ignoreCase = true)
                        }
                        Tag(
                            id = existing?.id ?: "",
                            name = name,
                            color = existing?.color ?: "#6B7280"
                        )
                    } ?: item.tags
                    val updatedItem = item.copy(
                        status = ItemStatus.ARCHIVED,
                        title = titleUpdate ?: item.title,
                        summary = summaryUpdate ?: item.summary,
                        rawText = originalTextUpdate ?: item.rawText,
                        tags = updatedTags,
                        confirmedAt = now,
                        updatedAt = now
                    )
                    AppLog.info("DetailViewModel", "confirm success itemId=${item.id}")
                    _state.update {
                        it.copy(
                            isUpdating = false,
                            isEditing = false,
                            item = updatedItem,
                            titleInput = updatedItem.title.orEmpty(),
                            summaryInput = updatedItem.summary ?: updatedItem.rawText,
                            originalTextInput = updatedItem.rawText,
                            tagInputs = updatedItem.tags.map { tag -> tag.name },
                            isTagEditorOpen = false,
                            tagEditorInput = "",
                            tagEditorTags = updatedItem.tags.map { tag -> tag.name },
                            refreshTick = it.refreshTick + 1
                        )
                    }
                }
                is ApiResult.Error -> {
                    AppLog.warn("DetailViewModel", "confirm failed: ${result.message}")
                    _state.update { it.copy(isUpdating = false, errorMessage = result.message) }
                }
            }
        }
    }

    private fun updateItem(item: Item) {
        viewModelScope.launch {
            AppLog.info("DetailViewModel", "update itemId=${item.id}")
            _state.update { it.copy(isUpdating = true, errorMessage = null) }

            val titleInput = _state.value.titleInput.trim()
            val summaryInput = _state.value.summaryInput.trim()
            val originalInput = _state.value.originalTextInput
            val currentTitle = item.title.orEmpty()
            val currentSummary = item.summary ?: item.rawText

            val titleUpdate = if (titleInput != currentTitle) titleInput.ifBlank { null } else null
            val summaryUpdate = if (summaryInput != currentSummary) summaryInput.ifBlank { null } else null
            val originalTextUpdate = if (originalInput != item.rawText) originalInput else null
            AppLog.info(
                "DetailViewModel",
                "update changes title=${titleUpdate != null} summary=${summaryUpdate != null} " +
                        "originalInput=${originalInput} status=${item.status}" +
                        "originalText=${originalTextUpdate} rawText=${item.rawText.length}"
            )

            val currentTags = item.tags.map { it.name }.sorted()
            val newTags = _state.value.tagInputs
            val tagsUpdate = if (newTags.sorted() != currentTags) newTags else null

            when (val result = updateItemUseCase(
                itemId = item.id,
                title = titleUpdate,
                summary = summaryUpdate,
                originalText = originalTextUpdate,
                tags = tagsUpdate
            )) {
                is ApiResult.Success -> {
                    AppLog.info("DetailViewModel", "update api success itemId=${item.id}")
                    val now = Clock.System.now()
                    val updatedTags = tagsUpdate?.map { name ->
                        val existing = item.tags.firstOrNull { tag ->
                            tag.name.equals(name, ignoreCase = true)
                        }
                        Tag(
                            id = existing?.id ?: "",
                            name = name,
                            color = existing?.color ?: "#6B7280"
                        )
                    } ?: item.tags
                    val updatedItem = item.copy(
                        title = titleUpdate ?: item.title,
                        summary = summaryUpdate ?: item.summary,
                        rawText = originalTextUpdate ?: item.rawText,
                        tags = updatedTags,
                        updatedAt = now
                    )
                    AppLog.info("DetailViewModel", "update success itemId=${item.id}")
                    _state.update {
                        it.copy(
                            isUpdating = false,
                            isEditing = false,
                            item = updatedItem,
                            titleInput = updatedItem.title.orEmpty(),
                            summaryInput = updatedItem.summary ?: updatedItem.rawText,
                            originalTextInput = updatedItem.rawText,
                            tagInputs = updatedItem.tags.map { tag -> tag.name },
                            isTagEditorOpen = false,
                            tagEditorInput = "",
                            tagEditorTags = updatedItem.tags.map { tag -> tag.name },
                            refreshTick = it.refreshTick + 1
                        )
                    }
                }
                is ApiResult.Error -> {
                    AppLog.warn("DetailViewModel", "update failed: ${result.message}")
                    _state.update { it.copy(isUpdating = false, errorMessage = result.message) }
                }
            }
        }
    }

    private fun discardItem() {
        val item = _state.value.item ?: return
        if (_state.value.isUpdating) return
        viewModelScope.launch {
            AppLog.info("DetailViewModel", "discard itemId=${item.id}")
            _state.update { it.copy(isUpdating = true, errorMessage = null) }
            when (val result = discardItemUseCase(item.id)) {
                is ApiResult.Success -> {
                    AppLog.info("DetailViewModel", "discard success itemId=${item.id}")
                    _state.update { it.copy(isUpdating = false, isDeleted = true, refreshTick = it.refreshTick + 1) }
                }
                is ApiResult.Error -> {
                    AppLog.warn("DetailViewModel", "discard failed: ${result.message}")
                    _state.update { it.copy(isUpdating = false, errorMessage = result.message) }
                }
            }
        }
    }
}
