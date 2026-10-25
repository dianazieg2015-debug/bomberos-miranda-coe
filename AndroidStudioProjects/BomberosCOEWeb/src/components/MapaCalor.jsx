import { useEffect, useMemo, useRef, useState } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { Crosshair, Radar, Box, Square, MousePointerClick, X, Search, MapPin } from "lucide-react"
import { formatoCoord } from "../geo"
import { ZONAS, RADIOS_KM, RADIO_MIN_KM, RADIO_MAX_KM, limitarRadio, buscarDireccion, distanciaKm, rumbo, anillo, sector, limitesCirculo, haceCuanto } from "../radar"
import { COLOR_AREA, COLOR_SIN_AREA } from "../areas"

// Mapa táctico WebGL: vista isométrica, calor de incidentes, edificios 3D y radar de zona.
const ESTILOS = {
  oscuro: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  claro: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
}
const CENTRO_MIRANDA = [-66.62, 10.28]
const VISTA_3D = { pitch: 55, bearing: -17 }
const VUELTA_RADAR_MS = 4000
const ESTELA_GRADOS = 42
const TRAMOS_ESTELA = 6
const DIA_MS = 24 * 3600 * 1000


const MIRANDA = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [[
      [-67.40, 10.32], [-67.35, 10.52], [-67.18, 10.72],
      [-66.97, 10.79], [-66.69, 10.76], [-66.48, 10.73],
      [-66.19, 10.60], [-66.00, 10.41], [-65.87, 10.18],
      [-65.90, 9.88],  [-66.14, 9.68],  [-66.48, 9.64],
      [-66.84, 9.74],  [-67.10, 9.93],  [-67.25, 10.15],
      [-67.40, 10.32]
    ]]
  }
}

const VACIO = { type: "FeatureCollection", features: [] }
const tieneGPS = (r) => r.latitud && r.longitud && r.latitud !== 0 && r.longitud !== 0
const reducirMovimiento = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

function aGeoJSON(reportes) {
  return {
    type: "FeatureCollection",
    features: reportes.filter(tieneGPS).map(r => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [r.longitud, r.latitud] },
      properties: {
        codigo: r.nroMinuta || "SIN CÓDIGO",
        area: r.area || "",
        color: COLOR_AREA[r.area] || COLOR_SIN_AREA,
        antares: (r.antares || []).join(" / "),
        direccion: r.direccion || "",
        cuando: `${r.fecha || ""} ${r.hora || ""}`.trim(),
        lat: r.latitud,
        lon: r.longitud,
      },
    })),
  }
}

function geoZona(zona) {
  if (!zona) return VACIO
  const { centro, km } = zona
  return {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { tipo: "area" }, geometry: { type: "Polygon", coordinates: [anillo(centro, km)] } },
      ...[1 / 3, 2 / 3, 1].map(f => ({
        type: "Feature", properties: { tipo: f === 1 ? "borde" : "anillo" },
        geometry: { type: "LineString", coordinates: anillo(centro, km * f) },
      })),
      ...[0, 90].map(g => ({
        type: "Feature", properties: { tipo: "anillo" },
        geometry: { type: "LineString", coordinates: [sector(centro, km, g + 180, g + 180, 1)[1], sector(centro, km, g, g, 1)[1]] },
      })),
    ],
  }
}

function geoHaz(zona, angulo) {
  if (!zona) return VACIO
  const paso = ESTELA_GRADOS / TRAMOS_ESTELA
  return {
    type: "FeatureCollection",
    features: Array.from({ length: TRAMOS_ESTELA }, (_, i) => ({
      type: "Feature",
      properties: { o: 0.42 * (1 - i / TRAMOS_ESTELA) },
      geometry: { type: "Polygon", coordinates: [sector(zona.centro, zona.km, angulo - (i + 1) * paso, angulo - i * paso, 4)] },
    })),
  }
}

