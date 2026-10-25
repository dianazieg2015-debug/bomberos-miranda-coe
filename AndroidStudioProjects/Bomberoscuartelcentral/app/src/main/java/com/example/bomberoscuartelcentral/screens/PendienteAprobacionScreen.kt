package com.example.bomberoscuartelcentral.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bomberoscuartelcentral.data.Usuario
import com.example.bomberoscuartelcentral.ui.theme.TacticalBackground
import com.example.bomberoscuartelcentral.ui.theme.TacticalGold
import com.example.bomberoscuartelcentral.ui.theme.TacticalRed
import com.example.bomberoscuartelcentral.ui.theme.TacticalText
import com.example.bomberoscuartelcentral.ui.theme.TacticalTextSecondary

@Composable
fun PendienteAprobacionScreen(usuario: Usuario?, onReintentar: () -> Unit, onCerrarSesion: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(TacticalBackground).padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(Icons.Default.HourglassTop, contentDescription = null, tint = TacticalGold, modifier = Modifier.size(64.dp))
        Spacer(Modifier.height(20.dp))
        Text("CUENTA PENDIENTE DE APROBACIÓN", color = TacticalText, fontWeight = FontWeight.Black, fontSize = 16.sp, textAlign = TextAlign.Center)
        Spacer(Modifier.height(10.dp))
        Text(
            buildString {
                append("Un administrador debe aprobar su registro")
                usuario?.equipmentNumber?.takeIf { it.isNotBlank() }?.let { append(" (equipo #$it)") }
                append(" antes de enviar minutas. Esta pantalla se actualiza sola al ser aprobado.")
            },
            color = TacticalTextSecondary, fontSize = 13.sp, textAlign = TextAlign.Center, lineHeight = 19.sp
        )
        Spacer(Modifier.height(28.dp))
        Button(
            onClick = onReintentar,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = TacticalRed)
        ) { Text("COMPROBAR DE NUEVO", fontWeight = FontWeight.Black) }
        TextButton(onClick = onCerrarSesion) { Text("Cerrar sesión", color = TacticalTextSecondary) }
    }
}
