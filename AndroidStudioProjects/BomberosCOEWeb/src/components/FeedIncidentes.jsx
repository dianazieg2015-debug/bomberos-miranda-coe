import { useEffect, useRef, useState } from "react"
import { MapPin, Radio } from "lucide-react"
import { haceCuanto } from "../radar"
import { colorArea } from "../areas"

const NUEVO_MS = 4000

// Feed de despacho: lo último que entró, arriba. Lo recién llegado destella para que el operador lo note.
export default function FeedIncidentes({ reportes, onAbrir, onVerTodas, max = 12 }) {
  const vistos = useRef(null)
  const [nuevos, setNuevos] = useState(new Set())
  const [, setReloj] = useState(0)

  // Re-render cada 30 s para que "hace X min" siga siendo verdad
  useEffect(() => {
    const t = setInterval(() => setReloj(n => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const ids = reportes.map(r => r.id)
    if (vistos.current === null) {   // primera carga: nada es "nuevo"
      vistos.current = new Set(ids)
      return
    }
    const llegados = ids.filter(id => !vistos.current.has(id))
    llegados.forEach(id => vistos.current.add(id))
    if (llegados.length === 0) return
    setNuevos(prev => new Set([...prev, ...llegados]))
    const t = setTimeout(() => setNuevos(prev => {
      const sig = new Set(prev)
      llegados.forEach(id => sig.delete(id))
      return sig
    }), NUEVO_MS)
    return () => clearTimeout(t)
  }, [reportes])

  const lista = reportes.slice(0, max)

  return (
    <div className="bg-tactical-card border border-tactical-border rounded-xl shadow-card flex flex-col min-h-0 h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-tactical-border">
        <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-tactical-text">
          <span className="w-2 h-2 rounded-full bg-tactical-red text-tactical-red pulso-vivo" aria-hidden="true" />
          Incidentes en vivo
        </h2>
        <span className="text-[11px] text-tactical-muted font-mono">{reportes.length} total</span>
      </div>

      {lista.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-12 text-tactical-muted">
          <Radio size={28} />
          <p className="text-sm font-semibold">Sin incidentes registrados</p>
          <p className="text-xs">Las minutas enviadas desde la app aparecerán aquí al instante</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-tactical-border/60" aria-live="polite">
          {lista.map(r => {
            const color = colorArea(r.area)
            return (
              <li key={r.id} className={nuevos.has(r.id) ? "fila-nueva" : ""}>
                <button
                  onClick={() => onAbrir?.(r)}
                  className="w-full text-left flex gap-3 px-4 py-3 hover:bg-tactical-cardAlt transition-colors min-h-[64px]"
                >
                  <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} aria-hidden="true" />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm text-tactical-text">{r.nroMinuta || "S/C"}</span>
                      {nuevos.has(r.id) && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-tactical-redSolid text-white tracking-wider">NUEVO</span>
                      )}
                      {r.esCorreccion && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded border border-tactical-amber text-tactical-amber tracking-wider">CORRECCIÓN</span>
                      )}
                      <span className="ml-auto text-[11px] text-tactical-muted whitespace-nowrap">{haceCuanto(r.timestamp)}</span>
                    </span>
                    <span className="block text-[13px] font-semibold text-tactical-text truncate mt-0.5">
                      {r.antares?.[0] || "Sin clasificación"}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-tactical-muted mt-0.5">
                      <span className="font-bold" style={{ color }}>{r.area || "—"}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{r.direccion || "Sin dirección"}</span>
                      {r.latitud && r.longitud ? <MapPin size={12} className="flex-shrink-0 text-tactical-green" aria-label="con GPS" /> : null}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {reportes.length > max && onVerTodas && (
        <button onClick={onVerTodas}
          className="flex items-center justify-center gap-1.5 w-full px-4 py-3 border-t border-tactical-border text-sm font-bold text-tactical-blue hover:bg-tactical-cardAlt rounded-b-xl">
          Ver las <span className="font-mono">{reportes.length}</span> minutas en Minutas →
        </button>
      )}
    </div>
  )
}
