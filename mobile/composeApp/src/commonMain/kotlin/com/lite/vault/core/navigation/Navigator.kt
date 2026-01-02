package com.lite.vault.core.navigation

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Simple Navigator for V1
 * 
 * Uses StateFlow to emit screen changes.
 * ViewModels trigger navigation via Effects.
 */
class Navigator(initialScreen: Screen = Screen.Login) {
    private val _currentScreen = MutableStateFlow<Screen>(initialScreen)
    val currentScreen: StateFlow<Screen> = _currentScreen.asStateFlow()
    
    private val backStack = mutableListOf<Screen>()
    
    fun navigate(screen: Screen) {
        backStack.add(_currentScreen.value)
        _currentScreen.value = screen
    }
    
    fun back(): Boolean {
        return if (backStack.isNotEmpty()) {
            _currentScreen.value = backStack.removeLast()
            true
        } else {
            false
        }
    }
    
    fun reset(screen: Screen) {
        backStack.clear()
        _currentScreen.value = screen
    }
}
