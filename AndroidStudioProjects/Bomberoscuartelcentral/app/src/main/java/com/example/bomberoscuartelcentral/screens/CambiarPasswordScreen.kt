package com.example.bomberoscuartelcentral.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bomberoscuartelcentral.ui.theme.TacticalBackground
import com.example.bomberoscuartelcentral.ui.theme.TacticalBorder
import com.example.bomberoscuartelcentral.ui.theme.TacticalCard
import com.example.bomberoscuartelcentral.ui.theme.TacticalGold
import com.example.bomberoscuartelcentral.ui.theme.TacticalGreen
import com.example.bomberoscuartelcentral.ui.theme.TacticalRed
import com.example.bomberoscuartelcentral.ui.theme.TacticalRedBright
import com.example.bomberoscuartelcentral.ui.theme.TacticalText
import com.example.bomberoscuartelcentral.ui.theme.TacticalTextSecondary

private const val MINIMO = 8

/**
 * Primer ingreso (o contraseña restablecida por el COE): no se puede usar la app
 * hasta reemplazar la contraseña temporal por la propia.
 */
@Composable
fun CambiarPasswordScreen(
    usuario: String,
    guardando: Boolean,
    error: String,
    onGuardar: (String) -> Unit,
    onCerrarSesion: () -> Unit
) {
    var nueva by remember { mutableStateOf("") }
    var repetida by remember { mutableStateOf("") }
    val largoOk = nueva.length >= MINIMO
    val coinciden = nueva.isNotEmpty() && nueva == repetida
    val colores = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = TacticalGold, unfocusedBorderColor = TacticalBorder,
        focusedTextColor = TacticalText, unfocusedTextColor = TacticalText,
        cursorColor = TacticalGold, focusedContainerColor = TacticalBackground, unfocusedContainerColor = TacticalBackground
    )

    Box(
        modifier = Modifier.fillMaxSize().background(TacticalBackground).padding(20.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .background(TacticalCard, RoundedCornerShape(20.dp))
                .border(2.dp, TacticalGold, RoundedCornerShape(20.dp))
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Key, contentDescription = null, tint = TacticalGold, modifier = Modifier.size(28.dp))
                Spacer(Modifier.width(10.dp))
                Text("CREE SU CONTRASEÑA", color = TacticalText, fontWeight = FontWeight.Black, fontSize = 18.sp, letterSpacing = 1.sp)
            }
            Text(
                "Entró con una contraseña temporal del COE. Elija ahora la que usará siempre en la app y en el panel.",
                color = TacticalTextSecondary, fontSize = 14.sp, lineHeight = 20.sp
            )
            Text("Usuario: $usuario", color = TacticalTextSecondary, fontFamily = FontFamily.Monospace, fontSize = 13.sp)

            OutlinedTextField(
                value = nueva, onValueChange = { nueva = it },
                label = { Text("Nueva contraseña", fontSize = 13.sp) },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true, shape = RoundedCornerShape(14.dp), colors = colores,
                textStyle = androidx.compose.ui.text.TextStyle(fontSize = 16.sp),
                modifier = Modifier.fillMaxWidth().height(64.dp)
            )
            OutlinedTextField(
                value = repetida, onValueChange = { repetida = it },
                label = { Text("Repita la contraseña", fontSize = 13.sp) },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true, shape = RoundedCornerShape(14.dp), colors = colores,
                textStyle = androidx.compose.ui.text.TextStyle(fontSize = 16.sp),
                modifier = Modifier.fillMaxWidth().height(64.dp)
            )

            // Las condiciones se marcan en verde a medida que se cumplen
            Requisito("Al menos $MINIMO caracteres", largoOk)
            Requisito("Las dos contraseñas coinciden", coinciden)

            if (error.isNotEmpty()) {
                Text(error, color = TacticalRedBright, fontSize = 13.sp)
            }

            Button(
                onClick = { onGuardar(nueva) },
                enabled = largoOk && coinciden && !guardando,
                modifier = Modifier.fillMaxWidth().height(64.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = TacticalRed)
            ) {
                if (guardando) CircularProgressIndicator(color = androidx.compose.ui.graphics.Color.White, modifier = Modifier.size(24.dp), strokeWidth = 2.5.dp)
                else Text("GUARDAR Y ENTRAR", fontWeight = FontWeight.Black, fontSize = 16.sp, letterSpacing = 1.sp)
            }
            TextButton(onClick = onCerrarSesion, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                Text("Cerrar sesión", color = TacticalTextSecondary)
            }
        }
    }
}

@Composable
private fun Requisito(texto: String, cumplido: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            if (cumplido) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
            contentDescription = null,
            tint = if (cumplido) TacticalGreen else TacticalTextSecondary,
            modifier = Modifier.size(18.dp)
        )
        Spacer(Modifier.width(8.dp))
        Text(texto, color = if (cumplido) TacticalGreen else TacticalTextSecondary, fontSize = 13.sp)
    }
}
