package com.example.bomberoscuartelcentral.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.EaseInOut
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.Image
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import com.example.bomberoscuartelcentral.R
import com.example.bomberoscuartelcentral.data.Supa
import com.example.bomberoscuartelcentral.data.correoDeUsuario
import com.example.bomberoscuartelcentral.ui.theme.TacticalBackground
import com.example.bomberoscuartelcentral.ui.theme.TacticalBorder
import com.example.bomberoscuartelcentral.ui.theme.TacticalCard
import com.example.bomberoscuartelcentral.ui.theme.TacticalRed
import com.example.bomberoscuartelcentral.ui.theme.TacticalRedBright
import com.example.bomberoscuartelcentral.ui.theme.TacticalTextSecondary
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import kotlinx.coroutines.launch

// Las cuentas las crea el COE: aquí solo se entra, no hay registro ni inicio con Google.
@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    var usuario by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var errorMsg by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.04f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = TacticalRed,
        unfocusedBorderColor = TacticalBorder,
        focusedTextColor = Color.White,
        unfocusedTextColor = Color.White,
        cursorColor = TacticalRed,
        focusedContainerColor = TacticalCard,
        unfocusedContainerColor = TacticalCard
    )

    fun entrar() {
        if (usuario.isBlank() || password.isBlank()) {
            errorMsg = "Escriba su usuario y su contraseña."
            return
        }
        isLoading = true
        scope.launch {
            try {
                Supa.client.auth.signInWith(Email) {
                    email = correoDeUsuario(usuario)
                    this.password = password
                }
                onLoginSuccess()
            } catch (e: Exception) {
                errorMsg = if (e.message.orEmpty().contains("invalid", ignoreCase = true))
                    "Usuario o contraseña incorrectos."
                else "No se pudo conectar. Verifique su señal e intente de nuevo."
            } finally {
                isLoading = false
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFF1A0000), TacticalBackground, TacticalBackground),
                    startY = 0f,
                    endY = 900f
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Escudo oficial, a todo color y sin recuadro (igual que en el panel web)
            Image(
                painter = painterResource(R.drawable.escudo_bomberos_miranda),
                contentDescription = "Escudo del Cuerpo de Bomberos de Miranda",
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .height(150.dp)
                    .scale(scale)
            )

            Spacer(Modifier.height(28.dp))

            Text(
                "SISTEMA TÁCTICO OPERATIVO",
                color = TacticalRed,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 11.sp,
                letterSpacing = 3.sp,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "BOMBEROS MIRANDA",
                color = Color.White,
                fontWeight = FontWeight.Black,
                fontSize = 28.sp,
                letterSpacing = 1.sp
            )
            Text(
                "CUARTEL CENTRAL",
                color = TacticalTextSecondary,
                fontWeight = FontWeight.Medium,
                fontSize = 13.sp,
                letterSpacing = 3.sp
            )

            Spacer(Modifier.height(8.dp))
            HorizontalDivider(
                modifier = Modifier.padding(horizontal = 40.dp),
                color = TacticalRed.copy(alpha = 0.4f),
                thickness = 1.dp
            )
            Spacer(Modifier.height(28.dp))

            OutlinedTextField(
                value = usuario,
                onValueChange = { usuario = it.trim(); errorMsg = "" },
                label = { Text("Usuario", color = TacticalTextSecondary, fontSize = 13.sp) },
                placeholder = { Text("ej: yperez", color = TacticalTextSecondary.copy(alpha = 0.6f)) },
                textStyle = androidx.compose.ui.text.TextStyle(fontFamily = FontFamily.Monospace, fontSize = 16.sp),
                modifier = Modifier.fillMaxWidth().height(64.dp),
                shape = RoundedCornerShape(14.dp),
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.None,
                    autoCorrectEnabled = false,
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next
                ),
                colors = fieldColors
            )

            Spacer(Modifier.height(14.dp))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it; errorMsg = "" },
                label = { Text("Contraseña", color = TacticalTextSecondary, fontSize = 13.sp) },
                visualTransformation = PasswordVisualTransformation(),
                textStyle = androidx.compose.ui.text.TextStyle(fontSize = 16.sp),
                modifier = Modifier.fillMaxWidth().height(64.dp),
                shape = RoundedCornerShape(14.dp),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                keyboardActions = androidx.compose.foundation.text.KeyboardActions(onDone = { entrar() }),
                colors = fieldColors
            )

            AnimatedVisibility(
                visible = errorMsg.isNotEmpty(),
                enter = fadeIn(),
                exit = fadeOut()
            ) {
                Text(
                    errorMsg,
                    color = TacticalRedBright,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 10.dp),
                    textAlign = TextAlign.Center
                )
            }

            Spacer(Modifier.height(20.dp))

            Button(
                onClick = { entrar() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp),
                colors = ButtonDefaults.buttonColors(containerColor = TacticalRed),
                shape = RoundedCornerShape(14.dp),
                enabled = !isLoading,
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 6.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.5.dp
                    )
                } else {
                    Text(
                        "ACCEDER AL COMANDO",
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp,
                        letterSpacing = 1.5.sp
                    )
                }
            }

            Spacer(Modifier.height(20.dp))
            Text(
                "¿No tiene usuario u olvidó su contraseña?\nSolicítelo al COE del Cuartel Central.",
                color = TacticalTextSecondary,
                fontSize = 12.sp,
                lineHeight = 17.sp,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(32.dp))
            Text(
                "v3.0 — REDAN CAPITAL · ZOEDAN MIRANDA",
                color = TacticalTextSecondary.copy(alpha = 0.5f),
                fontSize = 10.sp,
                letterSpacing = 1.sp
            )
        }
    }
}
