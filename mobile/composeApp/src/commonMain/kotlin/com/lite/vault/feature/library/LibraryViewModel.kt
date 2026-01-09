package com.lite.vault.feature.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lite.vault.core.logging.AppLog
import com.lite.vault.core.network.ApiResult
import com.lite.vault.domain.usecase.GetLibraryUseCase
import com.lite.vault.domain.usecase.SearchLibraryUseCase
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.datetime.TimeZone

class LibraryViewModel(
    private val getLibraryUseCase: GetLibraryUseCase,
    private val searchLibraryUseCase: SearchLibraryUseCase
) : ViewModel() {

    private val _state = MutableStateFlow(LibraryState(timezoneId = TimeZone.currentSystemDefault().id))
    val state: StateFlow<LibraryState> = _state.asStateFlow()

    private var searchJob: Job? = null

    init {
        loadLibrary()
    }

    fun onIntent(intent: LibraryIntent) {
        when (intent) {
            is LibraryIntent.QueryChanged -> handleQueryChanged(intent.value)
            LibraryIntent.Retry -> retry()
        }
    }

    private fun handleQueryChanged(query: String) {
        _state.update { it.copy(query = query) }
        searchJob?.cancel()
        if (query.isBlank()) {
            loadLibrary()
        } else {
            searchJob = viewModelScope.launch {
                delay(300)
                search(query)
            }
        }
    }

    private fun retry() {
        val query = _state.value.query
        if (query.isBlank()) {
            loadLibrary()
        } else {
            search(query)
        }
    }

    private fun loadLibrary() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, errorMessage = null) }
            when (val result = getLibraryUseCase(limit = 50)) {
                is ApiResult.Success -> {
                    _state.update {
                        it.copy(
                            isLoading = false,
                            isSearching = false,
                            items = result.data.items
                        )
                    }
                }
                is ApiResult.Error -> {
                    AppLog.warn("LibraryViewModel", "Failed to load library: ${result.message}")
                    _state.update { it.copy(isLoading = false, errorMessage = result.message) }
                }
            }
        }
    }

    private fun search(query: String) {
        viewModelScope.launch {
            _state.update { it.copy(isSearching = true, errorMessage = null) }
            when (val result = searchLibraryUseCase(query.trim(), limit = 50)) {
                is ApiResult.Success -> {
                    _state.update {
                        it.copy(
                            isSearching = false,
                            items = result.data.items
                        )
                    }
                }
                is ApiResult.Error -> {
                    AppLog.warn("LibraryViewModel", "Search failed: ${result.message}")
                    _state.update { it.copy(isSearching = false, errorMessage = result.message) }
                }
            }
        }
    }
}
