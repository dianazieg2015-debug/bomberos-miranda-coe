import { useState, useEffect } from "react"
import Paginador from "./Paginador"
import { MapPin, Clock, User, Pencil, Trash2, X, Save, ExternalLink, Image as ImageIcon, ChevronRight } from "lucide-react"
import { eliminarReporteCOE, crearReporteCOE } from "../supabase"
import { formatoCoord } from "../geo"

const ANTARES_MAP = {
  "1":"INCENDIO DE GRAN MAGNITUD","2":"INCENDIO EN EDIFICACION E INMUEBLE",
  "3":"INCENDIO EN VEHICULO","4":"INCENDIO EN VEGETACION",
  "5":"INCENDIO FORESTAL","6":"INCENDIO EN DESECHOS SOLIDOS",
  "7":"INCENDIO EN EQUIPO ELECTRICO","8":"INCENDIO EN EMBARCACION",
  "9":"REIGNICION","10":"DEFLAGRACION",
  "11":"RESCATE DE PERSONA","12":"RESCATE DE ANIMAL",
  "13":"EVALUACION DE INSECTOS","14":"REHUBICACION DE INSECTOS",
  "15":"EVALUACION ARBOL","16":"ARBOL CAIDO",
  "17":"TALA DE ARBOL","18":"PERSONA INCOMUNICADA",
  "19":"PERSONA ATRAPADA","20":"BUSQUEDA DE PERSONA",
  "21":"EVACUACION","22":"DESPLOME / COLAPSO DE ESTRUCTURA",
  "23":"DERRUMBE","24":"DESLIZAMIENTO DE TIERRA",
  "25":"RECUPERACION DE CADAVER","26":"CADAVER",
  "27":"ACCIDENTES DE TRANSITO","28":"EXTRICACION",
  "29":"PERSONA CAIDA","30":"ATENCION O AYUDA AL FUNCIONARIO",
  "31":"ATENCION PREHOSPITALARIA","32":"TRASLADO DE PACIENTE",
  "33":"PUNTOS DE ATENCION FIJA","34":"PUNTOS DE ATENCION ITINERANTE",
  "35":"PREVENCION Y SEGURIDAD","36":"GUARDIA DE PREVENCION VIAL",
  "37":"GUARDIA DE PREVENCION","38":"ACTIVACION DE PUESTO COMANDO",
  "39":"APOYO O REFUERZO","40":"APOYO INTERINSTITUCIONAL",
  "41":"APOYO A MEDICATURA FORENSE","42":"RECORRIDO VIAL",
  "43":"RECORRIDO AEREO","44":"RECORRIDO MARITIMO",
  "45":"ALARMA FALSA","46":"ALARMA INFUNDADA",
  "47":"ATENDIDO NO EFECTUADO","48":"ATENCION NO REALIZADA",
  "49":"SERVICIO ESPECIAL ACTO FUNEBRE","50":"SUMINISTRO DE AGUA",
  "51":"EVALUACION DE RIOS Y/O QUEBRADAS","52":"EVALUACION DE VIALIDAD",
  "53":"EVALUACION DE RIESGOS EXTRAORDINARIOS","54":"INVESTIGACION DE INCENDIO",
  "55":"INSPECCION DE PREVENCION","56":"EJECUCION DE SANCIONES DE PREVENCION",
  "57":"INUNDACION","58":"ACHICAMIENTO",
  "59":"CONTAMINACION","60":"DESINFECCION O DESCONTAMINACION",
  "61":"DERRAME DE COMBUSTIBLE","62":"FUGA / ESCAPE DE GASES",
  "63":"TRASEGADO / TRASVASADO","64":"INCIDENTE CON MATERIALES PELIGROSOS",
  "65":"RESPUESTA ESPECIALIZADA MAT-PEL","66":"RECUPERACION DE MAT-PEL",
  "67":"SERVICIO AEREO","68":"TRASLADO AEROMEDICO",
  "69":"BUSQUEDA DE AERONAVE","70":"ACCIDENTE DE AERONAVE",
  "71":"REMOLQUE DE EMBARCACION","72":"BUSQUEDA DE EMBARCACION",
  "73":"ACCIDENTE DE EMBARCACION","74":"INDUCCION O MEJORAMIENTO PROFESIONAL",
  "75":"ATENCION DEL FRENTE PREVENTIVO","76":"ACTIVIDAD DEPORTIVA O RECREACIONAL",
  "77":"EQUIPAR COMBUSTIBLE","78":"BALDEO",
  "79":"RECUPERACION, REMODELACION DE INFRAESTRUCTURA","80":"COMISION ESPECIAL",
  "81":"ACTIVACION CUADRANTE DE PAZ","82":"CASUAL","83":"ANEGACIÓN"
}
const ANTARES_LIST = Object.entries(ANTARES_MAP).map(([k,v]) => `${k} - ${v}`)

