// Indicador del panel: el color es semántico (rojo emergencia, ámbar atención, verde disponible),
// la cifra va en monoespaciada grande para leerse de un vistazo. Si recibe onClick, lleva a la acción.
const ACENTO = {
  red:   { texto: "text-tactical-red",   barra: "bg-tactical-red" },
  amber: { texto: "text-tactical-amber", barra: "bg-tactical-amber" },
  green: { texto: "text-tactical-green", barra: "bg-tactical-green" },
  blue:  { texto: "text-tactical-blue",  barra: "bg-tactical-blue" },
}

export default function StatCard({ icon: Icon, label, value, tono = "red", detalle, loading, onClick }) {
  const a = ACENTO[tono] || ACENTO.red
  const Contenedor = onClick ? "button" : "div"
  return (
    <Contenedor
      onClick={onClick}
      className={`relative overflow-hidden text-left w-full bg-tactical-card border border-tactical-border rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-card
        ${onClick ? "transition-colors hover:border-tactical-muted/60 active:scale-[0.99]" : ""}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${a.barra}`} aria-hidden="true" />
      <div className={`p-2.5 rounded-lg bg-tactical-cardAlt ${a.texto} flex-shrink-0`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-tactical-muted text-[11px] sm:text-xs font-bold uppercase tracking-[0.12em] truncate">{label}</p>
        {loading ? (
          <div className="h-8 w-16 bg-tactical-border rounded animate-pulse mt-1" />
        ) : (
          <p className={`font-mono text-2xl sm:text-3xl font-extrabold leading-tight ${value > 0 && tono !== "blue" ? a.texto : "text-tactical-text"}`}>{value}</p>
        )}
        {detalle && <p className="text-tactical-muted text-[11px] truncate">{detalle}</p>}
      </div>
    </Contenedor>
  )
}
