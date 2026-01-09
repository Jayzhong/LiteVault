package com.lite.vault.feature.detail

import com.lite.vault.domain.model.Item

data class DetailState(
    val itemId: String = "",
    val isLoading: Boolean = false,
    val isUpdating: Boolean = false,
    val errorMessage: String? = null,
    val item: Item? = null,
    val isDeleted: Boolean = false,
    val refreshTick: Int = 0,
    val isEditing: Boolean = false,
    val titleInput: String = "",
    val summaryInput: String = "",
    val originalTextInput: String = "",
    val tagInputs: List<String> = emptyList(),
    val isTagEditorOpen: Boolean = false,
    val tagEditorInput: String = "",
    val tagEditorTags: List<String> = emptyList(),
    val isFullText: Boolean = false
)

sealed interface DetailIntent {
    data object Retry : DetailIntent
    data object EditClicked : DetailIntent
    data object CancelEdit : DetailIntent
    data object ConfirmChanges : DetailIntent
    data object DeleteConfirmed : DetailIntent
    data object ToggleFullText : DetailIntent
    data class TitleChanged(val value: String) : DetailIntent
    data class SummaryChanged(val value: String) : DetailIntent
    data class OriginalTextChanged(val value: String) : DetailIntent
    data class RemoveTag(val value: String) : DetailIntent
    data object OpenTagEditor : DetailIntent
    data object CloseTagEditor : DetailIntent
    data object SaveTagEditor : DetailIntent
    data class TagEditorInputChanged(val value: String) : DetailIntent
    data object TagEditorAddTag : DetailIntent
    data class TagEditorRemoveTag(val value: String) : DetailIntent
    data class TagEditorAddSuggested(val value: String) : DetailIntent
}
