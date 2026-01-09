package com.lite.vault.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lite.vault.core.logging.AppLog
import com.lite.vault.core.network.ApiResult
import com.lite.vault.domain.model.Item
import com.lite.vault.domain.model.ItemStatus
import com.lite.vault.domain.usecase.CreateItemUseCase
import com.lite.vault.domain.usecase.GetLibraryUseCase
import com.lite.vault.domain.usecase.GetPendingItemsUseCase
import com.lite.vault.domain.usecase.GetUserProfileUseCase
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDateTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import kotlin.time.Clock

class HomeViewModel(
    private val createItemUseCase: CreateItemUseCase,
    private val getPendingItemsUseCase: GetPendingItemsUseCase,
    private val getLibraryUseCase: GetLibraryUseCase,
    private val getUserProfileUseCase: GetUserProfileUseCase
) : ViewModel() {

    private val _state = MutableStateFlow(HomeState())
    val state: StateFlow<HomeState> = _state.asStateFlow()

    private var pollingJob: Job? = null
    private var activeTimeZone: TimeZone = TimeZone.currentSystemDefault()

    init {
        updateDateLabel()
        loadProfile()
        refreshPendingItems()
        loadRecentItems()
    }

    fun onIntent(intent: HomeIntent) {
        when (intent) {
            is HomeIntent.InputChanged -> _state.update { it.copy(inputText = intent.value) }
            HomeIntent.ToggleUseAi -> toggleUseAi()
            HomeIntent.SaveClicked -> createItem()
            HomeIntent.RefreshAll -> {
                refreshPendingItems()
                loadRecentItems()
            }
            HomeIntent.RefreshPending -> refreshPendingItems()
            HomeIntent.ClearError -> _state.update { it.copy(errorMessage = null) }
        }
    }

    private fun toggleUseAi() {
        val next = !_state.value.useAiEnabled
        _state.update { it.copy(useAiEnabled = next) }
        AppLog.info("HomeViewModel", "toggleUseAi enabled=$next")
    }

    private fun createItem() {
        val text = _state.value.inputText.trim()
        if (text.isBlank()) return

        viewModelScope.launch {
            _state.update { it.copy(isSaving = true, errorMessage = null) }
            AppLog.info("HomeViewModel", "createItem useAi=${_state.value.useAiEnabled}")
            when (val result = createItemUseCase(text, _state.value.useAiEnabled)) {
                is ApiResult.Success -> {
                    val item = result.data
                    _state.update {
                        it.copy(
                            isSaving = false,
                            inputText = "",
                            pendingItems = updatePendingItems(it.pendingItems, item)
                        )
                    }
                    if (item.status == ItemStatus.ARCHIVED) {
                        _state.update { current ->
                            current.copy(recentItems = listOf(item) + current.recentItems)
                        }
                    } else {
                        updatePollingState(_state.value.pendingItems)
                    }
                }
                is ApiResult.Error -> {
                    AppLog.error("HomeViewModel", "createItem failed: ${result.message}")
                    _state.update { it.copy(isSaving = false, errorMessage = result.message) }
                }
            }
        }
    }

    private fun updatePendingItems(existing: List<Item>, newItem: Item): List<Item> {
        if (newItem.status == ItemStatus.ARCHIVED) return existing
        return listOf(newItem) + existing
    }

    private fun refreshPendingItems() {
        viewModelScope.launch {
            when (val result = getPendingItemsUseCase()) {
                is ApiResult.Success -> {
                    _state.update { it.copy(pendingItems = result.data) }
                    updatePollingState(result.data)
                }
                is ApiResult.Error -> {
                    AppLog.warn("HomeViewModel", "Failed to load pending items: ${result.message}")
                }
            }
        }
    }

    private fun loadRecentItems() {
        viewModelScope.launch {
            when (val result = getLibraryUseCase(limit = 6)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(recentItems = result.data.items.take(6)) }
                }
                is ApiResult.Error -> {
                    AppLog.warn("HomeViewModel", "Failed to load recent items: ${result.message}")
                }
            }
        }
    }

    private fun loadProfile() {
        viewModelScope.launch {
            when (val result = getUserProfileUseCase()) {
                is ApiResult.Success -> {
                    val profile = result.data
                    val timezone = resolveTimeZone(profile.preferences.timezone)
                    activeTimeZone = timezone
                    _state.update {
                        it.copy(
                            greetingName = profile.nickname ?: profile.displayName.orEmpty(),
                            useAiEnabled = profile.preferences.aiSuggestionsEnabled
                        )
                    }
                    updateDateLabel()
                }
                is ApiResult.Error -> {
                    AppLog.warn("HomeViewModel", "Failed to load profile: ${result.message}")
                }
            }
        }
    }

    private fun updateDateLabel() {
        val now = Clock.System.now().toLocalDateTime(activeTimeZone)
        _state.update { it.copy(dateLabel = formatDate(now)) }
    }

    private fun updatePollingState(items: List<Item>) {
        val hasEnriching = items.any { it.status == ItemStatus.ENRICHING }
        if (hasEnriching && pollingJob == null) {
            startPolling()
        } else if (!hasEnriching && pollingJob != null) {
            stopPolling()
        }
    }

    private fun startPolling() {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            while (true) {
                delay(POLL_INTERVAL_MS)
                refreshPendingItems()
            }
        }
    }

    private fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
    }

    private fun resolveTimeZone(value: String): TimeZone {
        return runCatching { TimeZone.of(value) }.getOrElse { TimeZone.currentSystemDefault() }
    }

    private fun formatDate(dateTime: LocalDateTime): String {
        val day = formatDayOfWeek(dateTime.date.dayOfWeek)
        val month = dateTime.month.name.take(3)
        return "$day, ${dateTime.dayOfMonth} $month"
    }

    private fun formatDayOfWeek(day: DayOfWeek): String {
        return day.name
    }

    override fun onCleared() {
        super.onCleared()
        stopPolling()
    }

    private companion object {
        const val POLL_INTERVAL_MS = 3000L
    }
}
