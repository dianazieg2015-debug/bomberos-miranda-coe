// Geometría del radar de zona: círculos, sectores y distancias sobre la Tierra (coordenadas [lon, lat]).
const RADIO_TIERRA_KM = 6371
const rad = (g) => (g * Math.PI) / 180
const grados = (r) => (r * 180) / Math.PI

// Centros aproximados de los municipios/ciudades de Miranda para el selector de zona
export const ZONAS = [
  { id: "los-teques",     nombre: "Los Teques",                 centro: [-67.0411, 10.3447] },
  { id: "san-antonio",    nombre: "San Antonio de los Altos",   centro: [-66.9590, 10.3830] },
  { id: "carrizal",       nombre: "Carrizal",                   centro: [-66.9880, 10.3500] },
  { id: "chacao",         nombre: "Chacao",                     centro: [-66.8530, 10.4950] },
  { id: "baruta",         nombre: "Baruta",                     centro: [-66.8750, 10.4320] },
  { id: "el-hatillo",     nombre: "El Hatillo",                 centro: [-66.8250, 10.4250] },
  { id: "petare",         nombre: "Petare (Sucre)",             centro: [-66.8100, 10.4840] },
  { id: "guarenas",       nombre: "Guarenas",                   centro: [-66.6100, 10.4700] },
  { id: "guatire",        nombre: "Guatire",                    centro: [-66.5420, 10.4747] },
  { id: "charallave",     nombre: "Charallave",                 centro: [-66.8620, 10.2430] },
  { id: "cua",            nombre: "Cúa",                        centro: [-66.8850, 10.1650] },
  { id: "ocumare",        nombre: "Ocumare del Tuy",            centro: [-66.7800, 10.1190] },
  { id: "santa-teresa",   nombre: "Santa Teresa del Tuy",       centro: [-66.6640, 10.2330] },
  { id: "higuerote",      nombre: "Higuerote",                  centro: [-66.0990, 10.4867] },
]

export const RADIOS_KM = [2, 5, 10]
export const RADIO_MIN_KM = 0.5
export const RADIO_MAX_KM = 30

export const limitarRadio = (km) => Math.min(RADIO_MAX_KM, Math.max(RADIO_MIN_KM, Math.round(Number(km) * 10) / 10 || RADIO_MIN_KM))

// Pide JSON con límite de tiempo: una conexión lenta no debe dejar el buscador colgado
async function pedirJson(url, ms = 12000) {
  const control = new AbortController()
  const t = setTimeout(() => control.abort(), ms)
  try {
    const resp = await fetch(url, { signal: control.signal })
    if (!resp.ok) throw new Error(`respondió ${resp.status}`)
    return await resp.json()
  } finally {
    clearTimeout(t)
  }
}

// Nominatim (OpenStreetMap): máximo 1 búsqueda por segundo y nada de autocompletar en cada tecla,
// por eso solo se busca al pulsar Enter o la lupa. Prioriza resultados dentro de Miranda.
async function buscarNominatim(q) {
  const params = new URLSearchParams({
    format: "jsonv2", q, countrycodes: "ve", limit: "5", "accept-language": "es",
    viewbox: "-67.45,10.85,-65.80,9.60", bounded: "0",
  })
  const datos = await pedirJson(`https://nominatim.openstreetmap.org/search?${params}`)
  return datos.map(d => ({
    nombre: d.display_name.split(",").slice(0, 3).join(",").trim(),
    detalle: d.display_name,
    centro: [Number(d.lon), Number(d.lat)],
  }))
}

// Photon (también OpenStreetMap): respaldo si Nominatim falla, está bloqueado o no encuentra nada
async function buscarPhoton(q) {
  const params = new URLSearchParams({ q, limit: "5", bbox: "-73.4,0.6,-59.8,12.2" })  // Venezuela
  params.append("lat", "10.30"); params.append("lon", "-66.75")  // prioriza cerca de Miranda
  const datos = await pedirJson(`https://photon.komoot.io/api/?${params}`)
  return (datos.features || [])
    .filter(f => !f.properties.countrycode || f.properties.countrycode === "VE")
    .map(f => {
      const p = f.properties
      const partes = [p.name, p.street && (p.housenumber ? `${p.street} ${p.housenumber}` : p.street), p.district || p.locality, p.city || p.county, p.state]
        .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)
      return { nombre: partes.slice(0, 3).join(", "), detalle: partes.join(", "), centro: f.geometry.coordinates }
    })
}

/** Busca una dirección en Venezuela; si el primer buscador falla o no encuentra nada, usa el segundo. */
export async function buscarDireccion(texto) {
  const q = (texto || "").trim()
  if (q.length < 3) return []
  let fallo = null
  for (const buscador of [buscarNominatim, buscarPhoton]) {
    try {
      const r = await buscador(q)
      if (r.length) return r
    } catch (e) {
      fallo = e
    }
  }
  if (fallo) throw fallo
  return []
}

export function distanciaKm([lon1, lat1], [lon2, lat2]) {
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(a))
}

/** Rumbo desde el norte, en grados 0–360, en sentido horario */
export function rumbo([lon1, lat1], [lon2, lat2]) {
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2))
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1))
  return (grados(Math.atan2(y, x)) + 360) % 360
}

function destino([lon, lat], km, rumboGrados) {
  const d = km / RADIO_TIERRA_KM
  const b = rad(rumboGrados)
  const lat2 = Math.asin(Math.sin(rad(lat)) * Math.cos(d) + Math.cos(rad(lat)) * Math.sin(d) * Math.cos(b))
  const lon2 = rad(lon) + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(rad(lat)), Math.cos(d) - Math.sin(rad(lat)) * Math.sin(lat2))
  return [grados(lon2), grados(lat2)]
}

export function anillo(centro, km, puntos = 96) {
  const coords = Array.from({ length: puntos }, (_, i) => destino(centro, km, (i * 360) / puntos))
  return [...coords, coords[0]]
}

export function sector(centro, km, desde, hasta, pasos = 10) {
  const arco = Array.from({ length: pasos + 1 }, (_, i) => destino(centro, km, desde + ((hasta - desde) * i) / pasos))
  return [centro, ...arco, centro]
}

export function limitesCirculo(centro, km) {
  const n = destino(centro, km, 0), s = destino(centro, km, 180)
  const e = destino(centro, km, 90), o = destino(centro, km, 270)
  return [[o[0], s[1]], [e[0], n[1]]]
}

/** "hace 3 h", "hace 2 d"… a partir de un timestamp en ms */
export function haceCuanto(ms) {
  if (!ms) return ""
  const min = Math.max(0, Math.round((Date.now() - ms) / 60000))
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 48) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} d`
}
