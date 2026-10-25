package com.example.bomberoscuartelcentral.screens

import android.content.Intent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bomberoscuartelcentral.data.Cuestionario
import com.example.bomberoscuartelcentral.data.Pregunta
import com.example.bomberoscuartelcentral.data.Roles
import com.example.bomberoscuartelcentral.ui.theme.*
import com.example.bomberoscuartelcentral.viewmodel.CuestionarioViewModel
import com.example.bomberoscuartelcentral.viewmodel.UsuarioViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CuestionariosScreen(
    cuestionarioViewModel: CuestionarioViewModel,
    usuarioViewModel: UsuarioViewModel
) {
    val cuestionarios by cuestionarioViewModel.cuestionarios.collectAsState()
    val respondidos by cuestionarioViewModel.respondidos.collectAsState()
    val usuario by usuarioViewModel.usuarioActual.collectAsState()
    val esAdmin = usuario?.rol == Roles.ADMIN
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    var cuestionarioSeleccionado by remember { mutableStateOf<Cuestionario?>(null) }
    var mostrarCrear by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { cuestionarioViewModel.startListening() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Assignment, null, tint = TacticalRed, modifier = Modifier.size(22.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("CUESTIONARIOS", fontWeight = FontWeight.Black, fontSize = 16.sp)
                    }
                },
                actions = {
                    if (esAdmin) {
                        IconButton(onClick = { mostrarCrear = true }) {
                            Icon(Icons.Default.Add, null, tint = TacticalRed)
                        }
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
        if (cuestionarios.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Assignment, null, tint = TacticalTextSecondary, modifier = Modifier.size(64.dp))
                    Spacer(Modifier.height(12.dp))
                    Text("No hay cuestionarios activos", color = TacticalTextSecondary, fontSize = 14.sp)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                item { Spacer(Modifier.height(8.dp)) }
                items(cuestionarios, key = { it.id }) { c ->
                    val yaRespondido = respondidos.contains(c.id)
                    CuestionarioCard(
                        cuestionario = c,
                        yaRespondido = yaRespondido,
                        esAdmin = esAdmin,
                        onResponder = { cuestionarioSeleccionado = c },
                        onCerrar = {
                            cuestionarioViewModel.cerrarCuestionario(c.id,
                                onSuccess = { scope.launch { snackbarHostState.showSnackbar("Cuestionario cerrado") } },
                                onError = { scope.launch { snackbarHostState.showSnackbar("Error: $it") } }
                            )
                        }
                    )
                }
                item { Spacer(Modifier.height(16.dp)) }
            }
        }
    }

    cuestionarioSeleccionado?.let { c ->
        ResponderCuestionarioDialog(
            cuestionario = c,
            onDismiss = { cuestionarioSeleccionado = null },
            onEnviar = { respuestas, soloWhatsApp ->
                if (!soloWhatsApp) {
                    cuestionarioViewModel.enviarRespuesta(c, respuestas, usuario,
                        onSuccess = {
                            cuestionarioSeleccionado = null
                            scope.launch { snackbarHostState.showSnackbar("✓ Respuesta enviada al COE") }
                        },
                        onError = { scope.launch { snackbarHostState.showSnackbar("Error: $it") } }
                    )
                } else {
                    cuestionarioViewModel.enviarRespuesta(c, respuestas, usuario,
                        onSuccess = {
                            cuestionarioSeleccionado = null
                            scope.launch { snackbarHostState.showSnackbar("✓ Enviado al COE") }
                        },
                        onError = {}
                    )
                }
            },
            onEnviarWhatsApp = { texto ->
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    setPackage("com.whatsapp")
                    putExtra(Intent.EXTRA_TEXT, texto)
                }
                try {
                    cuestionarioSeleccionado = null
                }  catch (_: Exception) {}
            }
        )
    }

    if (mostrarCrear) {
        CrearCuestionarioDialog(
            onDismiss = { mostrarCrear = false },
            onCreate = { nuevo ->
                cuestionarioViewModel.crearCuestionario(nuevo,
                    onSuccess = {
                        mostrarCrear = false
                        scope.launch { snackbarHostState.showSnackbar("✓ Cuestionario publicado") }
                    },
                    onError = { scope.launch { snackbarHostState.showSnackbar("Error: $it") } }
                )
            }
        )
    }
}