// Cada incidente brilla al pasar el haz y se apaga durante la vuelta
function geoEcos(ecos, angulo) {
  return {
    type: "FeatureCollection",
    features: ecos.map(e => {
      const atras = (angulo - e.rumbo + 360) % 360
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [e.r.longitud, e.r.latitud] },
        properties: { brillo: Math.max(0, 1 - atras / 160), color: COLOR_AREA[e.r.area] || COLOR_SIN_AREA },
      }
    }),
  }
}

function agregarCapas(mapa, datos, oscuro) {
  mapa.addSource("miranda", { type: "geojson", data: MIRANDA })
  mapa.addLayer({ id: "miranda-relleno", type: "fill", source: "miranda", paint: { "fill-color": "#FF3B30", "fill-opacity": 0.04 } })
  mapa.addLayer({
    id: "miranda-borde", type: "line", source: "miranda",
    paint: { "line-color": "#FF5A1F", "line-width": 1.5, "line-opacity": 0.6, "line-dasharray": [3, 2] },
  })

  // Edificios en relieve al acercarse (si la base de mapa los trae)
  if (mapa.getSource("protomaps")) {
    try {
      mapa.addLayer({
        id: "edificios-3d", type: "fill-extrusion", source: "protomaps", "source-layer": "buildings", minzoom: 14,
        paint: {
          "fill-extrusion-color": oscuro ? "#1C2027" : "#D4D8DE",
          "fill-extrusion-height": ["coalesce", ["get", "height"], 8],
          "fill-extrusion-opacity": 0.85,
        },
      })
    } catch { /* base sin edificios: se omite */ }
  }

  // Radar de zona: debajo de los incidentes para no taparlos
  mapa.addSource("radar-zona", { type: "geojson", data: VACIO })
  mapa.addSource("radar-haz", { type: "geojson", data: VACIO })
  mapa.addLayer({
    id: "radar-area", type: "fill", source: "radar-zona", filter: ["==", ["get", "tipo"], "area"],
    paint: { "fill-color": "#00E676", "fill-opacity": oscuro ? 0.05 : 0.08 },
  })
  mapa.addLayer({
    id: "radar-anillos", type: "line", source: "radar-zona", filter: ["!=", ["get", "tipo"], "area"],
    paint: {
      "line-color": "#00E676",
      "line-width": ["case", ["==", ["get", "tipo"], "borde"], 1.6, 0.8],
      "line-opacity": ["case", ["==", ["get", "tipo"], "borde"], 0.75, 0.3],
    },
  })
  mapa.addLayer({
    id: "radar-haz", type: "fill", source: "radar-haz",
    paint: { "fill-color": "#00E676", "fill-opacity": ["get", "o"] },
  })

  mapa.addSource("incidentes", { type: "geojson", data: datos })
  mapa.addLayer({
    id: "incidentes-calor", type: "heatmap", source: "incidentes", maxzoom: 16,
    paint: {
      "heatmap-weight": 0.6,
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 6, 0.6, 15, 2],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 6, 14, 15, 42],
      "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.85, 16, 0.25],
      "heatmap-color": [
        "interpolate", ["linear"], ["heatmap-density"],
        0, "rgba(0,0,0,0)",
        0.2, "#5C0F0F",
        0.4, "#B3261E",
        0.6, "#FF3B30",
        0.8, "#FF7A1A",
        1, "#FFD60A",
      ],
    },
  })
  mapa.addLayer({
    id: "incidentes-halo", type: "circle", source: "incidentes", minzoom: 9,
    paint: { "circle-radius": 14, "circle-color": ["get", "color"], "circle-opacity": 0.25, "circle-blur": 1 },
  })
  mapa.addLayer({
    id: "incidentes-puntos", type: "circle", source: "incidentes", minzoom: 9,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3.5, 15, 7],
      "circle-color": ["get", "color"],
      "circle-stroke-color": oscuro ? "#0B0D10" : "#FFFFFF",
      "circle-stroke-width": 1.5,
    },
  })

  // Ecos: los incidentes dentro del radio se iluminan cuando el haz pasa por encima
  mapa.addSource("radar-ecos", { type: "geojson", data: VACIO })
  mapa.addLayer({
    id: "radar-ecos", type: "circle", source: "radar-ecos",
    paint: {
      "circle-radius": ["+", 5, ["*", 16, ["get", "brillo"]]],
      "circle-color": ["get", "color"],
      "circle-opacity": ["*", 0.75, ["get", "brillo"]],
      "circle-blur": 0.6,
      "circle-stroke-color": "#00E676",
      "circle-stroke-width": 1.5,
      "circle-stroke-opacity": ["get", "brillo"],
    },
  })
}

