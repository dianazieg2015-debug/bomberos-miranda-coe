package com.example.bomberoscuartelcentral.viewmodel

import android.app.Application
import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.bomberoscuartelcentral.data.COLUMNAS_REPORTE
import com.example.bomberoscuartelcentral.data.Reporte
import com.example.bomberoscuartelcentral.data.Roles
import com.example.bomberoscuartelcentral.data.Supa
import com.example.bomberoscuartelcentral.data.Usuario
import com.example.bomberoscuartelcentral.data.escucharTabla
import com.example.bomberoscuartelcentral.data.esSinConexion
import com.example.bomberoscuartelcentral.data.json
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Count
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

// Paginado: se traen de 50 en 50 ("Cargar 50 más" en el historial)
private const val TAMANO_PAGINA = 50L
private const val TAG = "ReporteViewModel"

class ReporteViewModel(application: Application) : AndroidViewModel(application) {

    // Copia local: permite ver el historial y guardar minutas sin señal
    private val prefs = application.getSharedPreferences("reportes_cache", Context.MODE_PRIVATE)

    private val _reportes = MutableStateFlow<List<Reporte>>(emptyList())
    val reportes: StateFlow<List<Reporte>> = _reportes.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _pendientesEnvio = MutableStateFlow(leerPendientes().size)
    val pendientesEnvio: StateFlow<Int> = _pendientesEnvio.asStateFlow()

    private var escucha: Job? = null
    private var usuarioActual: Usuario? = null
    private val mutexPendientes = Mutex()

    private val _hoy = SimpleDateFormat("dd-MM-yyyy", Locale.getDefault()).format(Date())

    private var limite = TAMANO_PAGINA
    // Total real en el servidor (la lista local puede tener solo las primeras páginas)
    private val _totalServidor = MutableStateFlow<Int?>(null)
    private val _cargandoMas = MutableStateFlow(false)
    val cargandoMas: StateFlow<Boolean> = _cargandoMas.asStateFlow()
    val hayMas: Boolean get() = (_totalServidor.value ?: 0) > _reportes.value.size

    val totalReportes: Int get() = _totalServidor.value ?: _reportes.value.size
    val reportesHoy: Int get() = _reportes.value.count { it.fecha == _hoy }
    val reportesRecientes: List<Reporte> get() = _reportes.value.take(5)

    fun startListeningWithRole(usuario: Usuario?) {
        escucha?.cancel()
        usuarioActual = usuario
        limite = TAMANO_PAGINA
        _totalServidor.value = null
        // Nunca mezclar la lista de un rol/usuario anterior con la nueva
        _reportes.value = if (usuario != null) leerCache(usuario.uid) else emptyList()
        if (usuario == null || !usuario.aprobado) {
            _isLoading.value = false
            return
        }
        _isLoading.value = _reportes.value.isEmpty()
        escucha = viewModelScope.escucharTabla("reportes") { cargar(usuario) }
        viewModelScope.launch { reintentarPendientes() }
    }

    private suspend fun cargar(usuario: Usuario) {
        try {
            val porRol: io.github.jan.supabase.postgrest.query.filter.PostgrestFilterBuilder.() -> Unit = {
                when (usuario.rol) {
                    Roles.BOMBERO -> eq("uid", usuario.uid)
                    Roles.JEFE_AREA -> eq("area", usuario.area)
                }
            }
            val lista = Supa.client.from("reportes").select {
                filter(porRol)
                order("timestamp_ms", Order.DESCENDING)
                limit(limite)
            }.decodeList<Reporte>().distinctBy { it.id }
            // El servidor devuelve el total exacto aunque se pida una sola fila
            val total = Supa.client.from("reportes").select(Columns.list("id")) {
                count(Count.EXACT)
                filter(porRol)
                limit(1)
            }.countOrNull()?.toInt()
            if (usuarioActual?.uid != usuario.uid) return
            _totalServidor.value = total
            _reportes.value = lista
            guardarCache(usuario.uid, lista)
        } catch (e: Exception) {
            Log.w(TAG, "No se pudo cargar reportes", e)
        } finally {
            _isLoading.value = false
        }
    }

    private suspend fun recargar() {
        usuarioActual?.let { cargar(it) }
    }

    /** Trae las 50 minutas siguientes (más antiguas). */
    fun cargarMas() {
        if (_cargandoMas.value || !hayMas) return
        limite += TAMANO_PAGINA
        _cargandoMas.value = true
        viewModelScope.launch {
            recargar()
            _cargandoMas.value = false
        }
    }

