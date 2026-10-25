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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.IconButton
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.example.bomberoscuartelcentral.data.Supa
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bomberoscuartelcentral.data.Areas
import com.example.bomberoscuartelcentral.data.Jerarquias
import com.example.bomberoscuartelcentral.data.Roles
import com.example.bomberoscuartelcentral.data.Secciones
import com.example.bomberoscuartelcentral.data.Usuario
import com.example.bomberoscuartelcentral.ui.theme.TacticalBackground
import com.example.bomberoscuartelcentral.ui.theme.TacticalBorder
import com.example.bomberoscuartelcentral.ui.theme.TacticalCard
import com.example.bomberoscuartelcentral.ui.theme.TacticalRed
import com.example.bomberoscuartelcentral.ui.theme.TacticalText
import com.example.bomberoscuartelcentral.ui.theme.TacticalTextSecondary
import com.example.bomberoscuartelcentral.viewmodel.UsuarioViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileSetupScreen(
    usuarioViewModel: UsuarioViewModel,
    onProfileSaved: () -> Unit,
    onSkip: (() -> Unit)? = null
) {
    var displayName by remember { mutableStateOf("") }
    var equipmentNumber by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        val googleName = Supa.nombreRegistrado()
        if (displayName.isBlank() && !googleName.isNullOrBlank()) {
            displayName = googleName
        }
    }
    var areaSeleccionada by remember { mutableStateOf("") }
    var seccionSeleccionada by remember { mutableStateOf("") }
    var jerarquiaSeleccionada by remember { mutableStateOf("") }
    var areaExpanded by remember { mutableStateOf(false) }
    var jerarquiaExpanded by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    val scrollState = rememberScrollState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(TacticalBackground),
        contentAlignment = Alignment.Center
    ) {
        if (onSkip != null) {
            IconButton(
                onClick = onSkip,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp)
            ) {
                Icon(Icons.Default.Close, contentDescription = "Salir", tint = TacticalTextSecondary)
            }
        }
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .verticalScroll(scrollState),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                Icons.Default.AccountCircle,
                contentDescription = null,
                tint = TacticalRed,
                modifier = Modifier.size(72.dp)
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "COMPLETA TU PERFIL",
                color = TacticalRed,
                fontWeight = FontWeight.Black,
                fontSize = 20.sp,
                letterSpacing = 2.sp
            )
            Text(
                "Esta información aparecerá en tus reportes",
                color = TacticalTextSecondary,
                fontSize = 13.sp
            )
            Spacer(Modifier.height(32.dp))

            OutlinedTextField(
                value = displayName,
                onValueChange = { displayName = it },
                label = { Text("Nombre y Apellido *", fontSize = 12.sp) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = fieldColors()
            )
            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = equipmentNumber,
                onValueChange = { equipmentNumber = it.filter { c -> c.isLetterOrDigit() || c == '-' } },
                label = { Text("Número de Equipo *", fontSize = 12.sp) },
                placeholder = { Text("Ej: BOM-001", color = TacticalTextSecondary, fontSize = 12.sp) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = fieldColors()
            )
            Spacer(Modifier.height(12.dp))

            ExposedDropdownMenuBox(
                expanded = jerarquiaExpanded,
                onExpandedChange = { jerarquiaExpanded = it },
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedTextField(
                    value = jerarquiaSeleccionada,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Jerarquía *", fontSize = 12.sp) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = jerarquiaExpanded) },
                    modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = fieldColors()
                )
                ExposedDropdownMenu(
                    expanded = jerarquiaExpanded,
                    onDismissRequest = { jerarquiaExpanded = false },
                    containerColor = TacticalCard
                ) {
                    Jerarquias.TODAS.forEach { j ->
                        DropdownMenuItem(
                            text = { Text(j, color = TacticalText) },
                            onClick = { jerarquiaSeleccionada = j; jerarquiaExpanded = false }
                        )
                    }
                }
            }
            Spacer(Modifier.height(12.dp))

            ExposedDropdownMenuBox(
                expanded = areaExpanded,
                onExpandedChange = { areaExpanded = it },
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedTextField(
                    value = areaSeleccionada,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Área Operativa *", fontSize = 12.sp) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = areaExpanded) },
                    modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = fieldColors()
                )
                ExposedDropdownMenu(
                    expanded = areaExpanded,
                    onDismissRequest = { areaExpanded = false },
                    containerColor = TacticalCard
                ) {
                    Areas.TODAS.forEach { area ->
                        DropdownMenuItem(
                            text = { Text(area, color = TacticalText) },
                            onClick = { areaSeleccionada = area; areaExpanded = false }
                        )
                    }
                }
            }
            Spacer(Modifier.height(12.dp))

            Text(
                "SECCIÓN",
                color = TacticalRed,
                fontSize = 10.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 2.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 4.dp, bottom = 4.dp)
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Secciones.TODAS.forEach { sec ->
                    FilterChip(
                        selected = seccionSeleccionada == sec,
                        onClick = { seccionSeleccionada = sec },
                        label = { Text(sec, fontWeight = FontWeight.Bold) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = TacticalRed,
                            selectedLabelColor = Color.White,
                            containerColor = TacticalCard,
                            labelColor = TacticalText
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = seccionSeleccionada == sec,
                            borderColor = TacticalBorder,
                            selectedBorderColor = TacticalRed
                        )
                    )
                }
            }

            if (errorMsg.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                Text(errorMsg, color = TacticalRed, fontSize = 13.sp)
            }

            Spacer(Modifier.height(32.dp))

            Button(
                onClick = {
                    when {
                        displayName.isBlank() -> errorMsg = "Ingresa tu nombre completo"
                        equipmentNumber.isBlank() -> errorMsg = "Ingresa tu número de equipo"
                        areaSeleccionada.isBlank() -> errorMsg = "Selecciona tu área operativa"
                        seccionSeleccionada.isBlank() -> errorMsg = "Selecciona tu sección"
                        jerarquiaSeleccionada.isBlank() -> errorMsg = "Selecciona tu jerarquía"
                        else -> {
                            errorMsg = ""
                            isSaving = true
                            val usuario = Usuario(
                                displayName = displayName.trim(),
                                equipmentNumber = equipmentNumber.trim().uppercase(),
                                area = areaSeleccionada,
                                seccion = seccionSeleccionada,
                                rol = Roles.BOMBERO,
                                jerarquia = jerarquiaSeleccionada
                            )
                            usuarioViewModel.guardarPerfil(
                                usuario,
                                onSuccess = { isSaving = false; onProfileSaved() },
                                onError = { isSaving = false; errorMsg = it }
                            )
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = TacticalRed),
                enabled = !isSaving
            ) {
                if (isSaving) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                } else {
                    Text("GUARDAR Y CONTINUAR", fontWeight = FontWeight.Black, fontSize = 15.sp)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = TacticalRed,
    unfocusedBorderColor = TacticalBorder,
    focusedTextColor = TacticalText,
    unfocusedTextColor = TacticalText,
    focusedLabelColor = TacticalRed,
    unfocusedLabelColor = TacticalTextSecondary,
    cursorColor = TacticalRed,
    focusedContainerColor = TacticalBackground,
    unfocusedContainerColor = TacticalBackground
)