const AREA_COLORS = {
  "INCENDIO":       { background: "#ef444420", color: "#ef4444", borderColor: "#ef4444" },
  "RESCATE":        { background: "#3b82f620", color: "#3b82f6", borderColor: "#3b82f6" },
  "APH":            { background: "#22c55e20", color: "#16a34a", borderColor: "#22c55e" },
  "MATPEL":         { background: "#f59e0b20", color: "#d97706", borderColor: "#f59e0b" },
  "PREVENCIÓN":     { background: "#a855f720", color: "#a855f7", borderColor: "#a855f7" },
  "LOGÍSTICA":      { background: "#06b6d420", color: "#0891b2", borderColor: "#06b6d4" },
  "ADMINISTRACIÓN": { background: "#6b728020", color: "#6b7280", borderColor: "#6b7280" },
}

const INPUT_CLS = "w-full bg-[#0f0f0f] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#D32F2F]"
const LABEL_CLS = "block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1"

// Mismo criterio para la tabla y para el contador "Mostrando X de Y" de la pestaña Minutas
export function coincideMinuta(r, filtroArea, busqueda) {
  if (filtroArea && filtroArea !== "TODAS" && r.area !== filtroArea) return false
  if (!busqueda) return true
  const q = busqueda.toLowerCase()
  return (
    r.nroMinuta?.toLowerCase().includes(q) ||
    r.direccion?.toLowerCase().includes(q) ||
    r.antares?.some(a => a.toLowerCase().includes(q)) ||
    r.autorNombre?.toLowerCase().includes(q) ||
    r.area?.toLowerCase().includes(q)
  )
}

