import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

// Números a mostrar: siempre la primera y la última, y dos alrededor de la actual (1 … 4 5 6 … 12)
function paginasVisibles(actual, total) {
  const set = new Set([1, total, actual - 1, actual, actual + 1].filter(p => p >= 1 && p <= total))
  const orden = [...set].sort((a, b) => a - b)
  const res = []
  orden.forEach((p, i) => {
    if (i > 0 && p - orden[i - 1] > 1) res.push("…" + p)
    res.push(p)
  })
  return res
}

export default function Paginador({ pagina, totalPaginas, total, desde, hasta, porPagina, onPagina, onPorPagina, opciones = [25, 50, 100] }) {
  const btn = "min-w-[36px] h-9 px-2 rounded-lg text-sm font-bold border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
  const normal = "border-tactical-border text-tactical-muted hover:text-tactical-text hover:border-tactical-muted"
  const ir = (p) => onPagina(Math.min(Math.max(1, p), totalPaginas))

  return (
    <nav className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-tactical-border" aria-label="Paginación">
      <div className="flex items-center gap-3 text-sm text-tactical-muted">
        <span>
          Mostrando <strong className="font-mono text-tactical-text">{desde}–{hasta}</strong> de <strong className="font-mono text-tactical-text">{total}</strong>
        </span>
        <label className="flex items-center gap-1.5">
          <span className="hidden sm:inline">por página</span>
          <select value={porPagina} onChange={e => onPorPagina(Number(e.target.value))} aria-label="Minutas por página"
            className="bg-tactical-card border border-tactical-border rounded-md px-2 py-1 text-sm text-tactical-text focus:outline-none focus:border-tactical-amber">
            {opciones.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center gap-1">
          <button className={`${btn} ${normal}`} onClick={() => ir(1)} disabled={pagina === 1} aria-label="Primera página"><ChevronsLeft size={15} className="mx-auto" /></button>
          <button className={`${btn} ${normal}`} onClick={() => ir(pagina - 1)} disabled={pagina === 1} aria-label="Página anterior"><ChevronLeft size={15} className="mx-auto" /></button>
          {paginasVisibles(pagina, totalPaginas).map(p =>
            typeof p === "string"
              ? <span key={p} className="px-1 text-tactical-muted" aria-hidden="true">…</span>
              : <button key={p} onClick={() => ir(p)} aria-current={p === pagina ? "page" : undefined}
                  className={`${btn} font-mono ${p === pagina ? "border-tactical-red bg-tactical-red/15 text-tactical-text" : normal}`}>{p}</button>
          )}
          <button className={`${btn} ${normal}`} onClick={() => ir(pagina + 1)} disabled={pagina === totalPaginas} aria-label="Página siguiente"><ChevronRight size={15} className="mx-auto" /></button>
          <button className={`${btn} ${normal}`} onClick={() => ir(totalPaginas)} disabled={pagina === totalPaginas} aria-label="Última página"><ChevronsRight size={15} className="mx-auto" /></button>
        </div>
      )}
    </nav>
  )
}
