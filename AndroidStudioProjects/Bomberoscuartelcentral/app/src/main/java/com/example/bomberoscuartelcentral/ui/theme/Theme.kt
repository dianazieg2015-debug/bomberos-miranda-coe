package com.example.bomberoscuartelcentral.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.graphics.Color

val LocalIsDarkTheme = compositionLocalOf { true }

private val TacticalDarkColorScheme = darkColorScheme(
    primary = TacticalRed,
    onPrimary = Color.White,
    primaryContainer = TacticalRedDark,
    secondary = Color(0xFF9E9E9E),
    background = Color(0xFF0A0A0A),
    surface = Color(0xFF161616),
    onBackground = Color(0xFFEEEEEE),
    onSurface = Color(0xFFEEEEEE),
    outline = Color(0xFF2E2E2E)
)

private val TacticalLightColorScheme = lightColorScheme(
    primary = TacticalRed,
    onPrimary = Color.White,
    primaryContainer = TacticalRedDark,
    secondary = Color(0xFF616161),
    background = Color(0xFFF0F2F5),
    surface = Color(0xFFFFFFFF),
    onBackground = Color(0xFF1A1A1A),
    onSurface = Color(0xFF1A1A1A),
    outline = Color(0xFFDEDEDE)
)

@Composable
fun BomberosCuartelCentralTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) TacticalDarkColorScheme else TacticalLightColorScheme
    CompositionLocalProvider(LocalIsDarkTheme provides darkTheme) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            content = content
        )
    }
}