export default function TablaMinutas({ reportes, filtroArea, filtroBusqueda, isAdmin = false }) {
  const [viewing, setViewing] = useState(null)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [viewingImg, setViewingImg] = useState(null)
  const [antaresSearch, setAntaresSearch] = useState("")
  const [antaresOpen, setAntaresOpen] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(25)

  // Al cambiar la búsqueda o el área se vuelve a la primera página
  useEffect(() => { setPagina(1) }, [filtroArea, filtroBusqueda, porPagina])

  const visibles = reportes.filter(r => coincideMinuta(r, filtroArea, filtroBusqueda))

  // Cada corrección va justo debajo de su minuta original; si la original no está visible, al final
  const filtrados = (() => {
    const correccionesPorOriginal = new Map()
    const base = []
    visibles.forEach(r => {
      if (r.esCorreccion && r.minutaOriginalId) {
        if (!correccionesPorOriginal.has(r.minutaOriginalId)) correccionesPorOriginal.set(r.minutaOriginalId, [])
        correccionesPorOriginal.get(r.minutaOriginalId).push(r)
      } else {
        base.push(r)
      }
    })
    const resultado = []
    base.forEach(r => {
      resultado.push(r)
      const correcciones = correccionesPorOriginal.get(r.id)
      if (correcciones) {
        resultado.push(...correcciones.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)))
        correccionesPorOriginal.delete(r.id)
      }
    })
    const huerfanas = [...correccionesPorOriginal.values()].flat().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    return [...resultado, ...huerfanas]
  })()

  const abrirEditar = (r) => {
    setForm({
      nroMinuta: r.nroMinuta || "",
      fecha: r.fecha || "",
      hora: r.hora || "",
      direccion: r.direccion || "",
      resena: r.resena || "",
      comandante: r.comandante || "",
      unidad: r.unidad || "",
      antares: r.antares || [],
    })
    setAntaresSearch("")
    setAntaresOpen(false)
    setEditando(r)
  }

  const guardarCorreccion = async () => {
    if (!editando?.id) return
    setSaving(true)
    try {
      const { id: _old, esCorreccion: _ec, minutaOriginalId: _moi, ...resto } = editando
      await crearReporteCOE({
        ...resto,
        ...form,
        antares: form.antares || editando.antares || [],
        esCorreccion: true,
        minutaOriginalId: editando.id
      })
      setEditando(null)
      setViewing(null)
    } catch (e) {
      alert("Error al guardar corrección: " + e.message)
    }
    setSaving(false)
  }

  const antaresDisponibles = ANTARES_LIST.filter(a =>
    a.toLowerCase().includes(antaresSearch.toLowerCase()) &&
    !(form.antares || []).includes(a)
  ).slice(0, 8)

  const confirmarEliminar = async () => {
    if (!confirmDelete?.id) return
    try {
      await eliminarReporteCOE(confirmDelete.id)
      setConfirmDelete(null)
    } catch (e) {
      alert("Error al eliminar: " + e.message)
    }
  }

  const colCount = isAdmin ? 8 : 7

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina))
  const paginaActual = Math.min(pagina, totalPaginas)
  const desde = (paginaActual - 1) * porPagina
  const enPagina = filtrados.slice(desde, desde + porPagina)

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tactical-border">
              <th className="text-left py-3 px-4 text-tactical-muted font-semibold uppercase tracking-wider text-xs">Código</th>
              <th className="text-left py-3 px-4 text-tactical-muted font-semibold uppercase tracking-wider text-xs">Fecha / Hora</th>
              <th className="text-left py-3 px-4 text-tactical-muted font-semibold uppercase tracking-wider text-xs">Área</th>
              <th className="text-left py-3 px-4 text-tactical-muted font-semibold uppercase tracking-wider text-xs">Antares</th>
              <th className="text-left py-3 px-4 text-tactical-muted font-semibold uppercase tracking-wider text-xs">Dirección</th>
              <th className="text-left py-3 px-4 text-tactical-muted font-semibold uppercase tracking-wider text-xs">Funcionario</th>
              <th className="text-left py-3 px-4 text-tactical-muted font-semibold uppercase tracking-wider text-xs">GPS</th>
              {isAdmin && <th className="text-left py-3 px-4 text-tactical-muted font-semibold uppercase tracking-wider text-xs">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={colCount} className="text-center py-10 text-tactical-muted">Sin reportes</td></tr>
            )}
            {enPagina.map((r, i) => {
              const areaStyle = AREA_COLORS[r.area] || { background: "transparent", color: "#888", borderColor: "#444" }
              return (
                <tr key={r.id || i} onClick={() => setViewing(r)} className="border-b border-tactical-border/50 hover:bg-tactical-cardAlt/50 transition-colors cursor-pointer">
                  <td className="py-3 px-4 font-bold text-tactical-red">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {r.esCorreccion && <span className="text-tactical-amber font-black" aria-hidden="true">↳</span>}
                      <span className="font-mono">{r.nroMinuta || "—"}</span>
                      {r.esCorreccion && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full border" style={{ background: "#f59e0b20", color: "#d97706", borderColor: "#f59e0b" }}>CORRECCIÓN</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-tactical-muted">
                    <div className="flex items-center gap-1"><Clock size={12} /><span>{r.fecha} {r.hora}</span></div>
                  </td>
                  <td className="py-3 px-4">
                    {r.area && <span className="text-xs font-bold px-2 py-0.5 rounded-full border" style={areaStyle}>{r.area}</span>}
                  </td>
                  <td className="py-3 px-4 text-tactical-text text-xs max-w-[160px] truncate">{r.antares?.join(", ") || "—"}</td>
                  <td className="py-3 px-4 text-tactical-muted text-xs max-w-[180px] truncate">{r.direccion || "—"}</td>
                  <td className="py-3 px-4 text-tactical-text text-xs">
                    <div className="flex items-start gap-1">
                      <User size={11} className="text-tactical-muted mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{r.autorNombre || r.elaboradoPor || "—"}</span>
                        {(r.autorEquipo || r.area || r.seccion) && (
                          <p className="text-[10px] text-tactical-muted mt-0.5">
                            {[
                              r.autorEquipo ? `#${r.autorEquipo}` : "",
                              r.area,
                              r.seccion ? `Sec. ${r.seccion}` : ""
                            ].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {r.latitud && r.longitud
                      ? <span className="flex items-center gap-1 text-tactical-green text-xs font-semibold"><MapPin size={12} /> GPS</span>
                      : <span className="text-tactical-border text-xs">—</span>}
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); abrirEditar(r) }} className="p-1.5 rounded-lg bg-blue-900/30 hover:bg-blue-800/50 text-blue-400 transition-colors" title="Editar">
                          <Pencil size={13} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(r) }} className="p-1.5 rounded-lg bg-red-900/30 hover:bg-red-800/50 text-red-400 transition-colors" title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filtrados.length > 0 && (
        <Paginador
          pagina={paginaActual} totalPaginas={totalPaginas} total={filtrados.length}
          desde={desde + 1} hasta={desde + enPagina.length}
          porPagina={porPagina} onPagina={setPagina} onPorPagina={setPorPagina}
        />
      )}

      {/* Edit Modal */}
      {editando && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] border border-[#2e2e2e] rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#2e2e2e]">
              <div>
                <h3 className="text-white font-black text-sm uppercase tracking-wider">Editar Minuta</h3>
                <p className="text-gray-500 text-xs mt-0.5">COD: {editando.nroMinuta || "—"}</p>
              </div>
              <button onClick={() => setEditando(null)} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className={LABEL_CLS}>Nro. Minuta</label>
                <input className={INPUT_CLS} value={form.nroMinuta} onChange={e => setForm(f => ({ ...f, nroMinuta: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL_CLS}>Fecha</label>
                <input className={INPUT_CLS} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} placeholder="dd-MM-yyyy" />
              </div>
              <div>
                <label className={LABEL_CLS}>Hora</label>
                <input className={INPUT_CLS} value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} placeholder="HH:mm" />
              </div>
              <div>
                <label className={LABEL_CLS}>Comandante</label>
                <input className={INPUT_CLS} value={form.comandante} onChange={e => setForm(f => ({ ...f, comandante: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLS}>Dirección</label>
                <input className={INPUT_CLS} value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLS}>Unidad / Vehículo</label>
                <input className={INPUT_CLS} value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLS}>Antares</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(form.antares || []).map(a => (
                    <span key={a} className="flex items-center gap-1 text-xs bg-tactical-red/20 border border-tactical-red/40 text-tactical-red px-2 py-0.5 rounded-full">
                      {a}
                      <button onClick={() => setForm(f => ({ ...f, antares: f.antares.filter(x => x !== a) }))} className="hover:text-white"><X size={10}/></button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <input
                    className={INPUT_CLS}
                    placeholder="Buscar antares..."
                    value={antaresSearch}
                    onChange={e => { setAntaresSearch(e.target.value); setAntaresOpen(true) }}
                    onFocus={() => setAntaresOpen(true)}
                  />
                  {antaresOpen && antaresDisponibles.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg shadow-xl max-h-44 overflow-y-auto">
                      {antaresDisponibles.map(a => (
                        <button key={a} onClick={() => { setForm(f => ({ ...f, antares: [...(f.antares||[]), a] })); setAntaresSearch(""); setAntaresOpen(false) }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-tactical-red/20 hover:text-white transition-colors">{a}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLS}>Reseña</label>
                <textarea className={INPUT_CLS + " resize-none h-24"} value={form.resena} onChange={e => setForm(f => ({ ...f, resena: e.target.value }))} />
              </div>
              <div className="col-span-2 bg-amber-900/20 border border-amber-800/50 rounded-xl p-3">
                <p className="text-amber-400 text-xs font-bold">ℹ️ Esta acción crea una nueva minuta marcada como CORRECCIÓN. La minuta original queda intacta y puede eliminarse por separado.</p>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-[#2e2e2e]">
              <button onClick={() => setEditando(null)} className="flex-1 py-2 rounded-xl border border-[#2e2e2e] text-gray-400 text-sm font-semibold hover:border-gray-500 transition-colors">
                Cancelar
              </button>
              <button onClick={guardarCorreccion} disabled={saving} className="flex-1 py-2 rounded-xl bg-amber-700 text-white text-sm font-black uppercase tracking-wider hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                <Save size={15} />{saving ? "Guardando..." : "Guardar Corrección"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#111111] border border-[#222222] rounded-2xl w-full max-w-2xl shadow-2xl my-4">

            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-[#222222]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-tactical-red font-black text-xl tracking-wider">{viewing.nroMinuta || "—"}</span>
                  {viewing.area && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border" style={AREA_COLORS[viewing.area] || { background: "transparent", color: "#888", borderColor: "#444" }}>
                      {viewing.area}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-1 flex items-center gap-1.5">
                  <Clock size={11} /> {viewing.fecha} · {viewing.hora}
                  {viewing.estacion && <><ChevronRight size={11} /> {viewing.estacion}</>}
                </p>
              </div>
              <button onClick={() => setViewing(null)} className="text-gray-500 hover:text-white transition-colors ml-3 flex-shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">

              {/* Antares */}
              {viewing.antares?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Antares</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewing.antares.map((a, i) => (
                      <span key={i} className="text-xs bg-tactical-red/15 border border-tactical-red/30 text-tactical-red px-2.5 py-0.5 rounded-full font-semibold">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ubicación */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-1.5">Ubicación</p>
                <p className="text-white text-sm">{viewing.direccion || "—"}</p>
                {viewing.latitud && viewing.longitud && Math.abs(viewing.latitud) > 0.001 && (<>
                  <p className="font-mono text-xs text-[#7CFFB2] mt-1.5">{formatoCoord(viewing.latitud, viewing.longitud)}</p>
                  <a
                    href={`https://maps.google.com/?q=${viewing.latitud},${viewing.longitud}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs text-tactical-green font-semibold hover:underline"
                  >
                    <MapPin size={12} /> Ver en Google Maps <ExternalLink size={10} />
                  </a>
                </>)}
              </div>

              {/* Reseña */}
              {viewing.resena && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-1.5">Reseña / Estatus</p>
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{viewing.resena}</p>
                </div>
              )}

              {/* Personal */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Comandante", val: viewing.comandante },
                  { label: "Unidad / Vehículo", val: viewing.unidad },
                  { label: "Elaborado por", val: viewing.autorNombre || viewing.elaboradoPor }
                ].filter(x => x.val).map(({ label, val }) => (
                  <div key={label} className="bg-[#1a1a1a] rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">{label}</p>
                    <p className="text-white text-sm font-semibold">{val}</p>
                  </div>
                ))}
              </div>

              {/* Fotos */}
              {viewing.imagenesUrls?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-2 flex items-center gap-1.5">
                    <ImageIcon size={11} /> Evidencia fotográfica ({viewing.imagenesUrls.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {viewing.imagenesUrls.map((url, i) => (
                      <img
                        key={i} src={url} alt={`Foto ${i + 1}`}
                        onClick={() => setViewingImg(url)}
                        className="w-full h-40 object-cover rounded-xl border border-[#2e2e2e] cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-[#222222]">
              <button onClick={() => setViewing(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#2e2e2e] text-gray-400 text-sm font-semibold hover:border-gray-500 transition-colors">
                Cerrar
              </button>
              {isAdmin && (
                <button onClick={() => { setViewing(null); abrirEditar(viewing) }}
                  className="flex-1 py-2.5 rounded-xl bg-blue-900/40 border border-blue-800/50 text-blue-300 text-sm font-bold hover:bg-blue-800/50 transition-colors flex items-center justify-center gap-2">
                  <Pencil size={14} /> Editar minuta
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen image viewer */}
      {viewingImg && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60] p-4" onClick={() => setViewingImg(null)}>
          <img src={viewingImg} alt="Foto" className="max-w-full max-h-full object-contain rounded-xl" />
          <button onClick={() => setViewingImg(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/80">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] border border-[#2e2e2e] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2">¿Eliminar minuta?</h3>
            <p className="text-gray-400 text-sm mb-1">COD: <span className="text-white font-bold">{confirmDelete.nroMinuta || "—"}</span></p>
            <p className="text-gray-500 text-xs mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-[#2e2e2e] text-gray-400 text-sm font-semibold hover:border-gray-500 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmarEliminar} className="flex-1 py-2.5 rounded-xl bg-red-700 text-white text-sm font-black uppercase tracking-wider hover:bg-red-600 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
