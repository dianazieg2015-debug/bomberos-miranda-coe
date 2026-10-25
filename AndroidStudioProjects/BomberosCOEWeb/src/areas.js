// Color único por área operativa: el mismo en feed, gráficas, tabla y mapa.
// Son colores de categoría (barra lateral, punto, etiqueta); los colores de estado
// (rojo emergencia, ámbar pendiente, verde disponible) son las variables --t-* de index.css.

// Valores brillantes: para el mapa WebGL, que necesita hex y siempre tiene fondo oscuro
export const COLOR_AREA = {
  "INCENDIO":       "#FF453A",
  "RESCATE":        "#4C9BFF",
  "APH":            "#30D158",
  "MATPEL":         "#FFB020",
  "PREVENCIÓN":     "#BF5AF2",
  "LOGÍSTICA":      "#40C8E0",
  "ADMINISTRACIÓN": "#FF6BB5",
}
export const COLOR_SIN_AREA = "#A3ABB8"

// Para la interfaz: variable CSS que se oscurece sola en el tema claro (contraste ≥ 4.6:1)
const VARIABLE_AREA = {
  "INCENDIO": "--area-incendio", "RESCATE": "--area-rescate", "APH": "--area-aph", "MATPEL": "--area-matpel",
  "PREVENCIÓN": "--area-prevencion", "LOGÍSTICA": "--area-logistica", "ADMINISTRACIÓN": "--area-administracion",
}
export const colorArea = (area) => `var(${VARIABLE_AREA[area] || "--area-sin"})`
