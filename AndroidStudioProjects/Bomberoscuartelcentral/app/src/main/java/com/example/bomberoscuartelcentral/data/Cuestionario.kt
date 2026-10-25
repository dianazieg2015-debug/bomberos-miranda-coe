package com.example.bomberoscuartelcentral.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Cuestionario(
    val id: String = "",
    val titulo: String = "",
    val descripcion: String = "",
    val preguntas: List<Pregunta> = emptyList(),
    @SerialName("fecha_creacion") val fechaCreacion: Long = 0L,
    @SerialName("creado_por") val creadoPor: String = "",
    val activo: Boolean = true
)

@Serializable
data class Pregunta(
    val id: String = "",
    val texto: String = "",
    val tipo: String = TIPO_TEXTO,
    val opciones: List<String> = emptyList()
) {
    companion object {
        const val TIPO_TEXTO = "texto_libre"
        const val TIPO_MULTIPLE = "opcion_multiple"
    }
}

@Serializable
data class RespuestaCuestionario(
    @SerialName("cuestionario_id") val cuestionarioId: String = "",
    val uid: String = "",
    val nombre: String = "",
    val equipo: String = "",
    val jerarquia: String = "",
    val area: String = "",
    val respuestas: Map<String, String> = emptyMap(),
    @SerialName("timestamp_ms") val timestamp: Long = 0L
)
