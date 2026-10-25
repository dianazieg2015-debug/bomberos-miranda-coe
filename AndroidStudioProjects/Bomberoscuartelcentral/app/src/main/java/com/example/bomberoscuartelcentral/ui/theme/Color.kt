package com.example.bomberoscuartelcentral.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Accent colors — same in both themes
val TacticalRed = Color(0xFFD32F2F)
val TacticalRedBright = Color(0xFFFF1744)
val TacticalRedDark = Color(0xFF9A0007)
val TacticalGreenBright = Color(0xFF69F0AE)
val TacticalGreen = Color(0xFF00C853)
val TacticalOrange = Color(0xFFFF6D00)
val TacticalGold = Color(0xFFFFD600)
val TacticalWhatsApp = Color(0xFF25D366)

// Theme-aware structural colors
val TacticalBackground: Color
    @Composable get() = if (LocalIsDarkTheme.current) Color(0xFF0A0A0A) else Color(0xFFF0F2F5)

val TacticalSurface: Color
    @Composable get() = if (LocalIsDarkTheme.current) Color(0xFF161616) else Color(0xFFFFFFFF)

val TacticalCard: Color
    @Composable get() = if (LocalIsDarkTheme.current) Color(0xFF1E1E1E) else Color(0xFFFFFFFF)

val TacticalCardAlt: Color
    @Composable get() = if (LocalIsDarkTheme.current) Color(0xFF252525) else Color(0xFFF5F5F5)

val TacticalBorder: Color
    @Composable get() = if (LocalIsDarkTheme.current) Color(0xFF2E2E2E) else Color(0xFFDEDEDE)

val TacticalText: Color
    @Composable get() = if (LocalIsDarkTheme.current) Color(0xFFEEEEEE) else Color(0xFF1A1A1A)

val TacticalTextSecondary: Color
    @Composable get() = if (LocalIsDarkTheme.current) Color(0xFF9E9E9E) else Color(0xFF616161)