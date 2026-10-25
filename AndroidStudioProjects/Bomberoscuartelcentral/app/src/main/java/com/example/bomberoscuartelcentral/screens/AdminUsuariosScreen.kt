package com.example.bomberoscuartelcentral.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
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
import com.example.bomberoscuartelcentral.data.usuarioDeCorreo
import com.example.bomberoscuartelcentral.ui.theme.TacticalBackground
import com.example.bomberoscuartelcentral.ui.theme.TacticalBorder
import com.example.bomberoscuartelcentral.ui.theme.TacticalCard
import com.example.bomberoscuartelcentral.ui.theme.TacticalCardAlt
import com.example.bomberoscuartelcentral.ui.theme.TacticalGold
import com.example.bomberoscuartelcentral.ui.theme.TacticalGreen
import com.example.bomberoscuartelcentral.ui.theme.TacticalRed
import com.example.bomberoscuartelcentral.ui.theme.TacticalSurface
import com.example.bomberoscuartelcentral.ui.theme.TacticalText
import com.example.bomberoscuartelcentral.ui.theme.TacticalTextSecondary
import com.example.bomberoscuartelcentral.viewmodel.UsuarioViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminUsuariosScreen(usuarioViewModel: UsuarioViewModel) {
    val todosUsuarios by usuarioViewModel.todosUsuarios.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var busqueda by remember { mutableStateOf("") }

    val usuariosFiltrados = if (busqueda.isBlank()) todosUsuarios
    else todosUsuarios.filter {
        it.equipmentNumber.contains(busqueda, ignoreCase = true) ||
        it.displayName.contains(busqueda, ignoreCase = true)
    }

    LaunchedEffect(Unit) { usuarioViewModel.cargarTodosUsuarios() }

    // Contraseña temporal recién generada: solo se muestra aquí para entregársela a la persona
    var credenciales by remember { mutableStateOf<Pair<Usuario, String>?>(null) }
    credenciales?.let { (u, temporal) ->
        val portapapeles = androidx.compose.ui.platform.LocalClipboardManager.current
        val usuarioLogin = usuarioDeCorreo(u.email)
        AlertDialog(
            onDismissRequest = { credenciales = null },
            containerColor = TacticalCard,
            title = { Text("Credenciales para entregar", color = TacticalGold, fontWeight = FontWeight.Black, fontSize = 16.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(u.displayName.ifBlank { usuarioLogin }, color = TacticalText, fontWeight = FontWeight.Bold)
                    Text("Usuario: $usuarioLogin", color = TacticalText, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace, fontSize = 16.sp)
                    Text("Contraseña temporal: $temporal", color = TacticalText, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    Text("No se volverá a mostrar. Al entrar, la app le pedirá crear su contraseña.", color = TacticalTextSecondary, fontSize = 12.sp)
                }
            },
            confirmButton = {
                Button(onClick = {
                    portapapeles.setText(androidx.compose.ui.text.AnnotatedString(
                        "Bomberos Miranda · Contraseña restablecida\n${u.displayName}\nSu usuario es: $usuarioLogin\n" +
                        "Su contraseña temporal es: $temporal\nAl entrar, la app le pedirá crear su contraseña habitual."
                    ))
                    credenciales = null
                    scope.launch { snackbarHostState.showSnackbar("✓ Copiado: péguelo en un mensaje privado") }
                }, colors = ButtonDefaults.buttonColors(containerColor = TacticalGold)) {
                    Text("COPIAR Y CERRAR", color = TacticalBackground, fontWeight = FontWeight.Black)
                }
            },
            dismissButton = {
                androidx.compose.material3.TextButton(onClick = { credenciales = null }) { Text("Cerrar", color = TacticalTextSecondary) }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.AdminPanelSettings, null, tint = TacticalRed, modifier = Modifier.size(22.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("GESTIÓN DE USUARIOS", fontWeight = FontWeight.Black, fontSize = 16.sp)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = TacticalSurface,
                    titleContentColor = TacticalText
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = TacticalBackground
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
        TextField(
            value = busqueda,
            onValueChange = { busqueda = it },
            placeholder = { Text("Buscar por equipo o nombre...", fontSize = 12.sp, color = TacticalTextSecondary) },
            leadingIcon = { Icon(Icons.Default.Search, null, tint = TacticalTextSecondary, modifier = Modifier.size(18.dp)) },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            shape = RoundedCornerShape(12.dp),
            colors = TextFieldDefaults.colors(
                focusedContainerColor = TacticalCardAlt,
                unfocusedContainerColor = TacticalCardAlt,
                focusedTextColor = TacticalText,
                unfocusedTextColor = TacticalText,
                cursorColor = TacticalRed,
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent
            ),
            singleLine = true
        )
        if (usuariosFiltrados.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxSize().padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(Icons.Default.Group, null, tint = TacticalTextSecondary, modifier = Modifier.size(64.dp))
                Spacer(Modifier.height(12.dp))
                Text(if (busqueda.isBlank()) "Sin usuarios registrados" else "Sin resultados para \"$busqueda\"", color = TacticalTextSecondary, fontSize = 14.sp)
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f).padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item { Spacer(Modifier.height(4.dp)) }
                items(usuariosFiltrados, key = { it.uid }) { usuario ->
                    UsuarioEditCard(
                        usuario = usuario,
                        onSave = { actualizado ->
                            usuarioViewModel.actualizarUsuario(
                                actualizado,
                                onSuccess = { scope.launch { snackbarHostState.showSnackbar("✓ Usuario actualizado") } },
                                onError = { scope.launch { snackbarHostState.showSnackbar("Error: $it") } }
                            )
                        },
                        onEliminar = {
                            usuarioViewModel.eliminarUsuario(
                                it,
                                onSuccess = { scope.launch { snackbarHostState.showSnackbar("✓ Usuario eliminado") } },
                                onError = { msg -> scope.launch { snackbarHostState.showSnackbar("Error: $msg") } }
                            )
                        },
                        onResetPassword = { u ->
                            usuarioViewModel.restablecerPassword(
                                u,
                                onSuccess = { temporal -> credenciales = u to temporal },
                                onError = { msg -> scope.launch { snackbarHostState.showSnackbar("Error: $msg") } }
                            )
                        }
                    )
                }
                item { Spacer(Modifier.height(16.dp)) }
            }
        }
        } // Column
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UsuarioEditCard(
    usuario: Usuario,
    onSave: (Usuario) -> Unit,
    onEliminar: (Usuario) -> Unit,
    onResetPassword: (Usuario) -> Unit
) {
    var confirmarEliminar by remember { mutableStateOf(false) }

    if (confirmarEliminar) {
        AlertDialog(
            onDismissRequest = { confirmarEliminar = false },
            containerColor = TacticalCard,
            title = { Text("Dar de baja", color = TacticalText, fontWeight = FontWeight.Black) },
            text = { Text("¿Eliminar a ${usuario.displayName}? Esta acción no se puede deshacer.", color = TacticalTextSecondary, fontSize = 13.sp) },
            confirmButton = {
                Button(onClick = { confirmarEliminar = false; onEliminar(usuario) },
                    colors = ButtonDefaults.buttonColors(containerColor = TacticalRed)) {
                    Text("ELIMINAR", fontWeight = FontWeight.Black)
                }
            },
            dismissButton = {
                androidx.compose.material3.TextButton(onClick = { confirmarEliminar = false }) {
                    Text("Cancelar", color = TacticalTextSecondary)
                }
            }
        )
    }

    var expanded by remember { mutableStateOf(false) }
    var editMode by remember { mutableStateOf(false) }
    var rolExp by remember { mutableStateOf(false) }
    var areaExp by remember { mutableStateOf(false) }
    var seccionExp by remember { mutableStateOf(false) }
    var jerarquiaExp by remember { mutableStateOf(false) }
    var rolEdit by remember { mutableStateOf(usuario.rol) }
    var areaEdit by remember { mutableStateOf(usuario.area) }
    var seccionEdit by remember { mutableStateOf(usuario.seccion) }
    var jerarquiaEdit by remember { mutableStateOf(usuario.jerarquia) }

    val rolColor = when (usuario.rol) {
        Roles.ADMIN -> TacticalGold
        Roles.JEFE_AREA -> TacticalGreen
        else -> TacticalTextSecondary
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = TacticalCard),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth().clickable { expanded = !expanded },
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Person, null, tint = TacticalRed, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        usuario.displayName.ifBlank { "Sin nombre" },
                        color = TacticalText,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                    Text(
                        buildString {
                            if (!usuario.aprobado) append("PENDIENTE · ")
                            if (usuario.jerarquia.isNotBlank()) append("${usuario.jerarquia} · ")
                            append(Roles.displayName(usuario.rol))
                            append(" · ${usuario.area.ifBlank { "Sin área" }} · Sec. ${usuario.seccion.ifBlank { "-" }}")
                        },
                        color = rolColor,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (!usuario.aprobado) {
                        Button(
                            onClick = { onSave(usuario.copy(aprobado = true)) },
                            modifier = Modifier.height(30.dp),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = TacticalGreen)
                        ) {
                            Text("APROBAR", fontSize = 10.sp, fontWeight = FontWeight.Black)
                        }
                        Spacer(Modifier.width(6.dp))
                    }
                    Icon(
                        if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        null, tint = TacticalTextSecondary, modifier = Modifier.size(20.dp)
                    )
                }
            }

            AnimatedVisibility(visible = expanded, enter = expandVertically(), exit = shrinkVertically()) {
                Column {
                    Spacer(Modifier.height(10.dp))
                    HorizontalDivider(color = TacticalBorder)
                    Spacer(Modifier.height(10.dp))

                    Row(modifier = Modifier.fillMaxWidth()) {
                        InfoChipSmall("Equipo", usuario.equipmentNumber.ifBlank { "—" })
                        Spacer(Modifier.width(8.dp))
                        InfoChipSmall("Usuario", usuarioDeCorreo(usuario.email).ifBlank { "—" })
                    }
                    Spacer(Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("EDITAR DATOS", color = TacticalRed, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp)
                        IconButton(onClick = { editMode = !editMode; if (!editMode) { rolEdit = usuario.rol; areaEdit = usuario.area; seccionEdit = usuario.seccion; jerarquiaEdit = usuario.jerarquia } }) {
                            Icon(Icons.Default.Edit, null, tint = if (editMode) TacticalRed else TacticalTextSecondary, modifier = Modifier.size(18.dp))
                        }
                    }

                    if (editMode) {
                        Spacer(Modifier.height(8.dp))

                        ExposedDropdownMenuBox(expanded = rolExp, onExpandedChange = { rolExp = it }, modifier = Modifier.fillMaxWidth()) {
                            OutlinedTextField(
                                value = Roles.displayName(rolEdit), onValueChange = {}, readOnly = true,
                                label = { Text("Rol", fontSize = 11.sp) },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = rolExp) },
                                modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                colors = adminFieldColors()
                            )
                            ExposedDropdownMenu(expanded = rolExp, onDismissRequest = { rolExp = false }, containerColor = TacticalCardAlt) {
                                Roles.TODOS.forEach { rol ->
                                    DropdownMenuItem(text = { Text(Roles.displayName(rol), color = TacticalText) }, onClick = { rolEdit = rol; rolExp = false })
                                }
                            }
                        }
                        Spacer(Modifier.height(8.dp))

                        ExposedDropdownMenuBox(expanded = areaExp, onExpandedChange = { areaExp = it }, modifier = Modifier.fillMaxWidth()) {
                            OutlinedTextField(
                                value = areaEdit, onValueChange = {}, readOnly = true,
                                label = { Text("Área", fontSize = 11.sp) },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = areaExp) },
                                modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                colors = adminFieldColors()
                            )
                            ExposedDropdownMenu(expanded = areaExp, onDismissRequest = { areaExp = false }, containerColor = TacticalCardAlt) {
                                Areas.TODAS.forEach { area ->
                                    DropdownMenuItem(text = { Text(area, color = TacticalText) }, onClick = { areaEdit = area; areaExp = false })
                                }
                            }
                        }
                        Spacer(Modifier.height(8.dp))

                        ExposedDropdownMenuBox(expanded = seccionExp, onExpandedChange = { seccionExp = it }, modifier = Modifier.fillMaxWidth()) {
                            OutlinedTextField(
                                value = seccionEdit, onValueChange = {}, readOnly = true,
                                label = { Text("Sección", fontSize = 11.sp) },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = seccionExp) },
                                modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                colors = adminFieldColors()
                            )
                            ExposedDropdownMenu(expanded = seccionExp, onDismissRequest = { seccionExp = false }, containerColor = TacticalCardAlt) {
                                Secciones.TODAS.forEach { sec ->
                                    DropdownMenuItem(text = { Text("Sección $sec", color = TacticalText) }, onClick = { seccionEdit = sec; seccionExp = false })
                                }
                            }
                        }
                        Spacer(Modifier.height(8.dp))

                        ExposedDropdownMenuBox(expanded = jerarquiaExp, onExpandedChange = { jerarquiaExp = it }, modifier = Modifier.fillMaxWidth()) {
                            OutlinedTextField(
                                value = jerarquiaEdit.ifBlank { "Sin jerarquía" }, onValueChange = {}, readOnly = true,
                                label = { Text("Jerarquía", fontSize = 11.sp) },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = jerarquiaExp) },
                                modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                colors = adminFieldColors()
                            )
                            ExposedDropdownMenu(expanded = jerarquiaExp, onDismissRequest = { jerarquiaExp = false }, containerColor = TacticalCardAlt) {
                                Jerarquias.TODAS.forEach { j ->
                                    DropdownMenuItem(text = { Text(j, color = TacticalText) }, onClick = { jerarquiaEdit = j; jerarquiaExp = false })
                                }
                            }
                        }
                        Spacer(Modifier.height(12.dp))

                        Button(
                            onClick = {
                                onSave(usuario.copy(rol = rolEdit, area = areaEdit, seccion = seccionEdit, jerarquia = jerarquiaEdit))
                                editMode = false
                            },
                            modifier = Modifier.fillMaxWidth().height(44.dp),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = TacticalRed)
                        ) {
                            Icon(Icons.Default.Save, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("GUARDAR CAMBIOS", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }

                        Spacer(Modifier.height(4.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (usuario.email.isNotBlank()) {
                                androidx.compose.material3.OutlinedButton(
                                    onClick = { onResetPassword(usuario) },
                                    modifier = Modifier.weight(1f).height(40.dp),
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = TacticalGold),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, TacticalGold.copy(alpha = 0.5f))
                                ) {
                                    Icon(Icons.Default.Email, null, modifier = Modifier.size(14.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Nueva contraseña", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            androidx.compose.material3.OutlinedButton(
                                onClick = { confirmarEliminar = true },
                                modifier = Modifier.weight(1f).height(40.dp),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = TacticalRed),
                                border = androidx.compose.foundation.BorderStroke(1.dp, TacticalRed.copy(alpha = 0.5f))
                            ) {
                                Icon(Icons.Default.Delete, null, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Dar de baja", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun InfoChipSmall(label: String, value: String) {
    Column(
        modifier = Modifier
            .background(TacticalCardAlt, RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp)
    ) {
        Text(label, color = TacticalTextSecondary, fontSize = 10.sp)
        Text(value, color = TacticalText, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun adminFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = TacticalRed,
    unfocusedBorderColor = TacticalBorder,
    focusedTextColor = TacticalText,
    unfocusedTextColor = TacticalText,
    focusedLabelColor = TacticalRed,
    unfocusedLabelColor = TacticalTextSecondary,
    cursorColor = TacticalRed,
    focusedContainerColor = TacticalCard,
    unfocusedContainerColor = TacticalCard
)
