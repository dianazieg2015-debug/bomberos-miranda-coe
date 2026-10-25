package com.example.bomberoscuartelcentral.screens

import android.content.ContentValues
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.net.Uri
import android.provider.MediaStore
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.GpsFixed
import androidx.compose.material.icons.filled.GpsNotFixed
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bomberoscuartelcentral.R
import com.example.bomberoscuartelcentral.data.Reporte
import com.example.bomberoscuartelcentral.data.Roles
import com.example.bomberoscuartelcentral.data.antaresMap
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
import com.example.bomberoscuartelcentral.ui.theme.TacticalWhatsApp
import com.example.bomberoscuartelcentral.viewmodel.MinutaViewModel
import com.example.bomberoscuartelcentral.viewmodel.ReporteViewModel
import com.example.bomberoscuartelcentral.viewmodel.UsuarioViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun NuevaMinutaScreen(viewModel: ReporteViewModel, usuarioViewModel: UsuarioViewModel, minutaViewModel: MinutaViewModel) {
    val context = LocalContext.current
    val scrollState = rememberScrollState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val usuario by usuarioViewModel.usuarioActual.collectAsState()

    val fecha by minutaViewModel.fecha.collectAsState()
    val hora by minutaViewModel.hora.collectAsState()
    val nroMinuta by minutaViewModel.nroMinuta.collectAsState()
    val cabeceraZona by minutaViewModel.cabeceraZona.collectAsState()
    val direccion by minutaViewModel.direccion.collectAsState()
    val resena by minutaViewModel.resena.collectAsState()
    val comandante by minutaViewModel.comandante.collectAsState()
    val unidadVehiculo by minutaViewModel.unidadVehiculo.collectAsState()
    val autoridades by minutaViewModel.autoridades.collectAsState()
    val elaboradoPor by minutaViewModel.elaboradoPor.collectAsState()
    val latitud by minutaViewModel.latitud.collectAsState()
    val longitud by minutaViewModel.longitud.collectAsState()
    val gpsEstado by minutaViewModel.gpsEstado.collectAsState()
    val antareSeleccionados by minutaViewModel.antareSeleccionados.collectAsState()
    val codEscrito by minutaViewModel.codEscrito.collectAsState()
    val isSaving by minutaViewModel.isSaving.collectAsState()
    var expanded by remember { mutableStateOf(false) }

    val sugerencias = remember(codEscrito) {
        if (codEscrito.isBlank()) emptyMap()
        else antaresMap.filter {
            it.key.startsWith(codEscrito) || it.value.contains(codEscrito, ignoreCase = true)
        }
    }

    val permisosLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { concedido ->
        if (concedido) {
            minutaViewModel.gpsEstado.value = "buscando"
            try {
                val fc = com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(context)
                fc.lastLocation.addOnSuccessListener { cached ->
                    if (cached != null) {
                        minutaViewModel.latitud.value = cached.latitude
                        minutaViewModel.longitud.value = cached.longitude
                        minutaViewModel.gpsEstado.value = "ok"
                    } else fc.getCurrentLocation(
                        com.google.android.gms.location.Priority.PRIORITY_BALANCED_POWER_ACCURACY, null
                    ).addOnSuccessListener { loc ->
                        if (loc != null) {
                            minutaViewModel.latitud.value = loc.latitude
                            minutaViewModel.longitud.value = loc.longitude
                            minutaViewModel.gpsEstado.value = "ok"
                        } else minutaViewModel.gpsEstado.value = "fallo"
                    }.addOnFailureListener { minutaViewModel.gpsEstado.value = "fallo" }
                }.addOnFailureListener { minutaViewModel.gpsEstado.value = "fallo" }
            } catch (_: Exception) { minutaViewModel.gpsEstado.value = "fallo" }
        } else minutaViewModel.gpsEstado.value = "sinPermiso"
    }

    androidx.compose.runtime.LaunchedEffect(usuario) {
        val u = usuario ?: return@LaunchedEffect
        if (minutaViewModel.elaboradoPor.value.isBlank()) {
            val nombre = u.displayName.ifBlank { "" }
            val cargo = buildString {
                if (u.jerarquia.isNotBlank()) append("${u.jerarquia} · ")
                append(Roles.displayName(u.rol))
                if (u.area.isNotBlank()) append(" · ${u.area}")
                if (u.seccion.isNotBlank()) append(" · Sec. ${u.seccion}")
                if (u.equipmentNumber.isNotBlank()) append(" · Equipo #${u.equipmentNumber}")
            }
            minutaViewModel.elaboradoPor.value = if (nombre.isNotBlank()) "$nombre | $cargo" else cargo
        }
    }

    val fusedClient = remember {
        com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(context)
    }

    val capturarGPS: () -> Unit = remember(fusedClient) {
        {
            val hasPermission = androidx.core.content.ContextCompat.checkSelfPermission(
                context, android.Manifest.permission.ACCESS_FINE_LOCATION
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            if (!hasPermission) {
                permisosLauncher.launch(android.Manifest.permission.ACCESS_FINE_LOCATION)
            } else {
                minutaViewModel.gpsEstado.value = "buscando"
                try {
                    fusedClient.lastLocation.addOnSuccessListener { cached ->
                        if (cached != null) {
                            minutaViewModel.latitud.value = cached.latitude
                            minutaViewModel.longitud.value = cached.longitude
                            minutaViewModel.gpsEstado.value = "ok"
                        } else {
                            fusedClient.getCurrentLocation(
                                com.google.android.gms.location.Priority.PRIORITY_BALANCED_POWER_ACCURACY, null
                            ).addOnSuccessListener { location ->
                                if (location != null) {
                                    minutaViewModel.latitud.value = location.latitude
                                    minutaViewModel.longitud.value = location.longitude
                                    minutaViewModel.gpsEstado.value = "ok"
                                } else minutaViewModel.gpsEstado.value = "fallo"
                            }.addOnFailureListener { minutaViewModel.gpsEstado.value = "fallo" }
                        }
                    }.addOnFailureListener { minutaViewModel.gpsEstado.value = "fallo" }
                } catch (_: Exception) { minutaViewModel.gpsEstado.value = "fallo" }
            }
        }
    }

    val listaImagenes = remember { mutableStateListOf<Bitmap>() }
    var fotoUri by remember { mutableStateOf<Uri?>(null) }

    val MAX_FOTOS = 4

    val cameraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        if (success && fotoUri != null && listaImagenes.size < MAX_FOTOS) {
            context.contentResolver.openInputStream(fotoUri!!)?.use { stream ->
                BitmapFactory.decodeStream(stream)?.let {
                    listaImagenes.add(agregarMarcaDeAgua(context, it))
                }
            }
        }
    }

    val galleryLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
        val restantes = MAX_FOTOS - listaImagenes.size
        uris.take(restantes).forEach { uri ->
            context.contentResolver.openInputStream(uri)?.use { stream ->
                BitmapFactory.decodeStream(stream)?.let { bmp ->
                    listaImagenes.add(agregarMarcaDeAgua(context, bmp))
                }
            }
        }
    }

    fun limpiarFormulario() {
        minutaViewModel.limpiar()
        listaImagenes.clear()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("NUEVO REPORTE OPERATIVO", fontWeight = FontWeight.Black, fontSize = 15.sp, color = TacticalRed, letterSpacing = 0.5.sp)
                        Text("Completa todos los campos", fontSize = 10.sp, color = TacticalTextSecondary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TacticalSurface)
            )
        },
        snackbarHost = {
            SnackbarHost(snackbarHostState) { data ->
                Snackbar(
                    snackbarData = data,
                    containerColor = TacticalGreen,
                    contentColor = Color.Black
                )
            }
        },
        containerColor = TacticalBackground
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(scrollState)
        ) {
            Spacer(Modifier.height(16.dp))

            MinutaSectionTitle("INFORMACIÓN DE CONTROL")
            Card(
                colors = CardDefaults.cardColors(containerColor = TacticalCard),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        MinutaField(fecha, { minutaViewModel.fecha.value = it }, "Fecha", Modifier.weight(1f))
                        MinutaField(hora, { minutaViewModel.hora.value = it }, "Hora", Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        MinutaField(nroMinuta, { minutaViewModel.nroMinuta.value = it }, "COD Minuta", Modifier.weight(1f))
                        MinutaField(cabeceraZona, { minutaViewModel.cabeceraZona.value = it }, "Estación", Modifier.weight(1f))
                    }
                }
            }

            Spacer(Modifier.height(20.dp))
            MinutaSectionTitle("CLASIFICACIÓN ANTARES")
            OutlinedTextField(
                value = codEscrito,
                onValueChange = { minutaViewModel.codEscrito.value = it; expanded = it.isNotEmpty() },
                placeholder = { Text("Buscar por código o nombre...", color = TacticalTextSecondary, fontSize = 13.sp) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                singleLine = true,
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TacticalRed) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = TacticalRed,
                    unfocusedBorderColor = TacticalBorder,
                    focusedTextColor = TacticalText,
                    unfocusedTextColor = TacticalText,
                    cursorColor = TacticalRed,
                    focusedContainerColor = TacticalCard,
                    unfocusedContainerColor = TacticalCard
                )
            )
            if (expanded && sugerencias.isNotEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth().heightIn(max = 220.dp).padding(top = 4.dp),
                    colors = CardDefaults.cardColors(containerColor = TacticalCardAlt),
                    shape = RoundedCornerShape(12.dp),
                    elevation = CardDefaults.cardElevation(8.dp)
                ) {
                    LazyColumn {
                        items(sugerencias.size) { index ->
                            val nro = sugerencias.keys.elementAt(index)
                            val nombre = sugerencias.values.elementAt(index)
                            ListItem(
                                headlineContent = {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(nro, color = TacticalRed, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.width(32.dp))
                                        Text(nombre, fontSize = 12.sp, color = TacticalText)
                                    }
                                },
                                modifier = Modifier.clickable {
                                    val item = "$nro - $nombre"
                                    minutaViewModel.agregarAntares(item)
                                    minutaViewModel.codEscrito.value = ""; expanded = false
                                },
                                colors = ListItemDefaults.colors(containerColor = Color.Transparent)
                            )
                        }
                    }
                }
            }
            if (antareSeleccionados.isNotEmpty()) {
                FlowRow(
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    antareSeleccionados.forEach { item ->
                        AssistChip(
                            onClick = { minutaViewModel.quitarAntares(item) },
                            label = { Text(item, color = Color.White, fontSize = 10.sp) },
                            colors = AssistChipDefaults.assistChipColors(containerColor = TacticalRed.copy(alpha = 0.85f)),
                            trailingIcon = {
                                Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(14.dp), tint = Color.White)
                            },
                            border = null
                        )
                    }
                }
            }

            Spacer(Modifier.height(20.dp))
            MinutaSectionTitle("DETALLES DEL INCIDENTE")
            Card(
                colors = CardDefaults.cardColors(containerColor = TacticalCard),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Box(modifier = Modifier.weight(1f)) {
                            MinutaField(direccion, { minutaViewModel.direccion.value = it }, "Ubicación Exacta")
                        }
                        val gpsColor = when (gpsEstado) {
                            "ok"         -> TacticalGreen
                            "buscando"   -> TacticalGold
                            "sinPermiso" -> TacticalRed
                            else         -> TacticalTextSecondary
                        }
                        val gpsIcon = if (gpsEstado == "ok") Icons.Default.GpsFixed else Icons.Default.GpsNotFixed
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            IconButton(
                                onClick = { capturarGPS() },
                                modifier = Modifier
                                    .size(48.dp)
                                    .background(gpsColor.copy(alpha = 0.12f), RoundedCornerShape(12.dp))
                            ) {
                                Icon(gpsIcon, contentDescription = "GPS", tint = gpsColor, modifier = Modifier.size(22.dp))
                            }
                            Text(
                                text = when (gpsEstado) {
                                    "ok"         -> "✓ GPS"
                                    "buscando"   -> "..."
                                    "sinPermiso" -> "Permiso"
                                    else         -> "GPS"
                                },
                                fontSize = 9.sp,
                                color = gpsColor,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    if (gpsEstado == "ok") {
                        Text(
                            text = "📍 ${String.format("%.5f", latitud)}, ${String.format("%.5f", longitud)}",
                            fontSize = 11.sp,
                            color = TacticalGreen,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    MinutaField(resena, { minutaViewModel.resena.value = it }, "Nota", Modifier.height(110.dp))
                }
            }

            Spacer(Modifier.height(20.dp))
            MinutaSectionTitle("PERSONAL A CARGO")
            Card(
                colors = CardDefaults.cardColors(containerColor = TacticalCard),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    MinutaField(autoridades, { minutaViewModel.autoridades.value = it }, "Autoridades en el Sitio (opcional)")
                    Spacer(Modifier.height(10.dp))
                    MinutaField(comandante, { minutaViewModel.comandante.value = it }, "Comandante de Escena")
                    Spacer(Modifier.height(10.dp))
                    MinutaField(unidadVehiculo, { minutaViewModel.unidadVehiculo.value = it }, "Unidades")
                    Spacer(Modifier.height(10.dp))
                    MinutaField(elaboradoPor, { minutaViewModel.elaboradoPor.value = it }, "Elaborado por")
                }
            }

            Spacer(Modifier.height(20.dp))
            MinutaSectionTitle("EVIDENCIA FOTOGRÁFICA  ${listaImagenes.size}/4")
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = {
                        if (listaImagenes.size < MAX_FOTOS) {
                            val fileName = "Minuta_${System.currentTimeMillis()}.jpg"
                            val values = ContentValues().apply {
                                put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                                put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg")
                            }
                            fotoUri = context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                            fotoUri?.let { cameraLauncher.launch(it) }
                        }
                    },
                    enabled = listaImagenes.size < MAX_FOTOS,
                    modifier = Modifier.weight(1f).height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TacticalCardAlt, contentColor = TacticalText)
                ) {
                    Icon(Icons.Default.CameraAlt, null, tint = if (listaImagenes.size < MAX_FOTOS) TacticalRed else TacticalTextSecondary)
                    Spacer(Modifier.width(8.dp))
                    Text("CÁMARA", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TacticalText)
                }
                Button(
                    onClick = { if (listaImagenes.size < MAX_FOTOS) galleryLauncher.launch("image/*") },
                    enabled = listaImagenes.size < MAX_FOTOS,
                    modifier = Modifier.weight(1f).height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TacticalCardAlt, contentColor = TacticalText)
                ) {
                    Icon(Icons.Default.PhotoLibrary, null, tint = if (listaImagenes.size < MAX_FOTOS) TacticalRed else TacticalTextSecondary)
                    Spacer(Modifier.width(8.dp))
                    Text("GALERÍA", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TacticalText)
                }
            }

            listaImagenes.chunked(2).forEach { fila ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    fila.forEach { bitmap ->
                        Box(modifier = Modifier.weight(1f).height(140.dp)) {
                            Image(
                                bitmap = bitmap.asImageBitmap(),
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize().background(Color.Black, RoundedCornerShape(10.dp)),
                                contentScale = ContentScale.Crop
                            )
                            IconButton(
                                onClick = { listaImagenes.remove(bitmap) },
                                modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).background(TacticalRed, CircleShape).size(26.dp)
                            ) {
                                Icon(Icons.Default.Close, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                            }
                        }
                    }
                    if (fila.size < 2) Spacer(Modifier.weight(1f))
                }
            }

            Spacer(Modifier.height(28.dp))

            Button(
                onClick = {
                    minutaViewModel.isSaving.value = true
                    val reporte = Reporte(
                        fecha = fecha, hora = hora, nroMinuta = nroMinuta,
                        estacion = cabeceraZona, antares = antareSeleccionados.toList(),
                        direccion = direccion, resena = resena, comandante = comandante,
                        unidad = unidadVehiculo, autoridades = autoridades, elaboradoPor = elaboradoPor,
                        latitud = latitud, longitud = longitud
                    )
                    viewModel.guardarReporte(reporte, usuario,
                        onSuccess = { reporteId, enLinea ->
                            minutaViewModel.isSaving.value = false
                            scope.launch {
                                snackbarHostState.showSnackbar(
                                    if (enLinea) "✓ Reporte guardado · subiendo fotos..."
                                    else "Sin señal: reporte en cola, se enviará al sistema al recuperar conexión. Las fotos van solo por WhatsApp."
                                )
                            }
                            val textoReporte = buildString {
                                appendLine("*Sistema Nacional de Gestión de Riesgos.*")
                                appendLine("*REDAN CAPITAL – ZOEDAN MIRANDA*")
                                appendLine("*Fecha* $fecha - *Hora:* $hora - $cabeceraZona - *Código:* $nroMinuta")
                                appendLine("*Clasificación* ${antareSeleccionados.joinToString(" / ")}")
                                appendLine("*Dirección*")
                                appendLine(direccion)
                                appendLine("*Nota:* $resena")
                                if (autoridades.isNotBlank()) appendLine("*Autoridades en el Sitio:* $autoridades")
                                appendLine("*Comandante de Escena:* $comandante")
                                appendLine("*Unidades:* $unidadVehiculo")
                                append("*Elaborado por:* $elaboradoPor")
                            }
                            val imagenesSnapshot = listaImagenes.toList()
                            limpiarFormulario()
                            enviarPorWhatsApp(context, textoReporte, imagenesSnapshot)
                            if (enLinea) {
                                viewModel.subirImagenes(reporteId, imagenesSnapshot) { fallidas ->
                                    if (fallidas > 0) scope.launch {
                                        snackbarHostState.showSnackbar("⚠ $fallidas foto(s) no se subieron al sistema (sí se enviaron por WhatsApp)")
                                    }
                                }
                            }
                        },
                        onError = { error ->
                            minutaViewModel.isSaving.value = false
                            scope.launch { snackbarHostState.showSnackbar("Error: $error") }
                        }
                    )
                },
                modifier = Modifier.fillMaxWidth().height(68.dp),
                shape = RoundedCornerShape(18.dp),
                colors = ButtonDefaults.buttonColors(containerColor = TacticalWhatsApp),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 8.dp),
                enabled = !isSaving
            ) {
                if (isSaving) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(26.dp), strokeWidth = 2.5.dp)
                    Spacer(Modifier.width(14.dp))
                    Text("GUARDANDO...", fontWeight = FontWeight.Black, fontSize = 15.sp, color = Color.White)
                } else {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, tint = Color.White)
                    Spacer(Modifier.width(12.dp))
                    Text("GUARDAR Y DESPACHAR", fontWeight = FontWeight.Black, fontSize = 15.sp, color = Color.White)
                }
            }

            Spacer(Modifier.height(36.dp))
        }
    }
}

