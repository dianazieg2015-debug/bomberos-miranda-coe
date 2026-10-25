import { useState } from "react"
import { ChevronDown, ChevronRight, Shield, User, Search, Edit2, Trash2, KeyRound, X, Save, UserCheck } from "lucide-react"
import { actualizarUsuario, eliminarCuenta, restablecerPassword, generarPasswordTemporal, usuarioDeCorreo } from "../supabase"
import { AREAS, SECCIONES, ROLES, JERARQUIAS } from "../catalogos"
import CredencialesEntrega from "./CredencialesEntrega"

const AREA_CONFIG = {
  INCENDIO:         { color: "#ef4444", bgStyle: { background: "#ef444415" }, borderStyle: { borderColor: "#ef444440" }, dot: "bg-red-400" },
  RESCATE:          { color: "#f97316", bgStyle: { background: "#f9731615" }, borderStyle: { borderColor: "#f9731640" }, dot: "bg-orange-400" },
  APH:              { color: "#3b82f6", bgStyle: { background: "#3b82f615" }, borderStyle: { borderColor: "#3b82f640" }, dot: "bg-blue-400" },
  MATPEL:           { color: "#eab308", bgStyle: { background: "#eab30815" }, borderStyle: { borderColor: "#eab30840" }, dot: "bg-yellow-400" },
  "PREVENCIÓN":     { color: "#22c55e", bgStyle: { background: "#22c55e15" }, borderStyle: { borderColor: "#22c55e40" }, dot: "bg-green-400" },
  "LOGÍSTICA":      { color: "#a855f7", bgStyle: { background: "#a855f715" }, borderStyle: { borderColor: "#a855f740" }, dot: "bg-purple-400" },
  "ADMINISTRACIÓN": { color: "#6b7280", bgStyle: { background: "#6b728015" }, borderStyle: { borderColor: "#6b728040" }, dot: "bg-gray-500" },
}

const ROL_BADGE_STYLE = {
  admin:    { background: "#d9770620", color: "#d97706", borderColor: "#d97706" },
  jefeArea: { background: "#f9731620", color: "#f97316", borderColor: "#f97316" },
  bombero:  { background: "#3b82f620", color: "#3b82f6", borderColor: "#3b82f6" },
}

const ROL_LABEL = { admin: "Administrador", jefeArea: "Jefe de Área", bombero: "Bombero" }

