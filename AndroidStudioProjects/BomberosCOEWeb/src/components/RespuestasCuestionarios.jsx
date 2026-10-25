import { useState, useEffect } from "react"
import { ClipboardList, ChevronDown, ChevronRight, Users, X, ToggleLeft, Plus, Trash2, Type, List, AlertTriangle } from "lucide-react"
import { escucharCuestionarios, crearCuestionario, getRespuestasCuestionario, actualizarCuestionario, eliminarCuestionario } from "../supabase"

const TIPO_TEXTO = "texto_libre"
const TIPO_MULTIPLE = "opcion_multiple"

function nuevaPregunta(tipo) {
  return { id: Math.random().toString(36).slice(2), texto: "", tipo, opciones: tipo === TIPO_MULTIPLE ? ["Sí", "No"] : [] }
}

export default function RespuestasCuestionarios({ isAdmin = false }) {
  const [cuestionarios, setCuestionarios] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [respuestas, setRespuestas] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingResp, setLoadingResp] = useState(false)
  const [mostrarCrear, setMostrarCrear] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)

  useEffect(() => {
    const unsub = escucharCuestionarios(lista => {
      setCuestionarios(lista.sort((a, b) => (b.fechaCreacion || 0) - (a.fechaCreacion || 0)))
      setLoading(false)
    })
    return unsub
  }, [])

  const verRespuestas = async (c) => {
    setSeleccionado(c)
    setLoadingResp(true)
    const lista = await getRespuestasCuestionario(c.id)
    setRespuestas(lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)))
    setLoadingResp(false)
  }

  const eliminar = async (c) => {
    await eliminarCuestionario(c.id)
    setCuestionarios(prev => prev.filter(x => x.id !== c.id))
    if (seleccionado?.id === c.id) setSeleccionado(null)
    setConfirmarEliminar(null)
  }

  const toggleActivo = async (c) => {
    await actualizarCuestionario(c.id, { activo: !c.activo })
    setCuestionarios(prev => prev.map(x => x.id === c.id ? { ...x, activo: !x.activo } : x))
    if (seleccionado?.id === c.id) setSeleccionado(s => ({ ...s, activo: !s.activo }))
  }

  const fmt = (ts) => ts ? new Date(ts).toLocaleString("es-VE") : "—"

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-tactical-muted text-sm">Cargando cuestionarios...</div>
  )

  return (
    <div className="flex gap-4 h-full min-h-[500px]">
      {/* Lista de cuestionarios */}
      <div className="w-80 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-tactical-muted">Cuestionarios</p>
          {isAdmin && (
            <button onClick={() => setMostrarCrear(true)}
              className="flex items-center gap-1 text-xs font-bold text-tactical-red hover:text-red-400 bg-tactical-red/10 hover:bg-tactical-red/20 px-2.5 py-1 rounded-lg transition-colors">
              <Plus size={13} /> Crear
            </button>
          )}
        </div>
        {cuestionarios.length === 0 && (
          <div className="text-center py-10 text-tactical-muted text-sm">Sin cuestionarios</div>
        )}
        {cuestionarios.map(c => (
          <div
            key={c.id}
            onClick={() => verRespuestas(c)}
            className={`cursor-pointer rounded-xl border p-3 transition-colors ${
              seleccionado?.id === c.id
                ? "border-tactical-red bg-tactical-red/10"
                : "border-tactical-border bg-tactical-card hover:border-tactical-red/50"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-tactical-text truncate">{c.titulo}</p>
                <p className="text-xs text-tactical-muted mt-0.5">{fmt(c.fechaCreacion)}</p>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full border flex-shrink-0"
                style={c.activo
                  ? { background: "#16a34a20", color: "#15803d", borderColor: "#16a34a" }
                  : { background: "#6b728020", color: "#4b5563", borderColor: "#6b7280" }
                }>
                {c.activo ? "ACTIVO" : "CERRADO"}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-tactical-muted">
              <span className="flex items-center gap-1"><ClipboardList size={11} />{c.preguntas?.length || 0} preguntas</span>
              <ChevronRight size={12} className={seleccionado?.id === c.id ? "text-tactical-red" : ""} />
            </div>
          </div>
        ))}
      </div>

      {/* Panel de respuestas */}
      <div className="flex-1 min-w-0">
        {!seleccionado ? (
          <div className="flex flex-col items-center justify-center h-full text-tactical-muted gap-3">
            <ClipboardList size={48} className="opacity-30" />
            <p className="text-sm">Selecciona un cuestionario para ver las respuestas</p>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <h3 className="text-white font-black text-base">{seleccionado.titulo}</h3>
                {seleccionado.descripcion && <p className="text-tactical-muted text-xs mt-0.5">{seleccionado.descripcion}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isAdmin && (
                  <button
                    onClick={() => setConfirmarEliminar(seleccionado)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                )}
                <button
                  onClick={() => toggleActivo(seleccionado)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors"
                  style={seleccionado.activo
                    ? { borderColor: "#16a34a", color: "#15803d" }
                    : { borderColor: "#6b7280", color: "#4b5563" }
                  }
                >
                  <ToggleLeft size={13} />{seleccionado.activo ? "Activo" : "Cerrado"}
                </button>
                <button onClick={() => setSeleccionado(null)} className="text-tactical-muted hover:text-white">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Preguntas del cuestionario */}
            {seleccionado.preguntas?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-tactical-muted mb-2">Preguntas</p>
                <div className="space-y-2">
                  {seleccionado.preguntas.map((p, i) => (
                    <div key={p.id || i} className="bg-[#0f0f0f] border border-[#2e2e2e] rounded-xl px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className="text-tactical-red font-black text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-semibold">{p.texto}</p>
                          {p.tipo === TIPO_MULTIPLE && p.opciones?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {p.opciones.map((op, oi) => (
                                <span key={oi} className="text-[11px] px-2 py-0.5 rounded-full border border-[#3e3e3e] text-gray-400">{op}</span>
                              ))}
                            </div>
                          )}
                          <span className="text-[10px] text-tactical-muted mt-1 block">
                            {p.tipo === TIPO_MULTIPLE ? "Opción múltiple" : "Texto libre"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Respuestas */}
            <div className="border-t border-[#2e2e2e] pt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-tactical-muted mb-3">
                Respuestas recibidas
              </p>
              {loadingResp ? (
                <div className="text-tactical-muted text-sm text-center py-8">Cargando respuestas...</div>
              ) : respuestas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-tactical-muted gap-2">
                  <Users size={36} className="opacity-30" />
                  <p className="text-sm">Aún no hay respuestas</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  <p className="text-xs text-tactical-muted">{respuestas.length} respuesta{respuestas.length !== 1 ? "s" : ""}</p>
                  {respuestas.map((r, i) => (
                    <RespuestaCard key={r.uid || i} respuesta={r} preguntas={seleccionado.preguntas || []} fmt={fmt} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {confirmarEliminar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] border border-red-900 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={22} className="text-red-400 flex-shrink-0" />
              <h3 className="text-white font-black text-sm uppercase tracking-wider">Eliminar cuestionario</h3>
            </div>
            <p className="text-gray-400 text-sm mb-2">¿Estás seguro de que deseas eliminar este cuestionario?</p>
            <p className="text-white font-bold text-sm mb-6">"{confirmarEliminar.titulo}"</p>
            <p className="text-red-400 text-xs mb-6">Esta acción no se puede deshacer. Las respuestas existentes no serán eliminadas.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarEliminar(null)}
                className="flex-1 py-2 rounded-xl border border-[#2e2e2e] text-gray-400 text-sm font-semibold hover:border-gray-500 transition-colors">
                Cancelar
              </button>
              <button onClick={() => eliminar(confirmarEliminar)}
                className="flex-1 py-2 rounded-xl bg-red-700 text-white text-sm font-black uppercase tracking-wider hover:bg-red-800 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarCrear && (
        <CrearCuestionarioModal
          onDismiss={() => setMostrarCrear(false)}
          onCreate={async (datos) => {
            await crearCuestionario(datos)
            setMostrarCrear(false)
          }}
        />
      )}
    </div>
  )
}

function CrearCuestionarioModal({ onDismiss, onCreate }) {
  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [preguntas, setPreguntas] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const addPregunta = (tipo) => setPreguntas(p => [...p, nuevaPregunta(tipo)])
  const removePregunta = (id) => setPreguntas(p => p.filter(x => x.id !== id))
  const updatePregunta = (id, campo, val) => setPreguntas(p => p.map(x => x.id === id ? { ...x, [campo]: val } : x))
  const addOpcion = (id) => setPreguntas(p => p.map(x => x.id === id ? { ...x, opciones: [...x.opciones, ""] } : x))
  const updateOpcion = (id, i, val) => setPreguntas(p => p.map(x => x.id === id ? { ...x, opciones: x.opciones.map((o, idx) => idx === i ? val : o) } : x))
  const removeOpcion = (id, i) => setPreguntas(p => p.map(x => x.id === id ? { ...x, opciones: x.opciones.filter((_, idx) => idx !== i) } : x))

  const publicar = async () => {
    if (!titulo.trim()) { setError("Ingresa el título"); return }
    if (preguntas.length === 0) { setError("Agrega al menos una pregunta"); return }
    if (preguntas.some(p => !p.texto.trim())) { setError("Todas las preguntas necesitan texto"); return }
    setSaving(true)
    await onCreate({ titulo: titulo.trim(), descripcion: descripcion.trim(), preguntas, fechaCreacion: Date.now(), activo: true })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161616] border border-[#2e2e2e] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-[#2e2e2e]">
          <h3 className="text-white font-black text-sm uppercase tracking-wider">Crear Cuestionario</h3>
          <button onClick={onDismiss} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Título *</label>
            <input className="w-full bg-[#0f0f0f] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D32F2F]"
              value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Cuestionario de servicio" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Descripción</label>
            <input className="w-full bg-[#0f0f0f] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D32F2F]"
              value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Opcional" />
          </div>

          {preguntas.length > 0 && <div className="border-t border-[#2e2e2e] pt-3 space-y-3">
            {preguntas.map((p, i) => (
              <div key={p.id} className="bg-[#0f0f0f] border border-[#2e2e2e] rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-tactical-red uppercase">
                    Pregunta {i + 1} · {p.tipo === TIPO_MULTIPLE ? "Opción múltiple" : "Texto libre"}
                  </span>
                  <button onClick={() => removePregunta(p.id)} className="ml-auto text-gray-600 hover:text-red-400"><Trash2 size={13} /></button>
                </div>
                <input className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D32F2F]"
                  value={p.texto} onChange={e => updatePregunta(p.id, "texto", e.target.value)} placeholder="Texto de la pregunta" />
                {p.tipo === TIPO_MULTIPLE && (
                  <div className="space-y-1.5 pl-2">
                    {p.opciones.map((op, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input className="flex-1 bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D32F2F]"
                          value={op} onChange={e => updateOpcion(p.id, oi, e.target.value)} placeholder={`Opción ${oi + 1}`} />
                        {p.opciones.length > 2 && (
                          <button onClick={() => removeOpcion(p.id, oi)} className="text-gray-600 hover:text-red-400"><X size={12} /></button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addOpcion(p.id)} className="text-xs text-tactical-red hover:text-red-400 flex items-center gap-1 mt-1">
                      <Plus size={11} /> Agregar opción
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>}

          <div className="flex gap-2">
            <button onClick={() => addPregunta(TIPO_TEXTO)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border border-[#2e2e2e] rounded-xl text-gray-400 hover:border-gray-500 hover:text-white transition-colors">
              <Type size={13} /> Texto libre
            </button>
            <button onClick={() => addPregunta(TIPO_MULTIPLE)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border border-[#2e2e2e] rounded-xl text-gray-400 hover:border-gray-500 hover:text-white transition-colors">
              <List size={13} /> Opción múltiple
            </button>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
        <div className="flex gap-3 p-5 border-t border-[#2e2e2e]">
          <button onClick={onDismiss} className="flex-1 py-2 rounded-xl border border-[#2e2e2e] text-gray-400 text-sm font-semibold hover:border-gray-500 transition-colors">Cancelar</button>
          <button onClick={publicar} disabled={saving}
            className="flex-1 py-2 rounded-xl bg-tactical-redSolid text-white text-sm font-black uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50">
            {saving ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </div>
    </div>
  )
}

function RespuestaCard({ respuesta, preguntas, fmt }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="bg-tactical-card border border-tactical-border rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-tactical-cardAlt transition-colors"
        onClick={() => setAbierto(!abierto)}
      >
        <div className="w-8 h-8 rounded-full bg-tactical-red/20 flex items-center justify-center flex-shrink-0">
          <span className="text-tactical-red text-xs font-black">{(respuesta.nombre || "?")[0]?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{respuesta.nombre || "Sin nombre"}</p>
          <p className="text-xs text-tactical-muted">
            {[respuesta.jerarquia, respuesta.equipo, respuesta.area].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-tactical-muted">{fmt(respuesta.timestamp)}</p>
        </div>
        {abierto ? <ChevronDown size={14} className="text-tactical-muted flex-shrink-0" /> : <ChevronRight size={14} className="text-tactical-muted flex-shrink-0" />}
      </div>
      {abierto && (
        <div className="border-t border-tactical-border p-3 space-y-3 bg-[#0f0f0f]">
          {preguntas.map((p, i) => (
            <div key={p.id || i}>
              <p className="text-xs font-bold text-tactical-muted uppercase tracking-wider mb-1">{p.texto}</p>
              <p className="text-sm text-white bg-tactical-card rounded-lg px-3 py-2">
                {respuesta.respuestas?.[p.id] || <span className="text-tactical-muted italic">Sin respuesta</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
