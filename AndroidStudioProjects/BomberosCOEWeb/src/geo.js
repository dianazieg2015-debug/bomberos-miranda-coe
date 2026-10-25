// Formato único de coordenadas en todo el panel (se muestra en tipografía monoespaciada)
export const formatoCoord = (lat, lon) =>
  `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? "N" : "S"} · ${Math.abs(lon).toFixed(5)}° ${lon >= 0 ? "E" : "W"}`