@Composable
private fun CuestionarioCard(
    cuestionario: Cuestionario,
    yaRespondido: Boolean,
    esAdmin: Boolean,
    onResponder: () -> Unit,
    onCerrar: () -> Unit
) {
    val fmt = remember { SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()) }
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = TacticalCard),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.size(10.dp).background(
                        if (cuestionario.activo) TacticalGreen else TacticalTextSecondary,
                        CircleShape
                    )
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    cuestionario.titulo,
                    color = TacticalText,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    modifier = Modifier.weight(1f)
                )
                if (yaRespondido) {
                    Icon(Icons.Default.CheckCircle, null, tint = TacticalGreen, modifier = Modifier.size(20.dp))
                }
            }
            if (cuestionario.descripcion.isNotBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(cuestionario.descripcion, color = TacticalTextSecondary, fontSize = 12.sp)
            }
            Spacer(Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.QuestionAnswer, null, tint = TacticalTextSecondary, modifier = Modifier.size(13.dp))
                Spacer(Modifier.width(4.dp))
                Text("${cuestionario.preguntas.size} preguntas", color = TacticalTextSecondary, fontSize = 11.sp)
                Spacer(Modifier.width(12.dp))
                Icon(Icons.Default.Schedule, null, tint = TacticalTextSecondary, modifier = Modifier.size(13.dp))
                Spacer(Modifier.width(4.dp))
                Text(fmt.format(Date(cuestionario.fechaCreacion)), color = TacticalTextSecondary, fontSize = 11.sp)
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (cuestionario.activo && !yaRespondido) {
                    Button(
                        onClick = onResponder,
                        modifier = Modifier.weight(1f).height(40.dp),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = TacticalRed)
                    ) {
                        Icon(Icons.Default.Edit, null, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("RESPONDER", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                } else if (yaRespondido) {
                    Box(
                        modifier = Modifier.weight(1f).height(40.dp)
                            .background(TacticalGreen.copy(alpha = 0.15f), RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("✓ Ya respondiste", color = TacticalGreen, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
                if (esAdmin && cuestionario.activo) {
                    OutlinedButton(
                        onClick = onCerrar,
                        modifier = Modifier.height(40.dp),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = TacticalTextSecondary),
                        border = androidx.compose.foundation.BorderStroke(1.dp, TacticalBorder)
                    ) {
                        Icon(Icons.Default.Close, null, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Cerrar", fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ResponderCuestionarioDialog(
    cuestionario: Cuestionario,
    onDismiss: () -> Unit,
    onEnviar: (Map<String, String>, Boolean) -> Unit,
    onEnviarWhatsApp: (String) -> Unit
) {
    val respuestas = remember { mutableStateMapOf<String, String>() }
    val context = LocalContext.current

    androidx.compose.ui.window.Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth().heightIn(max = 620.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = TacticalCard)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(cuestionario.titulo, color = TacticalText, fontWeight = FontWeight.Black, fontSize = 16.sp, modifier = Modifier.weight(1f))
                    IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Close, null, tint = TacticalTextSecondary)
                    }
                }
                HorizontalDivider(color = TacticalBorder)
                Column(
                    modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    cuestionario.preguntas.forEach { pregunta ->
                        Column {
                            Text(pregunta.texto, color = TacticalText, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                            Spacer(Modifier.height(8.dp))
                            if (pregunta.tipo == Pregunta.TIPO_MULTIPLE) {
                                pregunta.opciones.forEach { opcion ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().clickable {
                                            respuestas[pregunta.id] = opcion
                                        }.padding(vertical = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        RadioButton(
                                            selected = respuestas[pregunta.id] == opcion,
                                            onClick = { respuestas[pregunta.id] = opcion },
                                            colors = RadioButtonDefaults.colors(selectedColor = TacticalRed, unselectedColor = TacticalBorder)
                                        )
                                        Spacer(Modifier.width(8.dp))
                                        Text(opcion, color = TacticalText, fontSize = 13.sp)
                                    }
                                }
                            } else {
                                OutlinedTextField(
                                    value = respuestas[pregunta.id] ?: "",
                                    onValueChange = { respuestas[pregunta.id] = it },
                                    modifier = Modifier.fillMaxWidth(),
                                    minLines = 2,
                                    shape = RoundedCornerShape(10.dp),
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
                        }
                    }
                }
                HorizontalDivider(color = TacticalBorder)
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { onEnviar(respuestas.toMap(), false) },
                        modifier = Modifier.fillMaxWidth().height(46.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = TacticalRed)
                    ) {
                        Icon(Icons.Default.Send, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("ENVIAR AL COE", fontWeight = FontWeight.Black, fontSize = 13.sp)
                    }
                    OutlinedButton(
                        onClick = {
                            val texto = buildString {
                                appendLine("*RESPUESTA DE CUESTIONARIO*")
                                appendLine("*${cuestionario.titulo}*")
                                appendLine()
                                cuestionario.preguntas.forEach { p ->
                                    appendLine("*${p.texto}*")
                                    appendLine(respuestas[p.id] ?: "(sin respuesta)")
                                    appendLine()
                                }
                            }
                            onEnviar(respuestas.toMap(), false)
                            val intent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                setPackage("com.whatsapp")
                                putExtra(Intent.EXTRA_TEXT, texto)
                            }
                            context.startActivity(intent)
                        },
                        modifier = Modifier.fillMaxWidth().height(46.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = TacticalGreen),
                        border = androidx.compose.foundation.BorderStroke(1.5.dp, TacticalGreen)
                    ) {
                        Icon(Icons.Default.Share, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("ENVIAR + WHATSAPP", fontWeight = FontWeight.Black, fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CrearCuestionarioDialog(
    onDismiss: () -> Unit,
    onCreate: (Cuestionario) -> Unit
) {
    var titulo by remember { mutableStateOf("") }
    var descripcion by remember { mutableStateOf("") }
    val preguntas = remember { mutableStateListOf<Pregunta>() }
    var errorMsg by remember { mutableStateOf("") }

    androidx.compose.ui.window.Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth().heightIn(max = 680.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = TacticalCard)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("CREAR CUESTIONARIO", color = TacticalRed, fontWeight = FontWeight.Black, fontSize = 15.sp, modifier = Modifier.weight(1f))
                    IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Close, null, tint = TacticalTextSecondary)
                    }
                }
                HorizontalDivider(color = TacticalBorder)
                Column(
                    modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = titulo,
                        onValueChange = { titulo = it },
                        label = { Text("Título del cuestionario *", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = adminFieldColorsQ()
                    )
                    OutlinedTextField(
                        value = descripcion,
                        onValueChange = { descripcion = it },
                        label = { Text("Descripción (opcional)", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = adminFieldColorsQ()
                    )

                    if (preguntas.isNotEmpty()) {
                        HorizontalDivider(color = TacticalBorder)
                        preguntas.forEachIndexed { i, p ->
                            PreguntaEditor(
                                index = i,
                                pregunta = p,
                                onChange = { preguntas[i] = it },
                                onDelete = { preguntas.removeAt(i) }
                            )
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = {
                                preguntas.add(Pregunta(id = UUID.randomUUID().toString(), tipo = Pregunta.TIPO_TEXTO))
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = TacticalText),
                            border = androidx.compose.foundation.BorderStroke(1.dp, TacticalBorder)
                        ) {
                            Icon(Icons.Default.Add, null, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Texto libre", fontSize = 11.sp)
                        }
                        OutlinedButton(
                            onClick = {
                                preguntas.add(Pregunta(id = UUID.randomUUID().toString(), tipo = Pregunta.TIPO_MULTIPLE, opciones = listOf("Sí", "No")))
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = TacticalText),
                            border = androidx.compose.foundation.BorderStroke(1.dp, TacticalBorder)
                        ) {
                            Icon(Icons.Default.CheckBox, null, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Múltiple", fontSize = 11.sp)
                        }
                    }

                    if (errorMsg.isNotEmpty()) Text(errorMsg, color = TacticalRed, fontSize = 12.sp)
                }
                HorizontalDivider(color = TacticalBorder)
                Button(
                    onClick = {
                        when {
                            titulo.isBlank() -> errorMsg = "Ingresa el título"
                            preguntas.isEmpty() -> errorMsg = "Agrega al menos una pregunta"
                            preguntas.any { it.texto.isBlank() } -> errorMsg = "Todas las preguntas deben tener texto"
                            else -> onCreate(
                                Cuestionario(
                                    titulo = titulo.trim(),
                                    descripcion = descripcion.trim(),
                                    preguntas = preguntas.toList(),
                                    fechaCreacion = System.currentTimeMillis(),
                                    activo = true
                                )
                            )
                        }
                    },
                    modifier = Modifier.fillMaxWidth().padding(12.dp).height(46.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TacticalRed)
                ) {
                    Icon(Icons.Default.Send, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("PUBLICAR CUESTIONARIO", fontWeight = FontWeight.Black, fontSize = 13.sp)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PreguntaEditor(
    index: Int,
    pregunta: Pregunta,
    onChange: (Pregunta) -> Unit,
    onDelete: () -> Unit
) {
    val opcionesEdit = remember(pregunta.id) { mutableStateListOf(*pregunta.opciones.toTypedArray()) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = TacticalCardAlt)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Pregunta ${index + 1} · ${if (pregunta.tipo == Pregunta.TIPO_MULTIPLE) "Opción múltiple" else "Texto libre"}",
                    color = TacticalRed,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    modifier = Modifier.weight(1f)
                )
                IconButton(onClick = onDelete, modifier = Modifier.size(24.dp)) {
                    Icon(Icons.Default.Delete, null, tint = TacticalTextSecondary, modifier = Modifier.size(16.dp))
                }
            }
            OutlinedTextField(
                value = pregunta.texto,
                onValueChange = { onChange(pregunta.copy(texto = it)) },
                placeholder = { Text("Texto de la pregunta", color = TacticalTextSecondary, fontSize = 12.sp) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                colors = adminFieldColorsQ()
            )
            if (pregunta.tipo == Pregunta.TIPO_MULTIPLE) {
                opcionesEdit.forEachIndexed { i, op ->
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        OutlinedTextField(
                            value = op,
                            onValueChange = { opcionesEdit[i] = it; onChange(pregunta.copy(opciones = opcionesEdit.toList())) },
                            placeholder = { Text("Opción ${i + 1}", color = TacticalTextSecondary, fontSize = 11.sp) },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            colors = adminFieldColorsQ()
                        )
                        if (opcionesEdit.size > 2) {
                            IconButton(onClick = { opcionesEdit.removeAt(i); onChange(pregunta.copy(opciones = opcionesEdit.toList())) }, modifier = Modifier.size(24.dp)) {
                                Icon(Icons.Default.Remove, null, tint = TacticalTextSecondary, modifier = Modifier.size(14.dp))
                            }
                        }
                    }
                }
                TextButton(onClick = { opcionesEdit.add(""); onChange(pregunta.copy(opciones = opcionesEdit.toList())) }) {
                    Icon(Icons.Default.Add, null, modifier = Modifier.size(14.dp), tint = TacticalRed)
                    Spacer(Modifier.width(4.dp))
                    Text("Agregar opción", color = TacticalRed, fontSize = 12.sp)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun adminFieldColorsQ() = OutlinedTextFieldDefaults.colors(
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