// Contenido del globo como DOM (nunca HTML con texto del usuario)
function contenidoPopup(p) {
  const div = document.createElement("div")
  div.className = "popup-tactico"
  const fila = (texto, clase) => {
    if (!texto) return
    const el = document.createElement("div")
    el.className = clase
    el.textContent = texto
    div.appendChild(el)
  }
  fila(p.codigo, "pt-codigo")
  fila(p.area, "pt-area")
  fila(p.antares, "pt-antares")
  fila(p.direccion, "pt-direccion")
  fila(formatoCoord(p.lat, p.lon), "pt-coord")
  fila(p.cuando, "pt-coord")
  return div
}

// `reportes`: lo que se dibuja según los filtros de área; `todosLosReportes`: lo que analiza el radar,
// que siempre revisa la zona completa sin depender de esos filtros.
export default function MapaCalor({ reportes, todosLosReportes, isDark = true }) {
  const contenedorRef = useRef(null)
  const mapaRef = useRef(null)
  const datosRef = useRef(aGeoJSON([]))
  const estiloRef = useRef(null)
  const encuadradoRef = useRef(false)
  const zonaRef = useRef(null)
  const ecosRef = useRef([])
  const eligiendoRef = useRef(false)
  const [modo3D, setModo3D] = useState(true)
  const [zona, setZona] = useState(null)          // { nombre, centro: [lon, lat], km }
  const [radioKm, setRadioKm] = useState(5)
  const [eligiendo, setEligiendo] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [textoBusqueda, setTextoBusqueda] = useState("")
  const [resultados, setResultados] = useState(null)   // null = sin buscar; [] = sin resultados
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState("")
  const marcadorRef = useRef(null)

  const conGPS = useMemo(() => reportes.filter(tieneGPS), [reportes])
  const areasPresentes = useMemo(
    () => Object.entries(conGPS.reduce((acc, r) => ({ ...acc, [r.area || "SIN ÁREA"]: (acc[r.area || "SIN ÁREA"] || 0) + 1 }), {}))
      .sort((a, b) => b[1] - a[1]),
    [conGPS]
  )

  const todosConGPS = useMemo(() => (todosLosReportes ?? reportes).filter(tieneGPS), [todosLosReportes, reportes])

  // Incidentes dentro del radio, con distancia y rumbo desde el centro
  const ecos = useMemo(() => {
    if (!zona) return []
    return todosConGPS
      .map(r => {
        const punto = [r.longitud, r.latitud]
        return { r, km: distanciaKm(zona.centro, punto), rumbo: rumbo(zona.centro, punto) }
      })
      .filter(e => e.km <= zona.km)
  }, [todosConGPS, zona])

  const resumenZona = useMemo(() => {
    const ahora = Date.now()
    const porArea = ecos.reduce((acc, e) => ({ ...acc, [e.r.area || "SIN ÁREA"]: (acc[e.r.area || "SIN ÁREA"] || 0) + 1 }), {})
    return {
      total: ecos.length,
      dia: ecos.filter(e => e.r.timestamp && ahora - e.r.timestamp <= DIA_MS).length,
      semana: ecos.filter(e => e.r.timestamp && ahora - e.r.timestamp <= 7 * DIA_MS).length,
      porArea: Object.entries(porArea).sort((a, b) => b[1] - a[1]),
      recientes: [...ecos].sort((a, b) => (b.r.timestamp || 0) - (a.r.timestamp || 0)),
    }
  }, [ecos])

  zonaRef.current = zona
  ecosRef.current = ecos
  eligiendoRef.current = eligiendo

  const encuadrar = (animar = true) => {
    const mapa = mapaRef.current
    if (!mapa || conGPS.length === 0) return
    const limites = new maplibregl.LngLatBounds()
    conGPS.forEach(r => limites.extend([r.longitud, r.latitud]))
    mapa.fitBounds(limites, { padding: 80, maxZoom: 14, duration: animar ? 1200 : 0, pitch: modo3D ? VISTA_3D.pitch : 0 })
  }

  const activarZona = (nueva) => {
    setZona(nueva)
    setEligiendo(false)
    if (nueva) {
      mapaRef.current?.fitBounds(limitesCirculo(nueva.centro, nueva.km), {
        padding: 70, duration: 1200, pitch: modo3D ? VISTA_3D.pitch : 0,
      })
    }
  }
  // El manejador de clic del mapa se crea una sola vez: lee estos valores al momento del clic
  const activarZonaRef = useRef(activarZona)
  const radioRef = useRef(radioKm)
  activarZonaRef.current = activarZona
  radioRef.current = radioKm

  useEffect(() => {
    const estilo = isDark ? ESTILOS.oscuro : ESTILOS.claro
    estiloRef.current = estilo
    const mapa = new maplibregl.Map({
      container: contenedorRef.current,
      style: estilo,
      center: CENTRO_MIRANDA,
      zoom: 8.6,
      ...VISTA_3D,
      maxPitch: 70,
      attributionControl: { compact: true },
    })
    mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right")
    mapa.on("style.load", () => {
      agregarCapas(mapa, datosRef.current, estiloRef.current === ESTILOS.oscuro)
      mapa.getSource("radar-zona")?.setData(geoZona(zonaRef.current))
    })
    mapa.on("mousemove", e => setCursor(e.lngLat))
    mapa.on("mouseout", () => setCursor(null))
    mapa.on("mouseenter", "incidentes-puntos", () => { mapa.getCanvas().style.cursor = "pointer" })
    mapa.on("mouseleave", "incidentes-puntos", () => { mapa.getCanvas().style.cursor = eligiendoRef.current ? "crosshair" : "" })
    mapa.on("click", e => {
      // Modo "elegir punto": el clic fija el centro del radar
      if (eligiendoRef.current) {
        activarZonaRef.current({ nombre: "Punto marcado", centro: [e.lngLat.lng, e.lngLat.lat], km: radioRef.current })
        return
      }
      const f = mapa.queryRenderedFeatures(e.point, { layers: ["incidentes-puntos"] })[0]
      if (!f) return
      new maplibregl.Popup({ closeButton: false, maxWidth: "260px", className: "popup-tactico-wrap" })
        .setLngLat(f.geometry.coordinates)
        .setDOMContent(contenidoPopup(f.properties))
        .addTo(mapa)
    })
    mapaRef.current = mapa
    return () => { mapa.remove(); mapaRef.current = null; marcadorRef.current = null }
  }, [])

  useEffect(() => {
    if (mapaRef.current) mapaRef.current.getCanvas().style.cursor = eligiendo ? "crosshair" : ""
  }, [eligiendo])

  // Cambio de tema claro/oscuro: se cambia la base y se vuelven a dibujar las capas
  useEffect(() => {
    const estilo = isDark ? ESTILOS.oscuro : ESTILOS.claro
    if (!mapaRef.current || estiloRef.current === estilo) return
    estiloRef.current = estilo
    mapaRef.current.setStyle(estilo)
  }, [isDark])

  useEffect(() => {
    datosRef.current = aGeoJSON(reportes)
    mapaRef.current?.getSource("incidentes")?.setData(datosRef.current)
    if (!encuadradoRef.current && conGPS.length > 0 && mapaRef.current) {
      encuadradoRef.current = true
      encuadrar(false)
    }
  }, [reportes])

  // Dibuja la zona y anima el barrido mientras haya una zona activa
  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa) return
    mapa.getSource("radar-zona")?.setData(geoZona(zona))
    if (!zona) {
      mapa.getSource("radar-haz")?.setData(VACIO)
      mapa.getSource("radar-ecos")?.setData(VACIO)
      return
    }
    if (reducirMovimiento()) {
      // Sin animación: los incidentes de la zona quedan resaltados fijos
      const fijos = geoEcos(ecosRef.current, 0)
      fijos.features.forEach(f => { f.properties.brillo = 0.8 })
      mapa.getSource("radar-ecos")?.setData(fijos)
      return
    }
    let frame
    let ultimo = 0
    const animar = (t) => {
      frame = requestAnimationFrame(animar)
      if (t - ultimo < 33) return  // ~30 fps es suficiente y ahorra batería
      ultimo = t
      const angulo = ((t % VUELTA_RADAR_MS) / VUELTA_RADAR_MS) * 360
      mapa.getSource("radar-haz")?.setData(geoHaz(zonaRef.current, angulo))
      mapa.getSource("radar-ecos")?.setData(geoEcos(ecosRef.current, angulo))
    }
    frame = requestAnimationFrame(animar)
    return () => cancelAnimationFrame(frame)
  }, [zona])

  const cambiarModo = () => {
    const nuevo = !modo3D
    setModo3D(nuevo)
    mapaRef.current?.easeTo(nuevo ? { ...VISTA_3D, duration: 900 } : { pitch: 0, bearing: 0, duration: 900 })
  }

  // encuadrar=false mientras se arrastra el deslizador: mover la cámara en cada paso marea
  const cambiarRadio = (km, encuadrar = true) => {
    const valor = limitarRadio(km)
    setRadioKm(valor)
    if (!zona) return
    if (encuadrar) activarZona({ ...zona, km: valor })
    else setZona({ ...zona, km: valor })
  }

  const buscar = async (e) => {
    e?.preventDefault()
    setErrorBusqueda("")
    if (textoBusqueda.trim().length < 3) { setErrorBusqueda("Escribe al menos 3 letras"); return }
    setBuscando(true)
    try {
      setResultados(await buscarDireccion(textoBusqueda))
    } catch (err) {
      setResultados(null)
      setErrorBusqueda(err?.name === "AbortError"
        ? "El buscador tardó demasiado. Revisa la conexión e inténtalo de nuevo."
        : "No se pudo conectar con los buscadores de direcciones. Si usas un bloqueador de anuncios o la protección contra rastreo del navegador, permite este sitio. Mientras tanto puedes usar “Marcar punto en el mapa”.")
    } finally {
      setBuscando(false)
    }
  }

  const irADireccion = (r) => {
    activarZona({ nombre: r.nombre, centro: r.centro, km: radioKm })
    setResultados(null)
    setTextoBusqueda(r.nombre)
  }

  // Resultados de la búsqueda también en el mapa: pines numerados (los mismos números de la lista)
  const irADireccionRef = useRef(irADireccion)
  irADireccionRef.current = irADireccion
  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa || !resultados?.length) return
    const pines = resultados.map((r, i) => {
      const el = document.createElement("button")
      el.className = "pin-resultado"
      const num = document.createElement("span")
      num.className = "pin-num"
      num.textContent = String(i + 1)
      el.appendChild(num)
      el.title = r.detalle
      el.setAttribute("aria-label", `Ir a ${r.nombre}`)
      el.addEventListener("click", (ev) => { ev.stopPropagation(); irADireccionRef.current(r) })
      return new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(r.centro).addTo(mapa)
    })
    if (resultados.length === 1) {
      mapa.flyTo({ center: resultados[0].centro, zoom: 14, duration: 1000 })
    } else {
      const limites = new maplibregl.LngLatBounds()
      resultados.forEach(r => limites.extend(r.centro))
      mapa.fitBounds(limites, { padding: 90, maxZoom: 14, duration: 1000 })
    }
    return () => pines.forEach(p => p.remove())
  }, [resultados])

  // Marcador arrastrable en el centro del radar: al soltarlo, el radar se mueve ahí
  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa) return
    if (!zona) {
      marcadorRef.current?.remove()
      marcadorRef.current = null
      return
    }
    if (!marcadorRef.current) {
      const el = document.createElement("div")
      el.className = "marcador-radar"
      el.title = "Arrastra para mover el radar"
      el.innerHTML = `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="rgba(0,230,118,0.18)" stroke="#00E676" stroke-width="2"/>
        <path d="M12 2v5M12 17v5M2 12h5M17 12h5" stroke="#00E676" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="2.5" fill="#00E676"/></svg>`
      const marcador = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(zona.centro).addTo(mapa)
      // Mientras se arrastra, el círculo sigue al marcador; al soltar se recalculan los incidentes
      marcador.on("drag", () => {
        const { lng, lat } = marcador.getLngLat()
        mapa.getSource("radar-zona")?.setData(geoZona({ ...zonaRef.current, centro: [lng, lat] }))
        zonaRef.current = { ...zonaRef.current, centro: [lng, lat] }
      })
      marcador.on("dragend", () => {
        const { lng, lat } = marcador.getLngLat()
        setZona(z => ({ ...z, nombre: "Punto marcado", centro: [lng, lat] }))
        setTextoBusqueda("")
      })
      marcadorRef.current = marcador
    } else {
      marcadorRef.current.setLngLat(zona.centro)
    }
  }, [zona])

  const elegirZona = (id) => {
    if (!id) { activarZona(null); return }
    const z = ZONAS.find(z => z.id === id)
    activarZona({ nombre: z.nombre, centro: z.centro, km: radioKm })
  }

  const irA = (r) => mapaRef.current?.flyTo({ center: [r.longitud, r.latitud], zoom: 15, duration: 1000 })

  const btn = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider border backdrop-blur transition-colors"
  const btnOn = "bg-[#00E676]/15 border-[#00E676]/60 text-[#7CFFB2]"
  const btnOff = "bg-black/50 border-white/15 text-gray-400 hover:text-white"
  const panel = "bg-black/70 backdrop-blur border border-white/10 rounded-lg text-white"
  const zonaSeleccionada = ZONAS.find(z => zona && z.nombre === zona.nombre)?.id ?? ""

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-tactical-border bg-[#0B0D10]">
      {/* Tamaño con w/h y no con "absolute": MapLibre fuerza position:relative en su contenedor */}
      <div ref={contenedorRef} className="w-full h-full" />

      <div className="absolute top-3 left-3 flex flex-col gap-2 w-[240px] max-h-[calc(100%-5.5rem)] overflow-y-auto">
        {/* Resumen general */}
        <div className={`${panel} px-3 py-2.5`}>
          <p className="text-[10px] font-black tracking-[0.2em] text-[#FF5A1F]">SECTOR MIRANDA</p>
          <p className="font-mono text-2xl font-bold leading-tight mt-0.5">{String(conGPS.length).padStart(3, "0")}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">incidentes geolocalizados</p>
          {areasPresentes.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {areasPresentes.map(([area, n]) => (
                <div key={area} className="flex items-center gap-2 text-[11px]">
                  <span className="w-2 h-2 rounded-full" style={{ background: COLOR_AREA[area] || COLOR_SIN_AREA, boxShadow: `0 0 6px ${COLOR_AREA[area] || COLOR_SIN_AREA}` }} />
                  <span className="text-gray-300 flex-1">{area}</span>
                  <span className="font-mono text-gray-400">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Radar de zona */}
        <div className={`${panel} px-3 py-2.5 space-y-2`}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black tracking-[0.2em] text-[#00E676] flex items-center gap-1.5"><Radar size={12} /> RADAR DE ZONA</p>
            {zona && (
              <button onClick={() => activarZona(null)} className="text-gray-500 hover:text-white" title="Apagar radar"><X size={13} /></button>
            )}
          </div>
          <select
            value={zonaSeleccionada}
            onChange={e => elegirZona(e.target.value)}
            className="w-full bg-black/60 border border-white/15 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E676]"
          >
            <option value="">{zona && !zonaSeleccionada ? "◎ Punto marcado" : "— Elegir zona —"}</option>
            {ZONAS.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
          </select>

          {/* Buscar una dirección */}
          <form onSubmit={buscar} className="flex gap-1">
            <input
              value={textoBusqueda}
              onChange={e => { setTextoBusqueda(e.target.value); setErrorBusqueda("") }}
              placeholder="Buscar dirección…"
              aria-label="Buscar dirección"
              className="flex-1 min-w-0 bg-black/60 border border-white/15 rounded-md px-2 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00E676]"
            />
            <button type="submit" disabled={buscando} title="Buscar (Enter)" aria-label="Buscar"
              className="px-2 rounded-md border border-white/15 bg-black/50 text-gray-300 hover:text-white disabled:opacity-50">
              <Search size={13} className={buscando ? "animate-pulse" : ""} />
            </button>
          </form>
          {errorBusqueda && <p className="text-[11px] text-[#FF8A80]">{errorBusqueda}</p>}
          {resultados && (
            <div className="rounded-md border border-white/10 bg-black/60 max-h-40 overflow-y-auto">
              {resultados.length === 0 ? (
                <p className="px-2 py-2 text-[11px] text-gray-400">Sin resultados. Prueba con el nombre del sector o la ciudad.</p>
              ) : resultados.map((r, i) => (
                <button key={i} onClick={() => irADireccion(r)} title={r.detalle}
                  className="w-full text-left flex gap-1.5 px-2 py-1.5 hover:bg-white/10 border-b border-white/5 last:border-0">
                  <span className="w-4 h-4 rounded-full bg-[#FFB020] text-[#0B0D10] text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-px">{i + 1}</span>
                  <span className="text-[11px] text-gray-200 leading-snug">{r.nombre}</span>
                </button>
              ))}
            </div>
          )}

          {/* Distancia de cobertura */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="radio-km" className="text-[10px] font-bold tracking-[0.12em] text-gray-400">COBERTURA</label>
              <span className="flex items-center gap-1">
                <input
                  type="number" min={RADIO_MIN_KM} max={RADIO_MAX_KM} step="0.5"
                  value={radioKm}
                  onChange={e => e.target.value !== "" && cambiarRadio(e.target.value, false)}
                  onBlur={() => zona && cambiarRadio(radioKm)}
                  aria-label="Radio en kilómetros"
                  className="w-14 bg-black/60 border border-white/15 rounded px-1.5 py-0.5 text-right font-mono text-xs text-white focus:outline-none focus:border-[#00E676]"
                />
                <span className="font-mono text-[11px] text-gray-400">km</span>
              </span>
            </div>
            <input
              id="radio-km" type="range" min={RADIO_MIN_KM} max={RADIO_MAX_KM} step="0.5"
              value={radioKm}
              onChange={e => cambiarRadio(e.target.value, false)}
              onPointerUp={() => zona && cambiarRadio(radioKm)}
              onKeyUp={() => zona && cambiarRadio(radioKm)}
              className="w-full accent-[#00E676]"
            />
            <div className="flex gap-1">
              {RADIOS_KM.map(km => (
                <button key={km} onClick={() => cambiarRadio(km)}
                  className={`flex-1 py-1 rounded-md text-[11px] font-mono font-bold border ${radioKm === km ? btnOn : btnOff}`}>
                  {km} km
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setEligiendo(v => !v)} className={`${btn} w-full justify-center ${eligiendo ? btnOn : btnOff}`}>
            <MousePointerClick size={13} /> {eligiendo ? "Haz clic en el mapa…" : "Marcar punto en el mapa"}
          </button>
          {zona && (
            <p className="text-[10px] text-gray-400 leading-snug">
              Arrastra el marcador <span className="text-[#00E676]">⊕</span> del mapa para mover el radar.
            </p>
          )}

          {zona && (
            <div className="pt-2 border-t border-white/10 space-y-2">
              <p className="text-[11px] text-gray-300">
                <span className="text-white font-bold">{zona.nombre}</span> · radio <span className="font-mono">{zona.km} km</span>
              </p>
              <p className="font-mono text-[10px] text-[#7CFFB2]">{formatoCoord(zona.centro[1], zona.centro[0])}</p>
              <div className="grid grid-cols-3 gap-1 text-center">
                {[["Total", resumenZona.total], ["24 h", resumenZona.dia], ["7 días", resumenZona.semana]].map(([etq, n]) => (
                  <div key={etq} className="bg-white/5 rounded-md py-1">
                    <p className="font-mono text-lg font-bold leading-none">{n}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider mt-0.5">{etq}</p>
                  </div>
                ))}
              </div>
              {resumenZona.porArea.length > 0 && (
                <div className="space-y-0.5">
                  {resumenZona.porArea.map(([area, n]) => (
                    <div key={area} className="flex items-center gap-2 text-[11px]">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLOR_AREA[area] || COLOR_SIN_AREA }} />
                      <span className="text-gray-300 flex-1">{area}</span>
                      <span className="font-mono text-gray-400">{n}</span>
                    </div>
                  ))}
                </div>
              )}
              {resumenZona.recientes.length > 0 ? (
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black tracking-[0.18em] text-gray-400">
                    INCIDENTES EN LA ZONA · {resumenZona.recientes.length} · DEL MÁS RECIENTE AL MÁS ANTIGUO
                  </p>
                  <ul className="max-h-64 overflow-y-auto pr-1 space-y-0.5">
                    {resumenZona.recientes.map(({ r, km }) => (
                      <li key={r.id}>
                        <button onClick={() => irA(r)} title="Ver en el mapa"
                          className="w-full text-left flex gap-2 px-1.5 py-1.5 rounded hover:bg-white/10">
                          <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: COLOR_AREA[r.area] || COLOR_SIN_AREA }} />
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-white truncate">{r.nroMinuta || "S/C"}</span>
                              <span className="ml-auto text-[10px] text-gray-400 whitespace-nowrap">{haceCuanto(r.timestamp)}</span>
                            </span>
                            <span className="block text-[11px] text-gray-300 truncate">{r.antares?.[0] || "Sin clasificación"}</span>
                            <span className="block text-[10px] text-gray-400 truncate">
                              <span className="font-mono">{km.toFixed(1)} km</span> · {r.direccion || "Sin dirección"}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-[11px] text-gray-500">Sin incidentes registrados en este radio.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controles de vista */}
      <div className="absolute bottom-9 right-3 flex gap-1.5">
        <button onClick={cambiarModo} className={`${btn} ${modo3D ? btnOn : btnOff}`} title="Vista isométrica / plana">
          {modo3D ? <Box size={13} /> : <Square size={13} />} {modo3D ? "3D" : "2D"}
        </button>
        <button onClick={() => encuadrar()} className={`${btn} ${btnOff}`} title="Encuadrar todos los incidentes">
          <Crosshair size={13} /> Encuadrar
        </button>
      </div>

      {/* Coordenadas bajo el cursor */}
      <div className="absolute bottom-3 left-3 bg-black/65 backdrop-blur border border-white/10 rounded-md px-2.5 py-1.5 font-mono text-[11px] text-[#7CFFB2]">
        {cursor ? formatoCoord(cursor.lat, cursor.lng) : "— · —"}
      </div>

      {conGPS.length === 0 && !zona && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/75 border border-white/10 rounded-xl px-6 py-3 text-gray-300 text-sm font-semibold">
            Sin reportes con ubicación GPS en las áreas seleccionadas
          </div>
        </div>
      )}
    </div>
  )
}
