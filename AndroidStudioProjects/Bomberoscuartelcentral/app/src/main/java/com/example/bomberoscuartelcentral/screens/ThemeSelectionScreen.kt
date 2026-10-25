package com.example.bomberoscuartelcentral.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bomberoscuartelcentral.ui.theme.TacticalRed

@Composable
fun ThemeSelectionScreen(onThemeSelected: (Boolean) -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0A0A0A)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(horizontal = 28.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .background(TacticalRed, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.LocalFireDepartment,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(40.dp)
                )
            }

            Spacer(Modifier.height(20.dp))

            Text(
                "BOMBEROS MIRANDA",
                color = Color(0xFFEEEEEE),
                fontWeight = FontWeight.Black,
                fontSize = 18.sp,
                letterSpacing = 2.sp
            )
            Text(
                "Cuartel Central",
                color = Color(0xFF888888),
                fontSize = 12.sp,
                letterSpacing = 1.sp
            )

            Spacer(Modifier.height(48.dp))

            Text(
                "¿CÓMO PREFIERES VER LA APP?",
                color = Color(0xFF888888),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp
            )

            Spacer(Modifier.height(20.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                ThemeCard(
                    modifier = Modifier.weight(1f),
                    isDark = true,
                    onClick = { onThemeSelected(true) }
                )
                ThemeCard(
                    modifier = Modifier.weight(1f),
                    isDark = false,
                    onClick = { onThemeSelected(false) }
                )
            }

            Spacer(Modifier.height(24.dp))

            Text(
                "Toca para seleccionar",
                color = Color(0xFF555555),
                fontSize = 11.sp
            )
        }
    }
}

@Composable
private fun ThemeCard(modifier: Modifier = Modifier, isDark: Boolean, onClick: () -> Unit) {
    val bg = if (isDark) Color(0xFF1E1E1E) else Color(0xFFFFFFFF)
    val border = if (isDark) Color(0xFF3A3A3A) else Color(0xFFE0E0E0)
    val headerBg = if (isDark) Color(0xFF161616) else Color(0xFFF5F5F5)
    val textColor = if (isDark) Color(0xFFEEEEEE) else Color(0xFF1A1A1A)
    val subtextColor = if (isDark) Color(0xFF666666) else Color(0xFF999999)
    val cardLine = if (isDark) Color(0xFF2A2A2A) else Color(0xFFEEEEEE)
    val label = if (isDark) "OSCURO" else "CLARO"
    val icon = if (isDark) Icons.Default.DarkMode else Icons.Default.LightMode

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(bg)
            .border(1.5.dp, border, RoundedCornerShape(20.dp))
            .clickable { onClick() }
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(headerBg)
        ) {
            Column(modifier = Modifier.padding(10.dp)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(20.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(TacticalRed.copy(alpha = 0.15f)),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Spacer(Modifier.width(8.dp))
                    Box(Modifier.size(8.dp).background(TacticalRed, CircleShape))
                    Spacer(Modifier.width(6.dp))
                    Box(Modifier.height(4.dp).width(60.dp).clip(RoundedCornerShape(2.dp)).background(TacticalRed.copy(alpha = 0.5f)))
                }
                Spacer(Modifier.height(8.dp))
                repeat(3) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(16.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(cardLine)
                    )
                    Spacer(Modifier.height(6.dp))
                }
            }
        }

        Spacer(Modifier.height(14.dp))

        Icon(icon, contentDescription = null, tint = if (isDark) Color(0xFFAAAAAA) else Color(0xFF555555), modifier = Modifier.size(22.dp))
        Spacer(Modifier.height(6.dp))
        Text(label, color = textColor, fontWeight = FontWeight.Black, fontSize = 14.sp, letterSpacing = 2.sp)
        Text(if (isDark) "Fondo oscuro" else "Fondo claro", color = subtextColor, fontSize = 10.sp)
    }
}