    /**
     * Guarda la minuta. Sin señal queda en cola en el teléfono y se envía sola al
     * recuperar conexión; [onSuccess] recibe `enLinea = false` en ese caso.
     */
    fun guardarReporte(
        reporte: Reporte,
        usuario: Usuario?,
        onSuccess: (id: String, enLinea: Boolean) -> Unit,
        onError: (String) -> Unit
    ) {
        // uid, autor, área y sección los fija el servidor con el perfil de quien envía
        val reporteFinal = reporte.copy(
            id = UUID.randomUUID().toString(),
            uid = null,
            timestamp = System.currentTimeMillis(),
            autorNombre = usuario?.displayName ?: reporte.elaboradoPor,
            autorEquipo = usuario?.equipmentNumber ?: "",
            area = usuario?.area ?: "",
            seccion = usuario?.seccion ?: ""
        )
        viewModelScope.launch {
            try {
                insertar(reporteFinal)
                recargar()
                onSuccess(reporteFinal.id, true)
            } catch (e: Exception) {
                if (e.esSinConexion()) {
                    mutexPendientes.withLock { escribirPendientes(leerPendientes() + reporteFinal) }
                    _reportes.value = listOf(reporteFinal) + _reportes.value
                    onSuccess(reporteFinal.id, false)
                } else {
                    onError(e.message ?: "Error al guardar en base de datos")
                }
            }
        }
    }

    // Idempotente: reintentar la misma minuta nunca crea un duplicado
    private suspend fun insertar(reporte: Reporte) {
        Supa.client.from("reportes").upsert(reporte) { ignoreDuplicates = true }
    }

    suspend fun reintentarPendientes() = mutexPendientes.withLock {
        val pendientes = leerPendientes()
        if (pendientes.isEmpty()) return@withLock
        val restantes = pendientes.filterNot { r ->
            try {
                insertar(r); true
            } catch (e: Exception) {
                Log.w(TAG, "Pendiente ${r.id} sigue sin enviarse", e)
                false
            }
        }
        escribirPendientes(restantes)
        if (restantes.size < pendientes.size) recargar()
    }

    fun eliminarReporte(id: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                Supa.client.from("reportes").delete { filter { eq("id", id) } }
                recargar()
                onSuccess()
            } catch (e: Exception) {
                onError(e.message ?: "Error al eliminar")
            }
        }
    }

    fun actualizarReporte(id: String, campos: Map<String, Any>, onSuccess: () -> Unit, onError: (String) -> Unit) {
        val fila = buildJsonObject {
            campos.forEach { (campo, valor) -> put(COLUMNAS_REPORTE[campo] ?: campo, aJson(valor)) }
        }
        viewModelScope.launch {
            try {
                Supa.client.from("reportes").update(fila) { filter { eq("id", id) } }
                recargar()
                onSuccess()
            } catch (e: Exception) {
                onError(e.message ?: "Error al actualizar")
            }
        }
    }

    /** Sube las fotos y las asocia a la minuta. [onComplete] recibe cuántas fallaron. */
    fun subirImagenes(reporteId: String, bitmaps: List<Bitmap>, onComplete: (fallidas: Int) -> Unit) {
        if (bitmaps.isEmpty()) { onComplete(0); return }
        viewModelScope.launch {
            val bucket = Supa.client.storage.from("reportes")
            val urls = bitmaps.mapIndexed { index, bitmap ->
                async {
                    try {
                        val bytes = withContext(Dispatchers.Default) {
                            ByteArrayOutputStream().also { bitmap.compress(Bitmap.CompressFormat.JPEG, 85, it) }.toByteArray()
                        }
                        val ruta = "$reporteId/imagen_$index.jpg"
                        bucket.upload(ruta, bytes) { upsert = true }
                        bucket.publicUrl(ruta)
                    } catch (e: Exception) {
                        Log.w(TAG, "Falló la foto $index de $reporteId", e)
                        null
                    }
                }
            }.awaitAll()
            val subidas = urls.filterNotNull()
            if (subidas.isNotEmpty()) {
                actualizarReporte(reporteId, mapOf("imagenesUrls" to subidas), {}, {})
            }
            onComplete(bitmaps.size - subidas.size)
        }
    }

    private fun aJson(valor: Any?): JsonElement = when (valor) {
        null -> JsonNull
        is String -> JsonPrimitive(valor)
        is Number -> JsonPrimitive(valor)
        is Boolean -> JsonPrimitive(valor)
        is List<*> -> JsonArray(valor.map { aJson(it) })
        else -> JsonPrimitive(valor.toString())
    }

    private fun leerCache(uid: String): List<Reporte> =
        prefs.getString("lista_$uid", null)
            ?.let { runCatching { json.decodeFromString<List<Reporte>>(it) }.getOrNull() }
            ?: emptyList()

    private fun guardarCache(uid: String, lista: List<Reporte>) {
        prefs.edit().putString("lista_$uid", json.encodeToString(lista)).apply()
    }

    private fun leerPendientes(): List<Reporte> =
        prefs.getString("pendientes", null)
            ?.let { runCatching { json.decodeFromString<List<Reporte>>(it) }.getOrNull() }
            ?: emptyList()

    private fun escribirPendientes(lista: List<Reporte>) {
        prefs.edit().putString("pendientes", json.encodeToString(lista)).apply()
        _pendientesEnvio.value = lista.size
    }

    override fun onCleared() {
        super.onCleared()
        escucha?.cancel()
    }
}
