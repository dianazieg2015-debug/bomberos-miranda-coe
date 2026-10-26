import { useState, useEffect } from "react"
import { UserPlus, Trash2, KeyRound, ShieldCheck, Clock, User, RefreshCw, Smartphone, Monitor } from "lucide-react"
import {
  crearCuenta, restablecerPassword, eliminarUsuarioCOE, escucharUsuariosCOE,
  generarPasswordTemporal, sugerirUsuario, usuarioDeCorreo,
} from "../supabase"
import { AREAS, SECCIONES, ROLES, JERARQUIAS } from "../catalogos"
import CredencialesEntrega from "./CredencialesEntrega"

const INPUT = "w-full bg-tactical-bg border border-tactical-muted/50 rounded-lg px-3 py-2.5 text-sm text-tactical-text placeholder:text-tactical-muted focus:outline-none focus:border-tactical-amber"
const LABEL = "block text-[11px] font-bold uppercase tracking-[0.12em] text-tactical-muted mb-1"

function formatFecha(iso) {
  if (!iso) return "—"
  try { return new Date(iso).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" }) } catch { return iso }
}

const FORM_VACIO = { tipo: "bombero", nombre: "", usuario: "", equipo: "", area: "", seccion: "", rol: "bombero", jerarquia: "" }

export default function GestionAccesoCOE() {
  const [admins, setAdmins] = useState([])
  const [form, setForm] = useState(FORM_VACIO)
  const [usuarioEditado, setUsuarioEditado] = useState(false)
  const [password, setPassword] = useState(generarPasswordTemporal)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")
  const [entrega, setEntrega] = useState(null)       // { nombre, usuario, password, motivo }
  const [confirmarQuitar, setConfirmarQuitar] = useState(null)
  const [restableciendo, setRestableciendo] = useState(null)

  useEffect(() => escucharUsuariosCOE(setAdmins), [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const cambiarNombre = (nombre) => setForm(f => ({ ...f, nombre, usuario: usuarioEditado ? f.usuario : sugerirUsuario(nombre) }))
  const esBombero = form.tipo === "bombero"

  const crear = async (e) => {
    e.preventDefault()
    setError("")
    if (esBombero && (!form.equipo.trim() || !form.area)) { setError("Para un bombero indica el número de equipo y el área."); return }
    setGuardando(true)
    try {
      await crearCuenta({ ...form, usuario: form.usuario.trim().toLowerCase(), equipo: form.equipo.trim().toUpperCase(), password })
      setEntrega({ nombre: form.nombre.trim(), usuario: form.usuario.trim().toLowerCase(), password, motivo: "nueva" })
      setForm(f => ({ ...FORM_VACIO, tipo: f.tipo }))
      setUsuarioEditado(false)
      setPassword(generarPasswordTemporal())
    } catch (err) {
      const m = err?.message || ""
      setError(/equipment_number|duplicate key/i.test(m) ? "Ese número de equipo ya pertenece a otra persona." : m || "No se pudo crear la cuenta.")
    } finally {
      setGuardando(false)
    }
  }

  const restablecer = async (a) => {
    setRestableciendo(a.email)
    setError("")
    try {
      const nueva = generarPasswordTemporal()
      await restablecerPassword(a.email, nueva)
      setEntrega({ nombre: a.nombre || usuarioDeCorreo(a.email), usuario: usuarioDeCorreo(a.email), password: nueva, motivo: "restablecida" })
    } catch (err) {
      setError(err?.message || "No se pudo restablecer la contraseña.")
    } finally {
      setRestableciendo(null)
    }
  }

  const quitarAcceso = async (a) => {
    try {
      await eliminarUsuarioCOE(a.uid)
      setConfirmarQuitar(null)
    } catch {
      setError("No se pudo quitar el acceso.")
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-lg font-black uppercase tracking-wider">Acceso COE</h2>
        <p className="text-tactical-muted text-xs mt-0.5">Aquí se crean todas las cuentas. Nadie puede registrarse por su cuenta.</p>
      </div>

      {entrega && <CredencialesEntrega {...entrega} onCerrar={() => setEntrega(null)} />}
      {error && (
        <div className="rounded-lg px-4 py-3 text-sm font-semibold border border-tactical-red bg-tactical-red/10 text-tactical-red" role="alert">{error}</div>
      )}

      {/* Nueva cuenta */}
      <form onSubmit={crear} className="bg-tactical-card border border-tactical-border rounded-xl p-5 shadow-card space-y-4">
        <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em]"><UserPlus size={14} className="text-tactical-red" /> Nueva cuenta</h3>

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de cuenta">
          {[
            { id: "bombero", icon: Smartphone, titulo: "Funcionario (app)", desc: "Envía minutas desde el teléfono" },
            { id: "coe", icon: Monitor, titulo: "Administrador COE", desc: "Entra a este panel y gestiona cuentas" },
          ].map(({ id, icon: Icon, titulo, desc }) => (
            <button key={id} type="button" role="radio" aria-checked={form.tipo === id} onClick={() => set("tipo", id)}
              className={`text-left rounded-lg border-2 px-4 py-3 transition-colors ${form.tipo === id ? "border-tactical-amber bg-tactical-amber/10" : "border-tactical-border hover:border-tactical-muted"}`}>
              <span className="flex items-center gap-2 text-sm font-bold"><Icon size={16} className={form.tipo === id ? "text-tactical-amber" : "text-tactical-muted"} /> {titulo}</span>
              <span className="block text-xs text-tactical-muted mt-0.5">{desc}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="cta-nombre" className={LABEL}>Nombre y apellido</label>
            <input id="cta-nombre" required className={INPUT} value={form.nombre} onChange={e => cambiarNombre(e.target.value)} placeholder="Ej: Yusmary Pérez" />
          </div>
          <div>
            <label htmlFor="cta-usuario" className={LABEL}>Usuario</label>
            <input id="cta-usuario" required className={`${INPUT} font-mono`} value={form.usuario}
              onChange={e => { setUsuarioEditado(true); set("usuario", e.target.value.toLowerCase().replace(/\s/g, "")) }}
              pattern="[a-z0-9][a-z0-9._\-]{2,39}|[^@\s]+@[^@\s]+\.[^@\s]+"
              title="Un usuario (3 a 40 letras minúsculas, números, punto o guion) o un correo completo"
              placeholder="yperez o correo@ejemplo.com" />
            <p className="text-[11px] text-tactical-muted mt-1">Puede ser un usuario corto o un correo. Con un correo inventado no llegan avisos: si olvida la contraseña, se la restableces aquí.</p>
          </div>
        </div>

        {esBombero && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label htmlFor="cta-equipo" className={LABEL}>N.º de equipo</label>
              <input id="cta-equipo" className={`${INPUT} font-mono uppercase`} value={form.equipo} onChange={e => set("equipo", e.target.value)} placeholder="102" />
            </div>
            {[
              { id: "area", label: "Área", opciones: AREAS },
              { id: "seccion", label: "Sección", opciones: SECCIONES },
              { id: "jerarquia", label: "Jerarquía", opciones: JERARQUIAS },
            ].map(({ id, label, opciones }) => (
              <div key={id}>
                <label htmlFor={`cta-${id}`} className={LABEL}>{label}</label>
                <select id={`cta-${id}`} className={INPUT} value={form[id]} onChange={e => set(id, e.target.value)}>
                  <option value="">—</option>
                  {opciones.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label htmlFor="cta-rol" className={LABEL}>Rol en la app</label>
              <select id="cta-rol" className={INPUT} value={form.rol} onChange={e => set("rol", e.target.value)}>
                {ROLES.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <p className={LABEL}>Contraseña temporal (generada)</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-extrabold bg-tactical-cardAlt rounded-lg px-4 py-2 select-all">{password}</span>
              <button type="button" onClick={() => setPassword(generarPasswordTemporal())} title="Generar otra"
                className="p-2.5 rounded-lg border border-tactical-border text-tactical-muted hover:text-tactical-text"><RefreshCw size={15} /></button>
            </div>
          </div>
          <button type="submit" disabled={guardando}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-tactical-redSolid text-white text-sm font-black uppercase tracking-wider hover:brightness-110 disabled:opacity-50 min-h-[44px]">
            <UserPlus size={15} /> {guardando ? "Creando…" : "Crear cuenta"}
          </button>
        </div>
        <p className="text-xs text-tactical-muted">
          Al primer ingreso, la app o el panel le pedirán a la persona crear su contraseña habitual.
          Las cuentas de funcionarios se gestionan después desde <strong className="text-tactical-text">Personal</strong>.
        </p>
      </form>

      {/* Administradores del panel */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em]">
          <ShieldCheck size={14} className="text-tactical-green" /> Administradores del COE ({admins.length})
        </h3>
        {admins.map(a => (
          <div key={a.uid} className="bg-tactical-card border border-tactical-border rounded-xl px-5 py-4 flex items-center gap-4 shadow-card">
            <div className="w-10 h-10 rounded-full bg-tactical-cardAlt flex items-center justify-center flex-shrink-0">
              <User size={18} className="text-tactical-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{a.nombre || "Sin nombre"}</p>
              <p className="font-mono text-xs text-tactical-muted truncate">{usuarioDeCorreo(a.email)}</p>
              <p className="flex items-center gap-1 mt-1 text-[11px] text-tactical-muted">
                <Clock size={10} /> Creado {formatFecha(a.creadoEn)}{a.creadoPor ? ` por ${usuarioDeCorreo(a.creadoPor)}` : ""}
              </p>
            </div>
            <button onClick={() => restablecer(a)} disabled={restableciendo === a.email}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-tactical-amber/60 text-tactical-amber text-xs font-bold hover:bg-tactical-amber/10 disabled:opacity-50">
              <KeyRound size={13} /> <span className="hidden sm:inline">Nueva contraseña</span>
            </button>
            <button onClick={() => setConfirmarQuitar(a)} title="Quitar acceso al panel" aria-label="Quitar acceso al panel"
              className="p-2 rounded-lg border border-tactical-red/60 text-tactical-red hover:bg-tactical-red/10">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {confirmarQuitar && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-tactical-card border border-tactical-border rounded-xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="font-black text-sm uppercase tracking-wider">¿Quitar acceso al panel?</h3>
            <p className="text-tactical-muted text-sm">
              <strong className="text-tactical-text">{confirmarQuitar.nombre || usuarioDeCorreo(confirmarQuitar.email)}</strong> dejará de poder entrar a este panel de inmediato.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarQuitar(null)} className="flex-1 py-2.5 rounded-lg border border-tactical-border text-tactical-muted hover:text-tactical-text text-sm font-bold">Cancelar</button>
              <button onClick={() => quitarAcceso(confirmarQuitar)} className="flex-1 py-2.5 rounded-lg bg-tactical-redSolid text-white text-sm font-black uppercase">Quitar acceso</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
