package com.lite.vault.core.designsystem.theme

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

object AppTypography {
    // Headings
    val H1 = TextStyle(
        fontSize = 28.sp,
        fontWeight = FontWeight.Bold,
        color = MintColors.DarkAnchor,
        lineHeight = 36.sp
    )
    
    val H2 = TextStyle(
        fontSize = 20.sp,
        fontWeight = FontWeight.SemiBold,
        color = MintColors.DarkAnchor,
        lineHeight = 28.sp
    )
    
    val H3 = TextStyle(
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold,
        color = MintColors.DarkAnchor,
        lineHeight = 24.sp
    )
    
    // Body
    val Body = TextStyle(
        fontSize = 15.sp,
        fontWeight = FontWeight.Normal,
        color = MintColors.DarkAnchor,
        lineHeight = 22.sp
    )
    
    val BodySmall = TextStyle(
        fontSize = 13.sp,
        fontWeight = FontWeight.Normal,
        color = MintColors.TextSecondary,
        lineHeight = 20.sp
    )
    
    // UI Elements
    val Button = TextStyle(
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold,
        color = MintColors.White,
        lineHeight = 24.sp
    )
    
    val Caption = TextStyle(
        fontSize = 12.sp,
        fontWeight = FontWeight.Normal,
        color = MintColors.TextSecondary,
        lineHeight = 16.sp
    )
    
    val Label = TextStyle(
        fontSize = 11.sp,
        fontWeight = FontWeight.Medium,
        color = MintColors.TextSecondary,
        lineHeight = 14.sp,
        letterSpacing = 0.5.sp
    )
}
