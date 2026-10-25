package com.example.bomberoscuartelcentral.viewmodel

import android.app.Application
import android.content.Context
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.bomberoscuartelcentral.data.Roles
import com.example.bomberoscuartelcentral.data.Supa
import com.example.bomberoscuartelcentral.data.Usuario
import com.example.bomberoscuartelcentral.data.escucharTabla
import com.example.bomberoscuartelcentral.data.esSinConexion
import com.example.bomberoscuartelcentral.data.json
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.exception.PostgrestRestException
import com.example.bomberoscuartelcentral.data.generarPasswordTemporal
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.postgrest.rpc
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class UsuarioViewModel(application: Application) : AndroidViewModel(application) {

    private val prefs = application.getSharedPreferences("user_cache", Context.MODE_PRIVATE)

    private val _usuarioActual = MutableStateFlow<Usuario?>(null)
    val usuarioActual: StateFlow<Usuario?> = _usuarioActual.asStateFlow()

    private val _todosUsuarios = MutableStateFlow<List<Usuario>>(emptyList())
    val todosUsuarios: StateFlow<List<Usuario>> = _todosUsuarios.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _haySesion = MutableStateFlow(false)
    val haySesion: StateFlow<Boolean> = _haySesion.asStateFlow()

    private val _debeCambiarPassword = MutableStateFlow(false)
    val debeCambiarPassword: StateFlow<Boolean> = _debeCambiarPassword.asStateFlow()

    private var perfilJob: Job? = null
    private var todosJob: Job? = null

    init {
        cargarPerfilActual()
    }

    fun cargarPerfilActual() {
        perfilJob?.cancel()
        if (_usuarioActual.value == null) _isLoading.value = true
        perfilJob = viewModelScope.launch {
            Supa.client.auth.awaitInitialization()
            val uid = Supa.uidActual
            _haySesion.value = uid != null
            _debeCambiarPassword.value = Supa.debeCambiarPassword()
            if (uid == null) {
                _usuarioActual.value = null
                _isLoading.value = false
                return@launch
            }
            // Se escucha la tabla: si un admin aprueba o cambia el rol, la app lo ve al instante
            escucharTabla("usuarios") { cargarPerfil(uid) }
        }
    }

    private suspend fun cargarPerfil(uid: String) {
        try {
            val perfil = Supa.client.from("usuarios").select { filter { eq("id", uid) } }
                .decodeSingleOrNull<Usuario>()
            _usuarioActual.value = perfil
            if (perfil != null) prefs.edit().putString("perfil_$uid", json.encodeToString(perfil)).apply()
            else prefs.edit().remove("perfil_$uid").apply()
        } catch (e: Exception) {
            Log.w("UsuarioViewModel", "No se pudo cargar el perfil", e)
            // Sin señal: se usa el último perfil conocido para no mandar a la persona a registrarse de nuevo
            if (e.esSinConexion() && _usuarioActual.value == null) {
                _usuarioActual.value = prefs.getString("perfil_$uid", null)
                    ?.let { runCatching { json.decodeFromString<Usuario>(it) }.getOrNull() }
            }
        } finally {
            _isLoading.value = false
        }
    }

    fun cargarTodosUsuarios() {
        todosJob?.cancel()
        todosJob = viewModelScope.escucharTabla("usuarios") {
            try {
                _todosUsuarios.value = Supa.client.from("usuarios").select {
                    order("equipment_number", Order.ASCENDING)
                }.decodeList<Usuario>()
            } catch (e: Exception) {
                Log.w("UsuarioViewModel", "No se pudo cargar usuarios", e)
            }
        }
    }

    fun guardarPerfil(
        usuario: Usuario,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        val uid = Supa.uidActual ?: run { onError("Sin sesión activa"); return }
        val equipo = usuario.equipmentNumber.trim().uppercase()
        if (equipo.isBlank()) { onError("Número de equipo requerido"); return }
        val perfil = usuario.copy(
            uid = uid,
            email = Supa.client.auth.currentUserOrNull()?.email ?: "",
            equipmentNumber = equipo,
            perfilCompleto = true
        )
        viewModelScope.launch {
            try {
                val guardado = Supa.client.from("usuarios").upsert(perfil) { select() }.decodeSingle<Usuario>()
                _usuarioActual.value = guardado
                onSuccess()
            } catch (e: Exception) {
                onError(mensajeError(e, "Error al guardar perfil"))
            }
        }
    }

    fun actualizarUsuario(
        usuario: Usuario,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        val actualizado = usuario.copy(equipmentNumber = usuario.equipmentNumber.trim().uppercase())
        viewModelScope.launch {
            try {
                Supa.client.from("usuarios").update(actualizado) { filter { eq("id", usuario.uid) } }
                onSuccess()
            } catch (e: Exception) {
                onError(mensajeError(e, "Error al actualizar usuario"))
            }
        }
    }

    /** Da de baja la cuenta completa: ya no puede entrar. Sus minutas se conservan con su nombre. */
    fun eliminarUsuario(
        usuario: Usuario,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            try {
                Supa.client.postgrest.rpc("eliminar_cuenta", buildJsonObject { put("p_uid", usuario.uid) })
                onSuccess()
            } catch (e: Exception) {
                onError(mensajeError(e, "Error al dar de baja"))
            }
        }
    }

    /** Asigna una contraseña temporal nueva; [onSuccess] la recibe para entregársela a la persona. */
    fun restablecerPassword(
        usuario: Usuario,
        onSuccess: (temporal: String) -> Unit,
        onError: (String) -> Unit
    ) {
        if (usuario.email.isBlank()) { onError("Esta cuenta no tiene usuario asignado"); return }
        val temporal = generarPasswordTemporal()
        viewModelScope.launch {
            try {
                Supa.client.postgrest.rpc("restablecer_password", buildJsonObject {
                    put("p_usuario", usuario.email)
                    put("p_password", temporal)
                })
                onSuccess(temporal)
            } catch (e: Exception) {
                onError(mensajeError(e, "No se pudo restablecer la contraseña"))
            }
        }
    }

    /** Primer ingreso: reemplaza la contraseña temporal por la habitual y deja de pedirla. */
    fun cambiarPassword(
        nueva: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            try {
                Supa.client.auth.updateUser { password = nueva }
                Supa.client.postgrest.rpc("password_cambiada")
                Supa.client.auth.refreshCurrentSession()
                _debeCambiarPassword.value = Supa.debeCambiarPassword()
                onSuccess()
            } catch (e: Exception) {
                val m = e.message.orEmpty()
                onError(
                    if (m.contains("same", ignoreCase = true)) "Debe ser distinta de la contraseña temporal."
                    else mensajeError(e, "No se pudo cambiar la contraseña")
                )
            }
        }
    }

    fun cerrarSesion(onListo: () -> Unit) {
        viewModelScope.launch {
            runCatching { Supa.client.auth.signOut() }
            perfilJob?.cancel()
            todosJob?.cancel()
            _usuarioActual.value = null
            _todosUsuarios.value = emptyList()
            _haySesion.value = false
            _debeCambiarPassword.value = false
            onListo()
        }
    }

    private fun mensajeError(e: Exception, porDefecto: String): String = when {
        e is PostgrestRestException && e.code == "23505" -> "Ese número de equipo ya está registrado por otra persona"
        e.esSinConexion() -> "Sin conexión. Intenta de nuevo cuando tengas señal"
        else -> e.message ?: porDefecto
    }

    fun esAdmin(): Boolean = _usuarioActual.value?.rol == Roles.ADMIN

    fun esJefeArea(): Boolean = _usuarioActual.value?.rol == Roles.JEFE_AREA

    override fun onCleared() {
        super.onCleared()
        perfilJob?.cancel()
        todosJob?.cancel()
    }
}
