package com.lite.vault.feature.main

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LibraryBooks
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarDefaults
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lite.vault.core.designsystem.theme.MintColors
import com.lite.vault.feature.detail.DetailScreen
import com.lite.vault.feature.detail.rememberDetailViewModel
import com.lite.vault.feature.home.HomeIntent
import com.lite.vault.feature.home.HomeScreen
import com.lite.vault.feature.home.rememberHomeViewModel
import com.lite.vault.feature.library.LibraryScreen
import com.lite.vault.feature.library.LibraryIntent
import com.lite.vault.feature.library.rememberLibraryViewModel
import com.lite.vault.feature.me.EditProfileScreen
import com.lite.vault.feature.me.MeScreen
import mobile.composeapp.generated.resources.Res
import mobile.composeapp.generated.resources.*
import org.jetbrains.compose.resources.stringResource

private enum class MainTab {
    Home,
    Library,
    Me
}

/**
 * Main Screen with bottom tabs.
 */
@Composable
fun MainScreen(
    onLoggedOut: () -> Unit = {}
) {
    var selectedTab by remember { mutableStateOf(MainTab.Home) }
    var detailItemId by remember { mutableStateOf<String?>(null) }
    var editProfileOpen by remember { mutableStateOf(false) }
    var meRefreshKey by remember { mutableStateOf(0) }
    var librarySearchFocusKey by remember { mutableStateOf(0) }

    val openLibrary: (Boolean) -> Unit = { requestFocus ->
        selectedTab = MainTab.Library
        librarySearchFocusKey = if (requestFocus) {
            librarySearchFocusKey + 1
        } else {
            0
        }
    }
    val homeViewModel = rememberHomeViewModel()
    val libraryViewModel = rememberLibraryViewModel()
    val detailViewModel = rememberDetailViewModel()
    val detailState by detailViewModel.state.collectAsState()

    LaunchedEffect(detailState.refreshTick) {
        if (detailState.refreshTick > 0) {
            homeViewModel.onIntent(HomeIntent.RefreshAll)
            libraryViewModel.onIntent(LibraryIntent.Retry)
        }
    }

    Scaffold(
        containerColor = MintColors.White,
        bottomBar = {
            if (detailItemId == null && !editProfileOpen) {
                androidx.compose.foundation.layout.Column(
                    modifier = Modifier
                        .shadow(12.dp, RectangleShape)
                ) {
                    HorizontalDivider(color = MintColors.Border.copy(alpha = 0.7f))
                    NavigationBar(
                        containerColor = MintColors.White,
                        tonalElevation = 0.dp,
                        windowInsets = NavigationBarDefaults.windowInsets,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp, bottom = 8.dp)
                    ) {
                        val itemColors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MintColors.MintPrimary,
                            selectedTextColor = MintColors.MintPrimary,
                            unselectedIconColor = MintColors.TextSecondary,
                            unselectedTextColor = MintColors.TextSecondary,
                            indicatorColor = Color.Transparent
                        )
                        val librarySelected = selectedTab == MainTab.Library
                        val homeSelected = selectedTab == MainTab.Home
                        val meSelected = selectedTab == MainTab.Me

                        NavigationBarItem(
                            selected = librarySelected,
                            onClick = { openLibrary(false) },
                            icon = {
                                Icon(
                                    imageVector = Icons.Default.LibraryBooks,
                                    contentDescription = null,
                                    modifier = Modifier.size(24.dp)
                                )
                            },
                            label = {
                                Text(
                                    text = tabLabel(MainTab.Library),
                                    fontSize = 10.sp,
                                    fontWeight = if (librarySelected) FontWeight.SemiBold else FontWeight.Medium
                                )
                            },
                            colors = itemColors
                        )
                        NavigationBarItem(
                            selected = homeSelected,
                            onClick = { selectedTab = MainTab.Home },
                            icon = {
                                Icon(
                                    imageVector = Icons.Default.Home,
                                    contentDescription = null,
                                    modifier = Modifier.size(24.dp)
                                )
                            },
                            label = {
                                Text(
                                    text = tabLabel(MainTab.Home),
                                    fontSize = 10.sp,
                                    fontWeight = if (homeSelected) FontWeight.SemiBold else FontWeight.Medium
                                )
                            },
                            colors = itemColors
                        )
                        NavigationBarItem(
                            selected = meSelected,
                            onClick = { selectedTab = MainTab.Me },
                            icon = {
                                Icon(
                                    imageVector = Icons.Default.AccountCircle,
                                    contentDescription = null,
                                    modifier = Modifier.size(24.dp)
                                )
                            },
                            label = {
                                Text(
                                    text = tabLabel(MainTab.Me),
                                    fontSize = 10.sp,
                                    fontWeight = if (meSelected) FontWeight.SemiBold else FontWeight.Medium
                                )
                            },
                            colors = itemColors
                        )
                    }
                }
            }
        },
        floatingActionButton = {
            if (selectedTab == MainTab.Home && detailItemId == null && !editProfileOpen) {
                FloatingActionButton(
                    onClick = {
                        openLibrary(true)
                    },
                    containerColor = MintColors.MintPrimary,
                    contentColor = Color.White,
                    shape = androidx.compose.foundation.shape.CircleShape,
                    elevation = FloatingActionButtonDefaults.elevation(
                        defaultElevation = 10.dp,
                        pressedElevation = 12.dp
                    ),
                    modifier = Modifier
                        .size(56.dp)
                        .shadow(12.dp, androidx.compose.foundation.shape.CircleShape)
                        .border(4.dp, Color.White.copy(alpha = 0.4f), androidx.compose.foundation.shape.CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MintColors.White)
                .padding(paddingValues)
        ) {
            when (selectedTab) {
                MainTab.Home -> HomeScreen(
                    onViewAll = { openLibrary(false) },
                    onItemClick = { detailItemId = it },
                    viewModel = homeViewModel
                )
                MainTab.Library -> LibraryScreen(
                    onItemClick = { detailItemId = it },
                    requestSearchFocusKey = librarySearchFocusKey,
                    viewModel = libraryViewModel
                )
                MainTab.Me -> MeScreen(
                    onEditProfile = { editProfileOpen = true },
                    onLoggedOut = onLoggedOut,
                    refreshKey = meRefreshKey
                )
            }

            detailItemId?.let { itemId ->
                DetailScreen(
                    itemId = itemId,
                    onBack = { detailItemId = null },
                    viewModel = detailViewModel
                )
            }

            if (editProfileOpen) {
                EditProfileScreen(
                    onBack = { editProfileOpen = false },
                    onSaved = {
                        editProfileOpen = false
                        meRefreshKey += 1
                    }
                )
            }
        }
    }
}

@Composable
private fun tabLabel(tab: MainTab): String {
    return when (tab) {
        MainTab.Home -> stringResource(Res.string.tab_home)
        MainTab.Library -> stringResource(Res.string.tab_library)
        MainTab.Me -> stringResource(Res.string.tab_me)
    }
}
