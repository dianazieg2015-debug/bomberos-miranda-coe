package com.example.bomberoscuartelcentral.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.bomberoscuartelcentral.data.Cuestionario
import com.example.bomberoscuartelcentral.data.RespuestaCuestionario
import com.example.bomberoscuartelcentral.data.Supa
import com.example.bomberoscuartelcentral.data.Usuario
import com.example.bomberoscuartelcentral.data.escucharTabla
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import java.util.UUID

class CuestionarioViewModel : ViewModel() {
    private var escucha: Job? = null

    private val _cuestionarios = MutableStateFlow<List<Cuestionario>>(emptyList())
    val cuestionarios: StateFlow<List<Cuestionario>> = _cuestionarios

    private val _respondidos = MutableStateFlow<Set<String>>(emptySet())
    val respondidos: StateFlow<Set<String>> = _respondidos

    val pendientes: Int get() = _cuestionarios.value.count { c ->
        c.activo && !_respondidos.value.contains(c.id)
    }

    @Serializable
    private data class IdCuestionario(@SerialName("cuestionario_id") val cuestionarioId: String)

    fun startListening() {
        val uid = Supa.uidActual ?: return
        if (escucha?.isActive == true) return
        escucha = viewModelScope.escucharTabla("cuestionarios") {
            try {
                _cuestionarios.value = Supa.client.from("cuestionarios").select()
                    .decodeList<Cuestionario>()
                    .sortedByDescending { it.fechaCreacion }
                // Una sola consulta para saber cuáles ya respondió (antes era una por cuestionario)
                _respondidos.value = Supa.client.from("respuestas_cuestionarios")
                    .select(Columns.list("cuestionario_id")) { filter { eq("uid", uid) } }
                    .decodeList<IdCuestionario>()
                    .map { it.cuestionarioId }
                    .toSet()
            } catch (e: Exception) {
                Log.w("CuestionarioViewModel", "No se pudo cargar cuestionarios", e)
            }
        }
    }

    fun crearCuestionario(
        cuestionario: Cuestionario,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            try {
                Supa.client.from("cuestionarios").insert(cuestionario.copy(id = UUID.randomUUID().toString()))
                onSuccess()
            } catch (e: Exception) {
                onError(e.message ?: "Error")
            }
        }
    }

    fun cerrarCuestionario(id: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                Supa.client.from("cuestionarios").update({ set("activo", false) }) { filter { eq("id", id) } }
                onSuccess()
            } catch (e: Exception) {
                onError(e.message ?: "Error")
            }
        }
    }

    fun enviarRespuesta(
        cuestionario: Cuestionario,
        respuestas: Map<String, String>,
        usuario: Usuario?,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        val uid = Supa.uidActual ?: run { onError("Sin sesión"); return }
        val respuesta = RespuestaCuestionario(
            cuestionarioId = cuestionario.id,
            uid = uid,
            nombre = usuario?.displayName ?: "",
            equipo = usuario?.equipmentNumber ?: "",
            jerarquia = usuario?.jerarquia ?: "",
            area = usuario?.area ?: "",
            respuestas = respuestas,
            timestamp = System.currentTimeMillis()
        )
        viewModelScope.launch {
            try {
                Supa.client.from("respuestas_cuestionarios").upsert(respuesta)
                _respondidos.value = _respondidos.value + cuestionario.id
                onSuccess()
            } catch (e: Exception) {
                onError(e.message ?: "Error al enviar")
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        escucha?.cancel()
    }
}