@Composable
fun MinutaSectionTitle(text: String) {
    Text(
        text,
        color = TacticalRed,
        fontSize = 10.sp,
        fontWeight = FontWeight.ExtraBold,
        letterSpacing = 2.sp,
        modifier = Modifier.padding(start = 4.dp, bottom = 8.dp)
    )
}

@Composable
fun MinutaField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, fontSize = 11.sp, color = TacticalTextSecondary) },
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = TacticalRed,
            unfocusedBorderColor = TacticalBorder,
            focusedTextColor = TacticalText,
            unfocusedTextColor = TacticalText,
            cursorColor = TacticalRed,
            focusedContainerColor = TacticalBackground,
            unfocusedContainerColor = TacticalBackground
        )
    )
}

fun agregarMarcaDeAgua(context: android.content.Context, original: Bitmap): Bitmap {
    val mutableBitmap = original.copy(Bitmap.Config.ARGB_8888, true)
    val canvas = Canvas(mutableBitmap)
    val opts = BitmapFactory.Options().apply { inScaled = false }
    val logo = BitmapFactory.decodeResource(context.resources, R.drawable.marca_de_agua, opts)
    if (logo != null) {
        val anchoDeseado = (mutableBitmap.width * 0.25).toInt()
        val altoDeseado = (logo.height.toFloat() * anchoDeseado / logo.width).toInt()
        val left = (mutableBitmap.width - anchoDeseado - 60).toFloat()
        val top = (mutableBitmap.height - altoDeseado - 60).toFloat()
        val matrix = android.graphics.Matrix().apply {
            setScale(
                anchoDeseado.toFloat() / logo.width,
                altoDeseado.toFloat() / logo.height
            )
            postTranslate(left, top)
        }
        val paint = Paint().apply {
            isAntiAlias = true
            isFilterBitmap = true
            isDither = true
            alpha = 210
        }
        canvas.drawBitmap(logo, matrix, paint)
    }
    return mutableBitmap
}

