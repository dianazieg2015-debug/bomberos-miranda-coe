package com.example.bomberoscuartelcentral.data

import android.util.Log
import com.example.bomberoscuartelcentral.BuildConfig
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.exceptions.HttpRequestException
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.PostgresAction
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.realtime.RealtimeChannel
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.realtime.realtime
import io.github.jan.supabase.serializer.KotlinXSerializer
import io.github.jan.supabase.storage.Storage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import java.io.IOException
import java.util.UUID

val json = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
}

object Supa {
    val client by lazy {
        require(BuildConfig.SUPABASE_URL.startsWith("https://") && !BuildConfig.SUPABASE_URL.contains("TU-PROYECTO")) {
            "Configura supabase.url y supabase.anonKey en local.properties"
        }
        createSupabaseClient(BuildConfig.SUPABASE_URL, BuildConfig.SUPABASE_ANON_KEY) {
            defaultSerializer = KotlinXSerializer(json)
            install(Auth)
            install(Postgrest)
            install(Realtime)
            install(Storage)
        }
    }

    val uidActual: String? get() = client.auth.currentUserOrNull()?.id

    /** Nombre que el COE registró al crear la cuenta (metadatos full_name). */
    fun nombreRegistrado(): String? {
        val meta = client.auth.currentUserOrNull()?.userMetadata ?: return null
        return listOf("full_name", "name")
            .firstNotNullOfOrNull { meta[it]?.jsonPrimitive?.contentOrNull?.takeIf(String::isNotBlank) }
    }

    fun nombreDeCuenta(): String? =
        nombreRegistrado() ?: client.auth.currentUserOrNull()?.email?.let(::usuarioDeCorreo)

    /** Primer ingreso o contraseña restablecida por el COE: hay que crear la propia antes de seguir. */
    fun debeCambiarPassword(): Boolean =
        client.auth.currentUserOrNull()?.appMetadata?.get("debe_cambiar_password")?.jsonPrimitive?.booleanOrNull == true
}

// Las cuentas las crea el COE con un USUARIO; por dentro es <usuario>@cuentas.coe-miranda.test
// (mismo dominio que public.correo_de_usuario en supabase/schema.sql). Un correo completo también vale.
private const val DOMINIO_CUENTAS = "@cuentas.coe-miranda.test"

fun correoDeUsuario(usuario: String): String {
    val v = usuario.trim().lowercase()
    return if ("@" in v) v else v + DOMINIO_CUENTAS
}

fun usuarioDeCorreo(email: String): String =
    if (email.lowercase().endsWith(DOMINIO_CUENTAS)) email.dropLast(DOMINIO_CUENTAS.length) else email

/** Contraseña temporal fácil de dictar: sin 0/O ni 1/l/I. */
fun generarPasswordTemporal(): String {
    val azar = java.security.SecureRandom()
    val letras = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz"
    val cifras = "23456789"
    fun tomar(fuente: String, n: Int) = (1..n).map { fuente[azar.nextInt(fuente.length)] }.joinToString("")
    return "${tomar(letras, 4)}-${tomar(cifras, 4)}"
}

/** true si el fallo fue por falta de conexión (y no un rechazo del servidor). */
fun Throwable.esSinConexion(): Boolean =
    this is HttpRequestException || this is IOException || cause is IOException

/**
 * Carga una tabla y la vuelve a cargar cada vez que cambia en el servidor.
 * Recargar completo (en vez de aplicar cada evento) evita duplicados y desfases
 * entre la app y el panel web, y siempre respeta los permisos de la base de datos.
 */
@OptIn(FlowPreview::class)
fun CoroutineScope.escucharTabla(tabla: String, recargar: suspend () -> Unit): Job = launch {
    val canal = Supa.client.channel("$tabla-${UUID.randomUUID()}")
    val cambios = canal.postgresChangeFlow<PostgresAction>(schema = "public") { table = tabla }
    try {
        launch { recargar() }
        launch { cambios.debounce(300).collect { recargar() } }
        // Al reconectar se recarga por si hubo cambios mientras no había señal
        launch { canal.status.collect { if (it == RealtimeChannel.Status.SUBSCRIBED) recargar() } }
        canal.subscribe()
        awaitCancellation()
    } catch (e: Exception) {
        if (e is kotlinx.coroutines.CancellationException) throw e
        Log.e("Supabase", "Tiempo real de $tabla falló", e)
    } finally {
        withContext(NonCancellable) { runCatching { Supa.client.realtime.removeChannel(canal) } }
    }
}
