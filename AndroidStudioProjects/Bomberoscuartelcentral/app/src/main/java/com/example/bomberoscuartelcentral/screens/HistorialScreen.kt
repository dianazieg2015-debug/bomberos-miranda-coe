package com.example.bomberoscuartelcentral.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.SuggestionChipDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bomberoscuartelcentral.data.Reporte
import com.example.bomberoscuartelcentral.data.Usuario
import com.example.bomberoscuartelcentral.data.antaresMap
import com.example.bomberoscuartelcentral.ui.theme.TacticalBackground
import com.example.bomberoscuartelcentral.ui.theme.TacticalBorder
import com.example.bomberoscuartelcentral.ui.theme.TacticalCard
import com.example.bomberoscuartelcentral.ui.theme.TacticalCardAlt
import com.example.bomberoscuartelcentral.ui.theme.TacticalGreen
import com.example.bomberoscuartelcentral.ui.theme.TacticalRed
import com.example.bomberoscuartelcentral.ui.theme.TacticalSurface
import com.example.bomberoscuartelcentral.ui.theme.TacticalText
import com.example.bomberoscuartelcentral.ui.theme.TacticalTextSecondary
import com.example.bomberoscuartelcentral.data.Roles
import com.example.bomberoscuartelcentral.viewmodel.ReporteViewModel
import com.example.bomberoscuartelcentral.viewmodel.UsuarioViewModel
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistorialScreen(viewModel: ReporteViewModel, usuarioViewModel: UsuarioViewModel) {
    val reportes by viewModel.reportes.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val cargandoMas by viewModel.cargandoMas.collectAsState()
    val usuario by usuarioViewModel.usuarioActual.collectAsState()
    var query by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf("") }

    val reportesFiltrados = if (query.isBlank()) reportes else reportes.filter { r ->
        r.nroMinuta.contains(query, ignoreCase = true) ||
        r.autorNombre.contains(query, ignoreCase = true) ||
        r.elaboradoPor.contains(query, ignoreCase = true) ||
        r.autorEquipo.contains(query, ignoreCase = true)
    }

    val subtitulo = when (usuario?.rol) {
        Roles.BOMBERO -> "Tus reportes · Tiempo real"
        Roles.JEFE_AREA -> "Área ${usuario?.area ?: ""} · Tiempo real"
        else -> "${reportes.size} reporte(s) · Tiempo real"
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "HISTORIAL OPERATIVO",
                            fontWeight = FontWeight.Black,
                            fontSize = 16.sp,
                            color = TacticalRed,
                            letterSpacing = 1.sp
                        )
                        Text(
                            subtitulo,
                            fontSize = 10.sp,
                            color = TacticalGreen,
                            letterSpacing = 0.5.sp
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TacticalSurface)
            )
        },
        containerColor = TacticalBackground
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            TextField(
                value = query,
                onValueChange = { query = it },
                placeholder = { Text("Buscar por código, nombre o equipo...", fontSize = 12.sp, color = TacticalTextSecondary) },
                leadingIcon = { Icon(Icons.Default.Search, null, tint = TacticalTextSecondary, modifier = Modifier.size(18.dp)) },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(12.dp),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = TacticalCard,
                    unfocusedContainerColor = TacticalCard,
                    focusedTextColor = TacticalText,
                    unfocusedTextColor = TacticalText,
                    cursorColor = TacticalRed,
                    focusedIndicatorColor = androidx.compose.ui.graphics.Color.Transparent,
                    unfocusedIndicatorColor = androidx.compose.ui.graphics.Color.Transparent
                ),
                singleLine = true
            )
            Box(modifier = Modifier.weight(1f)) {
            when {
                isLoading -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        CircularProgressIndicator(color = TacticalRed, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(16.dp))
                        Text("Sincronizando...", color = TacticalTextSecondary, fontSize = 13.sp)
                    }
                }

                reportesFiltrados.isEmpty() && !isLoading -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.History,
                            contentDescription = null,
                            tint = TacticalTextSecondary.copy(alpha = 0.3f),
                            modifier = Modifier.size(72.dp)
                        )
                        Spacer(Modifier.height(16.dp))
                        Text("Sin reportes en el historial", color = TacticalTextSecondary, fontSize = 15.sp, fontWeight = FontWeight.Medium)
                        Text("Los reportes guardados aparecerán aquí", color = TacticalTextSecondary.copy(alpha = 0.6f), fontSize = 12.sp)
                    }
                }

                else -> {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        item { Spacer(Modifier.height(8.dp)) }
                        items(reportesFiltrados, key = { it.id }) { reporte ->
                            HistorialReporteCard(
                                reporte = reporte,
                                viewModel = viewModel,
                                usuario = usuario
                            )
                        }
                        // Paginado: las minutas más antiguas se traen de 50 en 50
                        if (viewModel.hayMas) {
                            item(key = "cargar-mas") {
                                androidx.compose.material3.OutlinedButton(
                                    onClick = { viewModel.cargarMas() },
                                    enabled = !cargandoMas,
                                    modifier = Modifier.fillMaxWidth().height(56.dp).padding(top = 4.dp),
                                    shape = RoundedCornerShape(14.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.5.dp, TacticalBorder)
                                ) {
                                    if (cargandoMas) {
                                        CircularProgressIndicator(color = TacticalRed, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                                    } else {
                                        Text(
                                            "CARGAR 50 MÁS  ·  ${reportes.size} de ${viewModel.totalReportes}",
                                            color = TacticalText, fontWeight = FontWeight.Bold, fontSize = 13.sp
                                        )
                                    }
                                }
                            }
                        }
                        item { Spacer(Modifier.height(24.dp)) }
                    }
                }
            }
            } // Box weight(1f)
        } // Column
    }
}

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun HistorialReporteCard(reporte: Reporte, viewModel: ReporteViewModel, usuario: Usuario? = null) {
    val puedeEditar = usuario != null && (usuario.uid == reporte.uid || usuario.rol == Roles.ADMIN)
    var expanded by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }
    var editNroMinuta by remember { mutableStateOf(reporte.nroMinuta) }
    var editDireccion by remember { mutableStateOf(reporte.direccion) }
    var editResena by remember { mutableStateOf(reporte.resena) }
    var editComandante by remember { mutableStateOf(reporte.comandante) }
    var editUnidad by remember { mutableStateOf(reporte.unidad) }
    var editAutoridades by remember { mutableStateOf(reporte.autoridades) }
    val editAntares = remember { androidx.compose.runtime.mutableStateListOf<String>().also { it.addAll(reporte.antares) } }
    var antaresBusqueda by remember { mutableStateOf("") }
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = !expanded },
        colors = CardDefaults.cardColors(containerColor = TacticalCard),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(3.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(TacticalRed.copy(alpha = 0.15f), RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Schedule, contentDescription = null, tint = TacticalRed, modifier = Modifier.size(20.dp))
                    }
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(reporte.fecha, color = TacticalTextSecondary, fontSize = 11.sp)
                            Text("  ·  ", color = TacticalBorder, fontSize = 11.sp)
                            Text(reporte.hora, color = TacticalTextSecondary, fontSize = 11.sp)
                        }
                        if (reporte.nroMinuta.isNotEmpty()) {
                            Text(
                                "COD: ${reporte.nroMinuta}  ·  ${reporte.estacion}",
                                color = TacticalRed,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        // Las correcciones hechas desde el COE llegan como minuta nueva
                        if (reporte.esCorreccion) {
                            Text(
                                "CORRECCIÓN COE",
                                color = TacticalGreen,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.ExtraBold,
                                letterSpacing = 1.sp
                            )
                        }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (puedeEditar) {
                        IconButton(
                            onClick = { showEditDialog = true },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.Edit, contentDescription = "Editar", tint = TacticalTextSecondary.copy(alpha = 0.7f), modifier = Modifier.size(16.dp))
                        }
                        IconButton(
                            onClick = { showDeleteDialog = true },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = "Eliminar", tint = TacticalRed.copy(alpha = 0.7f), modifier = Modifier.size(16.dp))
                        }
                    }
                    Icon(
                        if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                        tint = TacticalTextSecondary,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }

            if (reporte.antares.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    reporte.antares.forEach { antare ->
                        SuggestionChip(
                            onClick = {},
                            label = { Text(antare, fontSize = 9.sp, color = Color.White) },
                            colors = SuggestionChipDefaults.suggestionChipColors(containerColor = TacticalRed.copy(alpha = 0.75f)),
                            border = null,
                            modifier = Modifier.height(26.dp)
                        )
                    }
                }
            }

            if (reporte.direccion.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = TacticalTextSecondary, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(
                        reporte.direccion,
                        color = TacticalText,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = if (expanded) Int.MAX_VALUE else 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            AnimatedVisibility(
                visible = expanded,
                enter = expandVertically(),
                exit = shrinkVertically()
            ) {
                Column {
                    if (reporte.resena.isNotEmpty()) {
                        Spacer(Modifier.height(10.dp))
                        HorizontalDivider(color = TacticalBorder, thickness = 0.5.dp)
                        Spacer(Modifier.height(10.dp))
                        Text("RESEÑA", color = TacticalRed, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.5.sp)
                        Spacer(Modifier.height(4.dp))
                        Text(reporte.resena, color = TacticalText, fontSize = 12.sp, lineHeight = 18.sp)
                    }
                    if (reporte.comandante.isNotEmpty() || reporte.unidad.isNotEmpty() || reporte.elaboradoPor.isNotEmpty()) {
                        Spacer(Modifier.height(10.dp))
                        HorizontalDivider(color = TacticalBorder, thickness = 0.5.dp)
                        Spacer(Modifier.height(10.dp))
                        Text("PERSONAL", color = TacticalRed, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.5.sp)
                        Spacer(Modifier.height(6.dp))
                        Row(modifier = Modifier.fillMaxWidth()) {
                            Icon(Icons.Default.Person, contentDescription = null, tint = TacticalTextSecondary, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(6.dp))
                            Column {
                                if (reporte.comandante.isNotEmpty()) PersonalRow("Cdte:", reporte.comandante)
                                if (reporte.unidad.isNotEmpty()) PersonalRow("Unidad:", reporte.unidad)
                                if (reporte.elaboradoPor.isNotEmpty()) PersonalRow("Receptor:", reporte.elaboradoPor)
                            }
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                }
            }
        }
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            containerColor = TacticalCard,
            title = { Text("¿Eliminar minuta?", color = TacticalText, fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Text(
                    "COD: ${reporte.nroMinuta.ifEmpty { "—" }}\nEsta acción no se puede deshacer.",
                    color = TacticalTextSecondary, fontSize = 13.sp, lineHeight = 20.sp
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    showDeleteDialog = false
                    viewModel.eliminarReporte(reporte.id, onSuccess = {}, onError = {})
                }) { Text("ELIMINAR", color = TacticalRed, fontWeight = FontWeight.Black) }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Cancelar", color = TacticalTextSecondary)
                }
            }
        )
    }

    if (showEditDialog) {
        val fieldColors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = TacticalRed, unfocusedBorderColor = TacticalBorder,
            focusedTextColor = TacticalText, unfocusedTextColor = TacticalText,
            cursorColor = TacticalRed, focusedContainerColor = TacticalBackground,
            unfocusedContainerColor = TacticalBackground
        )
        val sugerenciasAntares = if (antaresBusqueda.isBlank()) emptyMap()
            else antaresMap.filter {
                it.key.startsWith(antaresBusqueda) || it.value.contains(antaresBusqueda, ignoreCase = true)
            }.entries.take(5).associate { it.key to it.value }
        AlertDialog(
            onDismissRequest = { showEditDialog = false },
            containerColor = TacticalCard,
            title = { Text("Editar Minuta", color = TacticalText, fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(value = editNroMinuta, onValueChange = { editNroMinuta = it }, label = { Text("Código", fontSize = 12.sp) }, colors = fieldColors, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = editDireccion, onValueChange = { editDireccion = it }, label = { Text("Dirección", fontSize = 12.sp) }, colors = fieldColors, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = editResena, onValueChange = { editResena = it }, label = { Text("Nota", fontSize = 12.sp) }, colors = fieldColors, minLines = 2, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = editAutoridades, onValueChange = { editAutoridades = it }, label = { Text("Autoridades en el Sitio", fontSize = 12.sp) }, colors = fieldColors, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = editComandante, onValueChange = { editComandante = it }, label = { Text("Comandante de Escena", fontSize = 12.sp) }, colors = fieldColors, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = editUnidad, onValueChange = { editUnidad = it }, label = { Text("Unidades", fontSize = 12.sp) }, colors = fieldColors, singleLine = true, modifier = Modifier.fillMaxWidth())
                    Text("ANTARES", color = TacticalRed, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp)
                    if (editAntares.isNotEmpty()) {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            editAntares.toList().forEach { a ->
                                SuggestionChip(
                                    onClick = { editAntares.remove(a) },
                                    label = { Text("✕  $a", fontSize = 9.sp, color = Color.White) },
                                    colors = SuggestionChipDefaults.suggestionChipColors(containerColor = TacticalRed.copy(alpha = 0.8f)),
                                    border = null, modifier = Modifier.height(26.dp)
                                )
                            }
                        }
                    }
                    OutlinedTextField(value = antaresBusqueda, onValueChange = { antaresBusqueda = it },
                        label = { Text("Agregar antares", fontSize = 12.sp) }, colors = fieldColors,
                        singleLine = true, modifier = Modifier.fillMaxWidth())
                    if (sugerenciasAntares.isNotEmpty()) {
                        Column {
                            sugerenciasAntares.forEach { (cod, nombre) ->
                                val item = "$cod - $nombre"
                                TextButton(onClick = {
                                    if (!editAntares.contains(item)) editAntares.add(item)
                                    antaresBusqueda = ""
                                }, modifier = Modifier.fillMaxWidth()) {
                                    Text(item, fontSize = 11.sp, color = TacticalText, modifier = Modifier.fillMaxWidth())
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    showEditDialog = false
                    viewModel.actualizarReporte(
                        reporte.id,
                        mapOf("nroMinuta" to editNroMinuta, "direccion" to editDireccion,
                              "resena" to editResena, "comandante" to editComandante,
                              "unidad" to editUnidad, "autoridades" to editAutoridades,
                              "antares" to editAntares.toList()),
                        onSuccess = {}, onError = {}
                    )
                }) { Text("GUARDAR", color = TacticalRed, fontWeight = FontWeight.Black) }
            },
            dismissButton = {
                TextButton(onClick = { showEditDialog = false }) { Text("Cancelar", color = TacticalTextSecondary) }
            }
        )
    }
}

@Composable
fun PersonalRow(label: String, value: String) {
    Row(modifier = Modifier.padding(bottom = 2.dp)) {
        Text(label, color = TacticalTextSecondary, fontSize = 11.sp, modifier = Modifier.width(60.dp))
        Text(value, color = TacticalText, fontSize = 11.sp, fontWeight = FontWeight.Medium)
    }
}
