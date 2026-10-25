package com.example.bomberoscuartelcentral.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bomberoscuartelcentral.data.Reporte
import com.example.bomberoscuartelcentral.ui.theme.LocalIsDarkTheme
import com.example.bomberoscuartelcentral.ui.theme.TacticalBackground
import com.example.bomberoscuartelcentral.ui.theme.TacticalBorder
import com.example.bomberoscuartelcentral.ui.theme.TacticalCard
import com.example.bomberoscuartelcentral.ui.theme.TacticalCardAlt
import com.example.bomberoscuartelcentral.ui.theme.TacticalGold
import com.example.bomberoscuartelcentral.ui.theme.TacticalGreen
import com.example.bomberoscuartelcentral.ui.theme.TacticalRed
import com.example.bomberoscuartelcentral.ui.theme.TacticalRedBright
import com.example.bomberoscuartelcentral.ui.theme.TacticalSurface
import com.example.bomberoscuartelcentral.ui.theme.TacticalText
import com.example.bomberoscuartelcentral.ui.theme.TacticalTextSecondary
import com.example.bomberoscuartelcentral.viewmodel.ReporteViewModel
import com.example.bomberoscuartelcentral.data.Supa

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(viewModel: ReporteViewModel, onLogout: () -> Unit, onThemeSelected: (Boolean) -> Unit = {}) {
    val reportes by viewModel.reportes.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val userEmail = remember { Supa.nombreDeCuenta() ?: "Funcionario" }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "DASHBOARD OPERATIVO",
                            fontWeight = FontWeight.Black,
                            fontSize = 16.sp,
                            color = TacticalRed,
                            letterSpacing = 1.sp
                        )
                        Text(
                            "BOMBEROS MIRANDA · CUARTEL CENTRAL",
                            fontSize = 10.sp,
                            color = TacticalTextSecondary,
                            letterSpacing = 0.5.sp
                        )
                    }
                },
                actions = {
                    val isDark = LocalIsDarkTheme.current
                    IconButton(onClick = { onThemeSelected(!isDark) }) {
                        Icon(
                            if (isDark) Icons.Default.LightMode else Icons.Default.DarkMode,
                            contentDescription = "Cambiar tema",
                            tint = TacticalTextSecondary
                        )
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Salir", tint = TacticalTextSecondary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TacticalSurface)
            )
        },
        containerColor = TacticalBackground
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(0.dp)
        ) {
            item {
                Spacer(Modifier.height(16.dp))
                WelcomeBanner(userEmail)
                Spacer(Modifier.height(20.dp))
            }

            item {
                Text(
                    "ESTADÍSTICAS",
                    color = TacticalRed,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 2.sp,
                    modifier = Modifier.padding(start = 4.dp, bottom = 10.dp)
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    StatCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.Assessment,
                        label = "TOTAL REPORTES",
                        value = viewModel.totalReportes.toString(),
                        iconColor = TacticalGold,
                        loading = isLoading
                    )
                    StatCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.CalendarToday,
                        label = "HOY",
                        value = viewModel.reportesHoy.toString(),
                        iconColor = TacticalGreen,
                        loading = isLoading
                    )
                }
                Spacer(Modifier.height(20.dp))
            }

            item {
                Text(
                    "ACTIVIDAD RECIENTE",
                    color = TacticalRed,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 2.sp,
                    modifier = Modifier.padding(start = 4.dp, bottom = 10.dp)
                )
            }

            if (isLoading) {
                item {
                    Box(
                        modifier = Modifier.fillMaxWidth().height(120.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Cargando reportes en tiempo real...", color = TacticalTextSecondary, fontSize = 13.sp)
                    }
                }
            } else if (reportes.isEmpty()) {
                item {
                    EmptyStateCard()
                }
            } else {
                items(reportes.take(5)) { reporte ->
                    ReporteCardCompact(reporte)
                    Spacer(Modifier.height(8.dp))
                }
                if (reportes.size > 5) {
                    item {
                        Text(
                            "+ ${reportes.size - 5} reportes más en Historial",
                            color = TacticalTextSecondary,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(start = 4.dp, top = 4.dp, bottom = 16.dp)
                        )
                    }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

@Composable
fun WelcomeBanner(nombre: String) {
    val isDark = LocalIsDarkTheme.current
    val gradientStart = if (isDark) Color(0xFF1A0000) else Color(0xFFFFEBEE)
    val gradientEnd = if (isDark) Color(0xFF1E1E1E) else Color(0xFFF5F5F5)
    val nombreColor = if (isDark) Color(0xFFEEEEEE) else Color(0xFF1A1A1A)
    val subtitleColor = if (isDark) Color(0xFF9E9E9E) else Color(0xFF757575)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.horizontalGradient(listOf(gradientStart, gradientEnd)),
                RoundedCornerShape(16.dp)
            )
            .padding(20.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Default.LocalFireDepartment,
                contentDescription = null,
                tint = TacticalRedBright,
                modifier = Modifier.size(36.dp)
            )
            Spacer(Modifier.width(14.dp))
            Column {
                Text("Bienvenido,", color = subtitleColor, fontSize = 12.sp)
                Text(
                    nombre,
                    color = nombreColor,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
                Text(
                    "Sistema activo — Tiempo real",
                    color = TacticalGreen,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    letterSpacing = 0.5.sp
                )
            }
        }
    }
}

@Composable
fun StatCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    label: String,
    value: String,
    iconColor: Color,
    loading: Boolean
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = TacticalCard),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(28.dp))
            Spacer(Modifier.height(12.dp))
            Text(
                if (loading) "—" else value,
                color = Color.White,
                fontWeight = FontWeight.Black,
                fontSize = 32.sp
            )
            Text(label, color = TacticalTextSecondary, fontSize = 10.sp, letterSpacing = 1.sp)
        }
    }
}

@Composable
fun ReporteCardCompact(reporte: Reporte) {
    Card(
        colors = CardDefaults.cardColors(containerColor = TacticalCardAlt),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .background(TacticalRed.copy(alpha = 0.15f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Schedule, contentDescription = null, tint = TacticalRed, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(reporte.fecha, color = TacticalTextSecondary, fontSize = 11.sp)
                    Text("  ·  ", color = TacticalBorder, fontSize = 11.sp)
                    Text(reporte.hora, color = TacticalTextSecondary, fontSize = 11.sp)
                    if (reporte.nroMinuta.isNotEmpty()) {
                        Text("  ·  COD ${reporte.nroMinuta}", color = TacticalRed, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.height(3.dp))
                Text(
                    if (reporte.antares.isNotEmpty()) reporte.antares.first() else "Sin clasificación",
                    color = TacticalText,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (reporte.direccion.isNotEmpty()) {
                    Text(
                        reporte.direccion,
                        color = TacticalTextSecondary,
                        fontSize = 11.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Composable
fun EmptyStateCard() {
    Card(
        colors = CardDefaults.cardColors(containerColor = TacticalCard),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(32.dp).fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.Default.Assessment,
                contentDescription = null,
                tint = TacticalTextSecondary.copy(alpha = 0.4f),
                modifier = Modifier.size(48.dp)
            )
            Spacer(Modifier.height(12.dp))
            Text("Sin reportes registrados", color = TacticalTextSecondary, fontSize = 14.sp)
            Text("Crea el primer reporte operativo", color = TacticalTextSecondary.copy(alpha = 0.6f), fontSize = 12.sp)
        }
    }
}