function EditarUsuarioModal({ usuario, onClose, onGuardado, onEliminado }) {
  const [form, setForm] = useState({
    displayName: usuario.displayName || "",
    equipmentNumber: usuario.equipmentNumber || "",
    area: usuario.area || "",
    seccion: usuario.seccion || "",
    rol: usuario.rol || "bombero",
    jerarquia: usuario.jerarquia || "",
    aprobado: !!usuario.aprobado,
  })
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [msg, setMsg] = useState("")
  const [entrega, setEntrega] = useState(null)
  const usuarioLogin = usuarioDeCorreo(usuario.email)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    setSaving(true)
    setMsg("")
    try {
      await actualizarUsuario(usuario.uid, form)
      setMsg("✓ Datos actualizados")
      onGuardado()
    } catch (e) { setMsg("Error: " + e.message) }
    setSaving(false)
  }

  // Sin correos: el COE genera una contraseña temporal y se la entrega a la persona
  const resetPass = async () => {
    if (!usuario.email) { setMsg("Esta cuenta no tiene usuario asignado"); return }
    setResetting(true)
    setMsg("")
    try {
      const nueva = generarPasswordTemporal()
      await restablecerPassword(usuario.email, nueva)
      setEntrega({ nombre: usuario.displayName || usuarioLogin, usuario: usuarioLogin, password: nueva, motivo: "restablecida" })
    } catch (e) { setMsg("Error: " + e.message) }
    setResetting(false)
  }

  const eliminar = async () => {
    setSaving(true)
    try {
      await eliminarCuenta(usuario.uid)
      onEliminado()
      onClose()
    } catch (e) { setMsg("Error: " + e.message); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161616] border border-[#2e2e2e] rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-[#2e2e2e]">
          <div>
            <h3 className="text-white font-black text-sm uppercase tracking-wider">Editar Funcionario</h3>
            <p className="text-gray-500 text-xs mt-0.5">Equipo #{usuario.equipmentNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {entrega && <CredencialesEntrega {...entrega} onCerrar={() => setEntrega(null)} />}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Nombre y Apellido</label>
            <input className="w-full bg-[#0f0f0f] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D32F2F]"
              value={form.displayName} onChange={e => set("displayName", e.target.value)} />
          </div>
          <div>
            <p className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Usuario para entrar</p>
            <p className="font-mono text-sm text-white bg-[#0f0f0f] border border-[#2e2e2e] rounded-lg px-3 py-2 select-all">{usuarioLogin || "—"}</p>
          </div>

          {[
            { label: "Área", key: "area", options: AREAS },
            { label: "Sección", key: "seccion", options: SECCIONES },
            { label: "Rol", key: "rol", options: ROLES.map(r => r.val), labels: ROLES.reduce((a, r) => ({ ...a, [r.val]: r.label }), {}) },
            { label: "Jerarquía", key: "jerarquia", options: JERARQUIAS },
          ].map(({ label, key, options, labels }) => (
            <div key={key}>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</label>
              <select className="w-full bg-[#0f0f0f] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D32F2F]"
                value={form[key]} onChange={e => set(key, e.target.value)}>
                <option value="">— Sin seleccionar —</option>
                {options.map(o => <option key={o} value={o}>{labels ? labels[o] : o}</option>)}
              </select>
            </div>
          ))}

          <label className="flex items-center gap-2 text-sm text-white pt-1 cursor-pointer">
            <input type="checkbox" checked={form.aprobado} onChange={e => set("aprobado", e.target.checked)} className="accent-[#D32F2F]" />
            Cuenta aprobada <span className="text-gray-500 text-xs">(sin aprobar no puede enviar ni ver minutas)</span>
          </label>

          {msg && <p className={`text-xs font-semibold ${msg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{msg}</p>}
        </div>

        <div className="p-5 border-t border-[#2e2e2e] space-y-2">
          <button onClick={guardar} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-tactical-redSolid text-white text-sm font-black uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50">
            <Save size={14} /> {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
          <div className="flex gap-2">
            <button onClick={resetPass} disabled={resetting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-yellow-800 text-yellow-400 text-xs font-bold hover:bg-yellow-900/20 transition-colors disabled:opacity-50">
              <KeyRound size={13} /> {resetting ? "Generando…" : "Nueva contraseña"}
            </button>
            {!confirmDelete
              ? <button onClick={() => setConfirmDelete(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-900 text-red-400 text-xs font-bold hover:bg-red-900/20 transition-colors">
                  <Trash2 size={13} /> Dar de Baja
                </button>
              : <button onClick={eliminar} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-900 text-white text-xs font-black animate-pulse">
                  ¿Confirmar? Ya no podrá entrar
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

function PersonalCard({ usuario, isAdmin, onEdit }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors group">
      <div className="w-9 h-9 rounded-full bg-tactical-red/10 border border-tactical-red/20 flex items-center justify-center flex-shrink-0">
        <User size={15} className="text-tactical-red/60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-tactical-text text-sm font-semibold truncate">{usuario.displayName || "Sin nombre"}</p>
        <p className="text-tactical-muted text-xs">
          {usuario.jerarquia && <span className="text-gray-400">{usuario.jerarquia} · </span>}
          <span className="font-mono">#{usuario.equipmentNumber || "—"}</span>
        </p>
      </div>
      {!usuario.aprobado && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0" style={{ background: "#eab30820", color: "#eab308", borderColor: "#eab308" }}>
          Pendiente
        </span>
      )}
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0" style={ROL_BADGE_STYLE[usuario.rol] || ROL_BADGE_STYLE.bombero}>
        {ROL_LABEL[usuario.rol] || "Bombero"}
      </span>
      {isAdmin && (
        <button onClick={() => onEdit(usuario)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-tactical-red/20 text-tactical-muted hover:text-tactical-red flex-shrink-0">
          <Edit2 size={13} />
        </button>
      )}
    </div>
  )
}

function SeccionGroup({ seccion, miembros, isAdmin, onEdit }) {
  const [open, setOpen] = useState(false)
  const jefes = miembros.filter(u => u.rol === "jefeArea" || u.rol === "admin")
  const personal = miembros.filter(u => u.rol === "bombero")

  return (
    <div className="border-l-2 border-tactical-border/30 ml-2 pl-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full py-2.5 text-left group">
        {open ? <ChevronDown size={13} className="text-tactical-muted flex-shrink-0" /> : <ChevronRight size={13} className="text-tactical-muted flex-shrink-0" />}
        <span className="text-tactical-text text-xs font-extrabold uppercase tracking-widest">Sección {seccion}</span>
        <div className="flex items-center gap-2 ml-auto">
          {jefes.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ background: "#f9731620", color: "#f97316", borderColor: "#f97316" }}>
              {jefes.length} jefe{jefes.length > 1 ? "s" : ""}
            </span>
          )}
          <span className="text-[10px] text-tactical-muted">{miembros.length} pers.</span>
        </div>
      </button>
      {open && (
        <div className="pb-3 space-y-0.5">
          {jefes.length > 0 && (<>
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-tactical-muted px-3 pt-1 pb-1">Jefatura</p>
            {jefes.map((u, i) => <PersonalCard key={u.uid || i} usuario={u} isAdmin={isAdmin} onEdit={onEdit} />)}
            {personal.length > 0 && <div className="border-t border-tactical-border/20 my-1" />}
          </>)}
          {personal.length > 0 && (<>
            {jefes.length > 0 && <p className="text-[9px] font-extrabold uppercase tracking-widest text-tactical-muted px-3 pb-1">Personal</p>}
            {personal.map((u, i) => <PersonalCard key={u.uid || i} usuario={u} isAdmin={isAdmin} onEdit={onEdit} />)}
          </>)}
        </div>
      )}
    </div>
  )
}

export default function PersonalDirectorio({ usuarios, isAdmin = false }) {
  const [areaOpen, setAreaOpen] = useState({})
  const [busqueda, setBusqueda] = useState("")
  const [editando, setEditando] = useState(null)
  const [aprobando, setAprobando] = useState(null)

  const lista = usuarios
  const pendientes = lista.filter(u => !u.aprobado)
  const aprobar = async (u) => {
    setAprobando(u.uid)
    try { await actualizarUsuario(u.uid, { aprobado: true }) }
    catch (e) { alert("No se pudo aprobar: " + e.message) }
    setAprobando(null)
  }
  const toggleArea = (area) => setAreaOpen(prev => ({ ...prev, [area]: !prev[area] }))

  const usuariosFiltrados = busqueda.trim()
    ? lista.filter(u =>
        u.displayName?.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.equipmentNumber?.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.jerarquia?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : null

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tactical-muted" />
          <input
            className="w-full bg-tactical-card border border-tactical-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-tactical-text placeholder:text-tactical-muted focus:outline-none focus:border-tactical-red"
            placeholder="Buscar por nombre, equipo o jerarquía..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <span className="text-xs text-tactical-muted whitespace-nowrap">{lista.filter(u => u.displayName).length} con perfil</span>
      </div>

      {/* Cuentas nuevas esperando aprobación */}
      {isAdmin && pendientes.length > 0 && (
        <div className="rounded-2xl border p-4 space-y-2" style={{ background: "#eab30810", borderColor: "#eab30860" }}>
          <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: "#eab308" }}>
            {pendientes.length} cuenta{pendientes.length !== 1 ? "s" : ""} pendiente{pendientes.length !== 1 ? "s" : ""} de aprobación
          </p>
          {pendientes.map(u => (
            <div key={u.uid} className="flex items-center gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <p className="text-tactical-text font-semibold truncate">{u.displayName || "Sin nombre"} <span className="font-mono text-tactical-muted text-xs">#{u.equipmentNumber}</span></p>
                <p className="text-tactical-muted text-xs truncate">{u.email} · {u.area || "Sin área"}{u.seccion ? ` · Sec. ${u.seccion}` : ""}</p>
              </div>
              <button onClick={() => aprobar(u)} disabled={aprobando === u.uid}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-700 hover:bg-green-600 disabled:opacity-50">
                <UserCheck size={13} /> {aprobando === u.uid ? "..." : "Aprobar"}
              </button>
              <button onClick={() => setEditando(u)} className="p-1.5 rounded-lg text-tactical-muted hover:text-tactical-red"><Edit2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Resultados de búsqueda */}
      {usuariosFiltrados && (
        <div className="bg-tactical-card border border-tactical-border rounded-2xl overflow-hidden">
          {usuariosFiltrados.length === 0
            ? <p className="text-center py-8 text-tactical-muted text-sm">Sin resultados para "{busqueda}"</p>
            : usuariosFiltrados.map((u, i) => (
                <div key={u.uid || i} className="border-b border-tactical-border last:border-0">
                  <PersonalCard usuario={u} isAdmin={isAdmin} onEdit={setEditando} />
                </div>
              ))
          }
        </div>
      )}

      {/* Vista por área (cuando no hay búsqueda) */}
      {!usuariosFiltrados && AREAS.map(area => {
        const personalArea = lista.filter(u => u.area === area)
        if (personalArea.length === 0) return null
        const secciones = {}
        personalArea.forEach(u => {
          const sec = u.seccion?.trim() || "Sin Sección"
          if (!secciones[sec]) secciones[sec] = []
          secciones[sec].push(u)
        })
        const cfg = AREA_CONFIG[area] || AREA_CONFIG["ADMINISTRACIÓN"]
        const isOpen = !!areaOpen[area]
        return (
          <div key={area} className="rounded-2xl overflow-hidden border" style={cfg.borderStyle}>
            <button onClick={() => toggleArea(area)}
              className="flex items-center gap-3 w-full px-5 py-4 hover:brightness-110 transition-all text-left"
              style={cfg.bgStyle}>
              <div className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
              <Shield size={16} style={{ color: cfg.color }} className="flex-shrink-0" />
              <span className="font-black text-sm uppercase tracking-wider" style={{ color: cfg.color }}>{area}</span>
              <span className="text-tactical-muted text-xs">{personalArea.length} funcionario{personalArea.length !== 1 ? "s" : ""}</span>
              <div className="ml-auto flex items-center gap-3">
                <div className="hidden sm:flex gap-1">
                  {Object.entries(secciones).sort().map(([sec]) => (
                    <span key={sec} className="text-[9px] font-bold text-tactical-muted border border-tactical-border/50 rounded px-1.5 py-0.5">Sec. {sec}</span>
                  ))}
                </div>
                {isOpen ? <ChevronDown size={16} className="text-tactical-muted" /> : <ChevronRight size={16} className="text-tactical-muted" />}
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pt-2 pb-4 space-y-2 bg-tactical-bg">
                {Object.entries(secciones).sort().map(([sec, miembros]) => (
                  <SeccionGroup key={sec} seccion={sec} miembros={miembros} isAdmin={isAdmin} onEdit={setEditando} />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {lista.length === 0 && <div className="text-center py-16 text-tactical-muted text-sm">Sin personal registrado aún</div>}

      {editando && (
        <EditarUsuarioModal
          usuario={editando}
          onClose={() => setEditando(null)}
          onGuardado={() => setEditando(null)}
          onEliminado={() => {}}
        />
      )}
    </div>
  )
}
