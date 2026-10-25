import { useState } from "react"
import { Copy, Check, KeyRound, X } from "lucide-react"

// Lo que el COE le entrega a la persona (en mano, por radio o por WhatsApp).
// La contraseña solo se ve aquí: el sistema no la guarda en claro.
export default function CredencialesEntrega({ nombre, usuario, password, motivo = "nueva", onCerrar }) {
  const [copiado, setCopiado] = useState(false)
  const mensaje =
    `Bomberos Miranda · ${motivo === "nueva" ? "Acceso al sistema" : "Contraseña restablecida"}\n` +
    `${nombre}\n` +
    `Su usuario es: ${usuario}\n` +
    `Su contraseña temporal es: ${password}\n` +
    `Al entrar por primera vez, el sistema le pedirá crear su contraseña habitual.`

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensaje)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="rounded-xl border-2 border-tactical-amber bg-tactical-card p-5 space-y-4 shadow-card" role="alert">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-tactical-amber">
            <KeyRound size={14} /> Credenciales para entregar
          </p>
          <p className="text-tactical-text font-bold mt-1">{nombre}</p>
        </div>
        <button onClick={onCerrar} className="text-tactical-muted hover:text-tactical-text" aria-label="Cerrar"><X size={18} /></button>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-tactical-cardAlt rounded-lg px-4 py-3">
          <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-tactical-muted">Usuario</dt>
          <dd className="font-mono text-xl font-extrabold text-tactical-text select-all">{usuario}</dd>
        </div>
        <div className="bg-tactical-cardAlt rounded-lg px-4 py-3">
          <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-tactical-muted">Contraseña temporal</dt>
          <dd className="font-mono text-xl font-extrabold text-tactical-text select-all">{password}</dd>
        </div>
      </dl>

      <p className="text-xs text-tactical-muted">
        Entrégala por un canal privado. Esta contraseña <strong className="text-tactical-text">no se volverá a mostrar</strong>; al primer ingreso la persona debe crear la suya.
      </p>

      <button onClick={copiar}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-tactical-amber text-tactical-onAmber text-sm font-black uppercase tracking-wider hover:brightness-110">
        {copiado ? <><Check size={15} /> Copiado</> : <><Copy size={15} /> Copiar mensaje para enviar</>}
      </button>
    </div>
  )
}