fun enviarPorWhatsApp(context: android.content.Context, texto: String, listaBitmaps: List<Bitmap>) {
    Thread {
        try {
            val imageDir = java.io.File(context.cacheDir, "images").also { it.mkdirs() }
            val uris = ArrayList<Uri>()

            listaBitmaps.forEachIndexed { index, bitmap ->
                val file = java.io.File(imageDir, "minuta_${System.currentTimeMillis()}_$index.png")
                file.outputStream().use { stream ->
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
                }
                val uri = androidx.core.content.FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    file
                )
                uris.add(uri)
            }

            val intent = when {
                uris.isEmpty() -> Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, texto)
                }
                uris.size == 1 -> Intent(Intent.ACTION_SEND).apply {
                    type = "image/png"
                    putExtra(Intent.EXTRA_STREAM, uris[0])
                    putExtra(Intent.EXTRA_TEXT, texto)
                    clipData = android.content.ClipData.newUri(context.contentResolver, "Imagen", uris[0])
                }
                else -> Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                    type = "image/png"
                    putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
                    putExtra(Intent.EXTRA_TEXT, texto)
                    clipData = android.content.ClipData.newUri(context.contentResolver, "Imagenes", uris[0])
                        .also { clip -> uris.drop(1).forEach { clip.addItem(android.content.ClipData.Item(it)) } }
                }
            }.apply {
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            android.os.Handler(android.os.Looper.getMainLooper()).post {
                // WhatsApp normal → WhatsApp Business → selector del sistema (nunca falla en silencio)
                val enviado = listOf("com.whatsapp", "com.whatsapp.w4b").any { paquete ->
                    try {
                        context.startActivity(Intent(intent).setPackage(paquete))
                        true
                    } catch (_: android.content.ActivityNotFoundException) {
                        false
                    }
                }
                if (!enviado) {
                    context.startActivity(
                        Intent.createChooser(intent, "Enviar minuta").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    )
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }.start()
}
