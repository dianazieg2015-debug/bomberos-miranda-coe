package com.example.bomberoscuartelcentral.viewmodel

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MinutaViewModel : ViewModel() {

    private fun hoy() = SimpleDateFormat("dd-MM-yyyy", Locale.getDefault()).format(Date())
    private fun ahora() = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())

    val fecha = MutableStateFlow(hoy())
    val hora = MutableStateFlow(ahora())
    val nroMinuta = MutableStateFlow("")
    val cabeceraZona = MutableStateFlow("M-01 - Z - I")
    val direccion = MutableStateFlow("")
    val resena = MutableStateFlow("")
    val comandante = MutableStateFlow("")
    val unidadVehiculo = MutableStateFlow("")
    val autoridades = MutableStateFlow("")
    val elaboradoPor = MutableStateFlow("")
    val latitud = MutableStateFlow(0.0)
    val longitud = MutableStateFlow(0.0)
    val gpsEstado = MutableStateFlow("inactivo")
    val codEscrito = MutableStateFlow("")
    val antareSeleccionados = MutableStateFlow<List<String>>(emptyList())
    val isSaving = MutableStateFlow(false)

    fun agregarAntares(item: String) {
        if (!antareSeleccionados.value.contains(item))
            antareSeleccionados.value = antareSeleccionados.value + item
    }

    fun quitarAntares(item: String) {
        antareSeleccionados.value = antareSeleccionados.value - item
    }

    fun limpiar() {
        fecha.value = hoy()
        hora.value = ahora()
        nroMinuta.value = ""
        direccion.value = ""
        resena.value = ""
        comandante.value = ""
        unidadVehiculo.value = ""
        autoridades.value = ""
        elaboradoPor.value = ""
        latitud.value = 0.0
        longitud.value = 0.0
        gpsEstado.value = "inactivo"
        codEscrito.value = ""
        antareSeleccionados.value = emptyList()
        isSaving.value = false
    }
}
