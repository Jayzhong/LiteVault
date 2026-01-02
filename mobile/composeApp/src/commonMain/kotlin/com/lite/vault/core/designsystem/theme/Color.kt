package com.lite.vault.core.designsystem.theme

import androidx.compose.ui.graphics.Color

/**
 * Mint Brand Colors
 * 
 * Design Guidelines:
 * - MintPrimary (#00D8B0): High saturation accent, NOT for body text (accessibility)
 * - MintDeep (#00866E): CTA backgrounds with white text (meets contrast ratio)
 * - MintPressed (#006553): Pressed/active state for interactive elements
 * - MintTint  (#DBFFF8): Light mint backgrounds, pills, highlights
 */
object MintColors {
    // Brand Accent (use sparingly for highlights, not body text)
    val MintPrimary = Color(0xFF00D8B0)
    
    // CTA Backgrounds (accessible with white text)
    val MintDeep = Color(0xFF00866E)
    val MintPressed = Color(0xFF006553)
    
    // Light Backgrounds
    val MintTint = Color(0xFFDBFFF8)
    
    // Neutrals
    val DarkAnchor = Color(0xFF0B1220)       // Headings, body text
    val LightSurface = Color(0xFFF7FAFC)     // Main background
    val Border = Color(0xFFE2E8F0)           // Card borders, dividers
    val TextSecondary = Color(0xFF64748B)    // Secondary text, captions
    
    // Semantic
    val Error = Color(0xFFEF4444)
    val Success = Color(0xFF10B981)
    val Warning = Color(0xFFF59E0B)
    
    // System
    val White = Color(0xFFFFFFFF)
    val Black = Color(0xFF000000)
    val Scrim = Color(0x66000000)  // 40% black for dialogs
}
