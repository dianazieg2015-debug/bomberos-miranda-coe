package com.example.bomberoscuartelcentral.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Reporte(
    val id: String = "",
    val fecha: String = "",
    val hora: String = "",
    @SerialName("nro_minuta") val nroMinuta: String = "",
    val estacion: String = "",
    val antares: List<String> = emptyList(),
    val direccion: String = "",
    val resena: String = "",
    val comandante: String = "",
    val unidad: String = "",
    val autoridades: String = "",
    @SerialName("elaborado_por") val elaboradoPor: String = "",
    @SerialName("timestamp_ms") val timestamp: Long = 0L,
    val uid: String? = null,
    val estado: String = "ACTIVO",
    @SerialName("autor_nombre") val autorNombre: String = "",
    @SerialName("autor_equipo") val autorEquipo: String = "",
    val area: String = "",
    val seccion: String = "",
    val latitud: Double = 0.0,
    val longitud: Double = 0.0,
    @SerialName("imagenes_urls") val imagenesUrls: List<String> = emptyList(),
    @SerialName("es_correccion") val esCorreccion: Boolean = false,
    @SerialName("minuta_original_id") val minutaOriginalId: String? = null
)

/** Nombres de columna para actualizaciones parciales hechas con mapas de campos. */
val COLUMNAS_REPORTE = mapOf(
    "nroMinuta" to "nro_minuta",
    "elaboradoPor" to "elaborado_por",
    "imagenesUrls" to "imagenes_urls",
    "autorNombre" to "autor_nombre",
    "autorEquipo" to "autor_equipo",
    "esCorreccion" to "es_correccion",
    "minutaOriginalId" to "minuta_original_id"
)
