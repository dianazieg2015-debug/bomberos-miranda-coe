package com.example.bomberoscuartelcentral.data

object Roles {
    const val BOMBERO = "bombero"
    const val JEFE_AREA = "jefeArea"
    const val ADMIN = "admin"

    val TODOS = listOf(BOMBERO, JEFE_AREA, ADMIN)

    fun displayName(rol: String): String = when (rol) {
        BOMBERO -> "Bombero"
        JEFE_AREA -> "Jefe de Área"
        ADMIN -> "Administrador"
        else -> "Sin Rol"
    }
}

object Areas {
    const val INCENDIO = "INCENDIO"
    const val RESCATE = "RESCATE"
    const val APH = "APH"
    const val MATPEL = "MATPEL"
    const val PREVENCION = "PREVENCIÓN"
    const val LOGISTICA = "LOGÍSTICA"
    const val ADMINISTRACION = "ADMINISTRACIÓN"

    val TODAS = listOf(INCENDIO, RESCATE, APH, MATPEL, PREVENCION, LOGISTICA, ADMINISTRACION)
}

object Secciones {
    val TODAS = listOf("A", "B", "C", "D")
}

object Jerarquias {
    const val BOMBERO          = "Bombero"
    const val DISTINGUIDO      = "Distinguido"
    const val CABO_SEGUNDO     = "Cabo Segundo"
    const val CABO_PRIMERO     = "Cabo Primero"
    const val SARGENTO_SEGUNDO = "Sargento Segundo"
    const val SARGENTO_PRIMERO = "Sargento Primero"
    const val SARGENTO_MAYOR   = "Sargento Mayor"
    const val TENIENTE         = "Teniente"
    const val PRIMER_TENIENTE  = "Primer Teniente"
    const val CAPITAN          = "Capitán"
    const val MAYOR            = "Mayor"
    const val TENIENTE_CORONEL = "Teniente Coronel"
    const val CORONEL          = "Coronel"
    const val GENERAL          = "General"
    const val PRIMER_GENERAL   = "Primer General"

    val TODAS = listOf(
        BOMBERO, DISTINGUIDO, CABO_SEGUNDO, CABO_PRIMERO,
        SARGENTO_SEGUNDO, SARGENTO_PRIMERO, SARGENTO_MAYOR,
        TENIENTE, PRIMER_TENIENTE, CAPITAN,
        MAYOR, TENIENTE_CORONEL, CORONEL,
        GENERAL, PRIMER_GENERAL
    )
}
