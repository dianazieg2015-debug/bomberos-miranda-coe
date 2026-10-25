package com.example.bomberoscuartelcentral.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Usuario(
    @SerialName("id") val uid: String = "",
    val email: String = "",
    @SerialName("display_name") val displayName: String = "",
    @SerialName("equipment_number") val equipmentNumber: String = "",
    val area: String = "",
    val seccion: String = "",
    val rol: String = Roles.BOMBERO,
    val jerarquia: String = "",
    @SerialName("perfil_completo") val perfilCompleto: Boolean = false,
    // Lo decide un administrador; el servidor ignora este campo si lo envía otra persona
    val aprobado: Boolean = false
)
