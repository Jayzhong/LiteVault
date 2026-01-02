package com.lite.vault.feature.home

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.lite.vault.core.designsystem.components.AppButton
import com.lite.vault.core.designsystem.components.AppButtonVariant
import com.lite.vault.core.designsystem.theme.AppSpacing
import com.lite.vault.core.designsystem.theme.AppTypography
import com.lite.vault.core.navigation.Navigator
import com.lite.vault.core.navigation.Screen
import com.lite.vault.domain.usecase.LogoutUseCase
import mobile.composeapp.generated.resources.Res
import mobile.composeapp.generated.resources.*
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.koinInject
import kotlinx.coroutines.launch

/**
 * Home Screen (Placeholder for V1)
 * 
 * Shows:
 * - Welcome message
 * - Logout button
 */
@Composable
fun HomeScreen(navigator: Navigator) {
    val logoutUseCase: LogoutUseCase = koinInject()
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(AppSpacing.lg),
            modifier = Modifier.padding(AppSpacing.xl)
        ) {
            Text(
                text = stringResource(Res.string.home_title),
                style = AppTypography.H1
            )
            
            Text(
                text = stringResource(Res.string.home_placeholder),
                style = AppTypography.Body
            )
            
            Spacer(modifier = Modifier.height(AppSpacing.lg))
            
            AppButton(
                text = stringResource(Res.string.home_logout),
                onClick = {
                    scope.launch {
                        logoutUseCase()
                        navigator.reset(Screen.Login)
                    }
                },
                variant = AppButtonVariant.SECONDARY
            )
        }
    }
}
