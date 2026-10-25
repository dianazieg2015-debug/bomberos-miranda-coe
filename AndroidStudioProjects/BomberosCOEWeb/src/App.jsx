import { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react"
import { FileText, Users, Map, BarChart2, Activity, Search, LogIn, LogOut, Lock, ClipboardList, Sun, Moon, KeyRound, UserCheck, Clock, X } from "lucide-react"
import FeedIncidentes from "./components/FeedIncidentes"
import { COLOR_AREA, colorArea } from "./areas"
import { supabase, loginCOE, logoutCOE, tieneAccesoCOE, esGestorCOE, cambiarPassword, debeCambiarPassword, usuarioDeCorreo } from "./supabase"
import { useReportes, useUsuarios } from "./hooks/useReportes"
import StatCard from "./components/StatCard"
// El motor WebGL del mapa pesa ~900 KB: se descarga solo al abrir la pestaña Mapa
const MapaCalor = lazy(() => import("./components/MapaCalor"))
import GraficaAreas from "./components/GraficaAreas"
import GraficaTendencia from "./components/GraficaTendencia"
import TablaMinutas, { coincideMinuta } from "./components/TablaMinutas"
import PersonalDirectorio from "./components/PersonalDirectorio"
import GestionAccesoCOE from "./components/GestionAccesoCOE"
import RespuestasCuestionarios from "./components/RespuestasCuestionarios"
import LoadingScreen from "./components/LoadingScreen"

const LOADER_MINIMO_MS = 2500

const AREAS_FILTRO = ["TODAS", "INCENDIO", "RESCATE", "APH", "MATPEL", "PREVENCIÓN", "LOGÍSTICA", "ADMINISTRACIÓN"]
const AREAS_MAPA   = ["INCENDIO", "RESCATE", "APH", "MATPEL", "PREVENCIÓN", "LOGÍSTICA", "ADMINISTRACIÓN"]

// Botones de filtro del mapa: mismo color de área que el resto del panel
const AREA_COLORS = Object.fromEntries(Object.keys(COLOR_AREA).map(area => {
  const c = colorArea(area)
  return [area, { on: c, off: `color-mix(in srgb, ${c} 45%, transparent)`, text: c }]
}))

export default function App() {
  const [sessionUser, setSessionUser] = useState(null)
  const [authListo, setAuthListo] = useState(false)
  // null = verificando, true/false = respuesta del servidor
  const [acceso, setAcceso] = useState(null)
  const [esGestor, setEsGestor] = useState(false)
  const [recuperando, setRecuperando] = useState(false)
  // Primer ingreso o contraseña restablecida por el COE: no se entra hasta crear la propia
  const debeCambiar = debeCambiarPassword(sessionUser)
  const adminUser = sessionUser && acceso && !debeCambiar ? sessionUser : null

  const { reportes, loading } = useReportes(!!adminUser)
  const { usuarios } = useUsuarios(!!adminUser)
  const [tab, setTab] = useState("dashboard")
  const [filtroArea, setFiltroArea] = useState("TODAS")
  // Todas las áreas visibles al abrir el mapa: lo útil sin tener que hacer clic
  const [areasMapaSeleccionadas, setAreasMapaSeleccionadas] = useState(() => new Set(AREAS_MAPA))
  const [busqueda, setBusqueda] = useState("")
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginInfo, setLoginInfo] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [nuevaPassword, setNuevaPassword] = useState("")
  const [nuevaPassword2, setNuevaPassword2] = useState("")
  const [isDark, setIsDark] = useState(() => localStorage.getItem("coe-theme") !== "light")

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionUser(data.session?.user ?? null)
      setAuthListo(true)
    })
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecuperando(true)
      setSessionUser(session?.user ?? null)
      setAuthListo(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // El servidor decide quién es COE: no basta con tener una cuenta
  useEffect(() => {
    if (!sessionUser) { setAcceso(null); setEsGestor(false); return }
    let vigente = true
    setAcceso(null)
    Promise.all([tieneAccesoCOE(), esGestorCOE()])
      .then(([a, g]) => { if (vigente) { setAcceso(!!a); setEsGestor(!!g) } })
      .catch(() => { if (vigente) setAcceso(false) })
    return () => { vigente = false }
  }, [sessionUser?.id])

  useEffect(() => {
    if (tab === "acceso" && !esGestor) setTab("dashboard")
  }, [tab, esGestor])

  // Escudo girando mientras se verifica la sesión (con un mínimo para que se aprecie el giro)
  const [loaderVisible, setLoaderVisible] = useState(true)
  const [loaderFading, setLoaderFading] = useState(false)
  const [minimoCumplido, setMinimoCumplido] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMinimoCumplido(true), LOADER_MINIMO_MS)
    return () => clearTimeout(t)
  }, [])
  const verificando = !authListo || (sessionUser && acceso === null)
  useEffect(() => {
    if (!loaderVisible || !minimoCumplido || verificando) return
    setLoaderFading(true)
    const t = setTimeout(() => setLoaderVisible(false), 600)
    return () => clearTimeout(t)
  }, [minimoCumplido, verificando, loaderVisible])

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev
      localStorage.setItem("coe-theme", next ? "dark" : "light")
      return next
    })
  }

  // El tema también va en <html> (lo aplica index.html antes de cargar React: sin parpadeo)
  useEffect(() => {
    document.documentElement.classList.toggle("light", !isDark)
  }, [isDark])

  // Estado real de la conexión (antes el indicador "en línea" era fijo)
  const [conexion, setConexion] = useState("en-linea")
  useEffect(() => {
    const revisar = () => {
      if (!navigator.onLine) return setConexion("sin-conexion")
      const canales = supabase.getChannels()
      setConexion(canales.length === 0 || supabase.realtime.isConnected() ? "en-linea" : "reconectando")
    }
    revisar()
    const t = setInterval(revisar, 4000)
    window.addEventListener("online", revisar)
    window.addEventListener("offline", revisar)
    return () => { clearInterval(t); window.removeEventListener("online", revisar); window.removeEventListener("offline", revisar) }
  }, [])

  // Atajos de teclado: 1–6 cambian de pestaña, "/" busca minutas
  const busquedaRef = useRef(null)
  const pestanas = [
    { id: "dashboard", label: "Despacho", icon: BarChart2 },
    { id: "mapa", label: "Mapa", icon: Map },
    { id: "minutas", label: "Minutas", icon: FileText },
    { id: "personal", label: "Personal", icon: Users },
    { id: "cuestionarios", label: "Cuestionarios", icon: ClipboardList },
    ...(esGestor ? [{ id: "acceso", label: "Acceso COE", icon: Lock }] : []),
  ]
  useEffect(() => {
    if (!adminUser) return
    const alTeclear = (e) => {
      const escribiendo = ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || e.target.isContentEditable
      if (escribiendo || e.ctrlKey || e.metaKey || e.altKey) return
      const n = Number(e.key)
      if (n >= 1 && n <= pestanas.length) { setTab(pestanas[n - 1].id); return }
      if (e.key === "/") {
        e.preventDefault()
        setTab("minutas")
        setTimeout(() => busquedaRef.current?.focus(), 0)
      }
    }
    window.addEventListener("keydown", alTeclear)
    return () => window.removeEventListener("keydown", alTeclear)
  }, [adminUser, pestanas.length])

  const abrirEnMinutas = (r) => {
    setFiltroArea("TODAS")
    setBusqueda(r.nroMinuta || "")
    setTab("minutas")
  }

  const toggleAreaMapa = (area) => {
    setAreasMapaSeleccionadas(prev => {
      const next = new Set(prev)
      if (next.has(area)) next.delete(area)
      else next.add(area)
      return next
    })
  }

  // TODOS siempre muestra todo (antes, pulsarlo con todo activo vaciaba el mapa)
  const toggleTodos = () => setAreasMapaSeleccionadas(new Set(AREAS_MAPA))

  const todosActivo = areasMapaSeleccionadas.size === AREAS_MAPA.length

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError("")
    setLoginInfo("")
    try {
      await loginCOE(loginEmail, loginPassword)
      setLoginEmail("")
      setLoginPassword("")
    } catch (err) {
      setLoginError(/confirm/i.test(err?.message || "")
        ? "Debes confirmar tu correo: revisa tu bandeja de entrada"
        : "Credenciales incorrectas")
    }
    setLoginLoading(false)
  }

  const handleNuevaPassword = async (e) => {
    e.preventDefault()
    setLoginError("")
    if (nuevaPassword.length < 8) { setLoginError("Usa al menos 8 caracteres."); return }
    if (nuevaPassword !== nuevaPassword2) { setLoginError("Las dos contraseñas no coinciden."); return }
    setLoginLoading(true)
    try {
      const { session } = await cambiarPassword(nuevaPassword)
      setSessionUser(session?.user ?? null)
      setRecuperando(false)
      setNuevaPassword("")
      setNuevaPassword2("")
      setLoginInfo("Contraseña guardada. Úsala desde ahora en la app y en este panel.")
    } catch (err) {
      setLoginError(/same/i.test(err?.message || "") ? "Debe ser distinta de la contraseña temporal." : err?.message || "No se pudo cambiar la contraseña.")
    }
    setLoginLoading(false)
  }

  const hoy = useMemo(() => {
    const now = new Date()
    return `${String(now.getDate()).padStart(2,"0")}-${String(now.getMonth()+1).padStart(2,"0")}-${now.getFullYear()}`
  }, [])

  const reportesHoy = useMemo(() => reportes.filter(r => r.fecha === hoy).length, [reportes, hoy])
  const conGPS = useMemo(() => reportes.filter(r => r.latitud && r.longitud).length, [reportes])
  const ultimas24h = useMemo(() => reportes.filter(r => r.timestamp && Date.now() - r.timestamp <= 864e5).length, [reportes])
  const pendientesAprobacion = useMemo(() => usuarios.filter(u => !u.aprobado).length, [usuarios])
  const personalActivo = usuarios.length - pendientesAprobacion

  const reportesMapaFiltrados = useMemo(() => {
    const conGPS = reportes.filter(r => r.latitud && r.longitud)
    if (areasMapaSeleccionadas.size === 0) return []
    if (areasMapaSeleccionadas.size === AREAS_MAPA.length) return conGPS
    return conGPS.filter(r => areasMapaSeleccionadas.has(r.area))
  }, [reportes, areasMapaSeleccionadas])

  return (
    <div className={`min-h-screen bg-tactical-bg text-tactical-text font-inter${isDark ? "" : " light"}`}>
      {loaderVisible && <LoadingScreen fading={loaderFading} />}

      {/* Header */}
      <header className="bg-tactical-surface border-b border-tactical-border px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <img src="./escudo-bomberos-miranda.png" alt="Escudo Bomberos Miranda" className="h-10 w-auto flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-tactical-text font-black text-sm tracking-wider uppercase leading-none truncate">
              COE · Bomberos Miranda
            </h1>
            <p className="text-tactical-muted text-xs tracking-widest uppercase hidden sm:block">Centro de Operaciones de Emergencia</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-3">
            {adminUser && (() => {
              const e = {
                "en-linea":     { clase: "text-tactical-green", texto: "En línea · Tiempo real" },
                "reconectando": { clase: "text-tactical-amber", texto: "Reconectando…" },
                "sin-conexion": { clase: "text-tactical-red",   texto: "Sin conexión" },
              }[conexion]
              return (
                <div className={`flex items-center gap-2 ${e.clase}`} role="status" title={e.texto}>
                  <span className={`w-2.5 h-2.5 rounded-full bg-current ${conexion === "en-linea" ? "pulso-vivo" : ""}`} />
                  <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">{e.texto}</span>
                </div>
              )
            })()}
            <button onClick={toggleTheme} className="p-2 rounded-lg border border-tactical-border text-tactical-muted hover:text-tactical-text hover:border-tactical-red transition-colors" title={isDark ? "Modo claro" : "Modo oscuro"}>
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
          {sessionUser && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 hidden sm:inline">{usuarioDeCorreo(sessionUser.email)}</span>
              <button onClick={logoutCOE} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1e1e] border border-[#2e2e2e] text-gray-400 hover:text-white text-xs font-semibold transition-colors">
                <LogOut size={13} /> Salir
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Pantallas de acceso: sin sesión válida no se muestra ningún dato */}
      {!adminUser && !loaderVisible && (
        <div className="flex items-center justify-center p-4 min-h-[calc(100vh-64px)]">
          <div className="modal-dark bg-[#161616] border border-[#2e2e2e] rounded-2xl w-full max-w-sm shadow-2xl p-6">
            {recuperando || debeCambiar ? (
              <>
                <div className="mb-5">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider flex items-center gap-2"><KeyRound size={15} className="text-tactical-amber" /> Crea tu contraseña</h3>
                  <p className="text-gray-400 text-xs mt-1">
                    Entraste con una contraseña temporal. Elige la que usarás desde ahora en el panel y en la app.
                  </p>
                  {sessionUser && <p className="font-mono text-xs text-gray-500 mt-2">Usuario: {usuarioDeCorreo(sessionUser.email)}</p>}
                </div>
                <form onSubmit={handleNuevaPassword} className="space-y-3">
                  <input type="password" required autoComplete="new-password" value={nuevaPassword} onChange={e => setNuevaPassword(e.target.value)} placeholder="Nueva contraseña (mínimo 8)" aria-label="Nueva contraseña"
                    className="input-dark w-full bg-[#0f0f0f] border border-[#2e2e2e] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#D32F2F]" />
                  <input type="password" required autoComplete="new-password" value={nuevaPassword2} onChange={e => setNuevaPassword2(e.target.value)} placeholder="Repite la contraseña" aria-label="Repite la contraseña"
                    className="input-dark w-full bg-[#0f0f0f] border border-[#2e2e2e] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#D32F2F]" />
                  {loginError && <p className="text-red-400 text-xs font-semibold">{loginError}</p>}
                  <button type="submit" disabled={loginLoading} className="w-full py-2.5 rounded-xl bg-tactical-redSolid text-white text-sm font-black uppercase tracking-wider hover:brightness-110 transition disabled:opacity-50">
                    {loginLoading ? "Guardando…" : "Guardar y entrar"}
                  </button>
                  <button type="button" onClick={logoutCOE} className="w-full text-xs text-gray-500 hover:text-gray-300">Cerrar sesión</button>
                </form>
              </>
            ) : !authListo || (sessionUser && acceso === null) ? (
              <p className="text-gray-400 text-sm text-center py-6">Verificando acceso...</p>
            ) : sessionUser ? (
              <div className="space-y-4 text-center">
                <Lock size={28} className="mx-auto text-tactical-red" />
                <h3 className="text-white font-black text-sm uppercase tracking-wider">Sin acceso al COE</h3>
                {loginInfo && <p className="text-green-400 text-xs font-semibold">{loginInfo}</p>}
                <p className="text-gray-400 text-xs">La cuenta {usuarioDeCorreo(sessionUser.email)} no está autorizada para este panel. Pide acceso a un administrador del COE.</p>
                <button onClick={logoutCOE} className="w-full py-2.5 rounded-xl border border-[#2e2e2e] text-gray-300 hover:text-white text-sm font-bold">Cerrar sesión</button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">Acceso COE</h3>
                  <p className="text-gray-500 text-xs mt-0.5">Solo personal autorizado</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="login-usuario" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Usuario</label>
                    <input id="login-usuario" type="text" required autoComplete="username" autoCapitalize="none" spellCheck={false}
                      value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="ej: yperez"
                      className="input-dark w-full bg-[#0f0f0f] border border-[#2e2e2e] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#D32F2F]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Contraseña</label>
                    <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                      className="input-dark w-full bg-[#0f0f0f] border border-[#2e2e2e] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#D32F2F]" />
                  </div>
                  {loginError && <p className="text-red-400 text-xs font-semibold">{loginError}</p>}
                  {loginInfo && <p className="text-green-400 text-xs font-semibold">{loginInfo}</p>}
                  <button type="submit" disabled={loginLoading} className="w-full py-2.5 rounded-xl bg-tactical-redSolid text-white text-sm font-black uppercase tracking-wider hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    <LogIn size={15} /> {loginLoading ? "Ingresando..." : "Ingresar"}
                  </button>
                  <p className="text-center text-xs text-gray-500">
                    ¿Olvidaste tu contraseña? Pide a un administrador del COE que te asigne una nueva.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {adminUser && (<>
      {/* Nav */}
      <nav className="bg-tactical-surface border-b border-tactical-border px-2 sm:px-6 flex gap-1 overflow-x-auto" aria-label="Secciones">
        {pestanas.map(({ id, label, icon: Icon }, i) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            title={`${label} · atajo: tecla ${i + 1}`}
            className={`flex items-center gap-2 px-3 sm:px-4 py-3.5 text-sm font-bold border-b-[3px] transition-colors whitespace-nowrap ${
              tab === id
                ? "border-tactical-red text-tactical-text"
                : "border-transparent text-tactical-muted hover:text-tactical-text"
            }`}
          >
            <Icon size={16} className={tab === id ? "text-tactical-red" : ""} />
            {label}
          </button>
        ))}
      </nav>

      <main className="p-4 sm:p-6 max-w-[1600px] mx-auto">
        {/* DESPACHO: lo urgente arriba y a la izquierda; el contexto a la derecha */}
        {tab === "dashboard" && (
          <div className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
              <StatCard icon={Activity} label="Incidentes hoy" value={reportesHoy} tono="red" detalle={`${ultimas24h} en las últimas 24 h`} loading={loading} />
              <StatCard icon={UserCheck} label="Por aprobar" value={pendientesAprobacion} tono="amber"
                detalle={pendientesAprobacion ? "Toca para revisar" : "Ninguna cuenta en espera"}
                onClick={pendientesAprobacion ? () => setTab("personal") : undefined} loading={loading} />
              <StatCard icon={Users} label="Personal activo" value={personalActivo} tono="green" detalle="Cuentas aprobadas" loading={loading} />
              <StatCard icon={Map} label="Con GPS" value={conGPS} tono="blue" detalle="Ver en el mapa" onClick={() => setTab("mapa")} loading={loading} />
              <StatCard icon={FileText} label="Total minutas" value={reportes.length} tono="blue" detalle="Historial completo" onClick={() => setTab("minutas")} loading={loading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
              <div className="lg:col-span-2 lg:h-[calc(100vh-290px)] lg:min-h-[480px] max-h-[640px] lg:max-h-none">
                <FeedIncidentes reportes={reportes} onAbrir={abrirEnMinutas} max={20}
                  onVerTodas={() => { setBusqueda(""); setFiltroArea("TODAS"); setTab("minutas") }} />
              </div>
              <div className="lg:col-span-3 grid grid-cols-1 gap-4 sm:gap-5">
                <div className="bg-tactical-card border border-tactical-border rounded-xl p-4 sm:p-5 shadow-card">
                  <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-tactical-text mb-3">Reportes por área</h2>
                  <div className="h-56">
                    <GraficaAreas reportes={reportes} />
                  </div>
                </div>
                <div className="bg-tactical-card border border-tactical-border rounded-xl p-4 sm:p-5 shadow-card">
                  <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-tactical-text mb-3 flex items-center gap-2">
                    <Clock size={13} className="text-tactical-muted" /> Tendencia · últimos 30 días
                  </h2>
                  <div className="h-56">
                    <GraficaTendencia reportes={reportes} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAPA */}
        {tab === "mapa" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider text-tactical-text">Mapa</h2>
                <p className="text-tactical-muted text-xs">{conGPS} reportes con coordenadas GPS · {areasMapaSeleccionadas.size === 0 ? "selecciona un área para ver en el mapa" : areasMapaSeleccionadas.size === AREAS_MAPA.length ? "todas las áreas visibles" : `${areasMapaSeleccionadas.size} área(s) visible(s)`}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* TODOS */}
                <button
                  onClick={toggleTodos}
                  style={todosActivo ? { background: "#6b7280", borderColor: "#6b7280", color: "white" } : { borderColor: "#4b5563", color: "#9ca3af" }}
                  className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border"
                >
                  TODOS
                </button>
                {/* Area buttons */}
                {AREAS_MAPA.map(area => {
                  const c = AREA_COLORS[area]
                  const activo = areasMapaSeleccionadas.has(area)
                  return (
                    <button
                      key={area}
                      onClick={() => toggleAreaMapa(area)}
                      style={activo
                        ? { background: c.on, borderColor: c.on, color: "white" }
                        : { borderColor: c.off, color: c.text, background: "transparent" }
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border"
                    >
                      {area}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="h-[600px]">
              <Suspense fallback={<div className="h-full rounded-2xl border border-tactical-border bg-[#0B0D10] flex items-center justify-center text-tactical-muted text-sm font-mono">CARGANDO RADAR…</div>}>
                <MapaCalor reportes={reportesMapaFiltrados} todosLosReportes={reportes} isDark={isDark} />
              </Suspense>
            </div>
          </div>
        )}

        {/* MINUTAS */}
        {tab === "minutas" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-wider">
                Todas las Minutas
                <span className="ml-2 text-tactical-muted text-sm font-normal">({reportes.length})</span>
              </h2>
              <div className="flex gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tactical-muted" />
                  <input
                    type="text"
                    ref={busquedaRef}
                    placeholder="Buscar por código, dirección…  ( / )"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    onKeyDown={e => { if (e.key === "Escape") setBusqueda("") }}
                    className={`w-full bg-tactical-card border rounded-lg pl-9 pr-9 py-2 text-sm text-tactical-text placeholder:text-tactical-muted focus:outline-none focus:border-tactical-red ${busqueda ? "border-tactical-amber" : "border-tactical-border"}`}
                  />
                  {busqueda && (
                    <button onClick={() => { setBusqueda(""); busquedaRef.current?.focus() }} title="Borrar búsqueda (Esc)" aria-label="Borrar búsqueda"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-tactical-muted hover:text-tactical-text hover:bg-tactical-cardAlt">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <select
                  value={filtroArea}
                  onChange={e => setFiltroArea(e.target.value)}
                  className="bg-tactical-card border border-tactical-border rounded-lg px-3 py-2 text-sm text-tactical-text focus:outline-none focus:border-tactical-red"
                >
                  {AREAS_FILTRO.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            {(busqueda || filtroArea !== "TODAS") && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-tactical-amber/60 bg-tactical-amber/10 px-4 py-2.5 text-sm" role="status">
                <span className="font-bold text-tactical-amber">
                  Mostrando {reportes.filter(r => coincideMinuta(r, filtroArea, busqueda)).length} de {reportes.length}
                </span>
                {busqueda && <span className="text-tactical-text">· búsqueda: <span className="font-mono font-bold">{busqueda}</span></span>}
                {filtroArea !== "TODAS" && <span className="text-tactical-text">· área: <strong>{filtroArea}</strong></span>}
                <button onClick={() => { setBusqueda(""); setFiltroArea("TODAS") }}
                  className="ml-auto px-3 py-1.5 rounded-md bg-tactical-amber text-tactical-onAmber text-xs font-black uppercase tracking-wider hover:brightness-110">
                  Ver todas
                </button>
              </div>
            )}
            <div className="bg-tactical-card border border-tactical-border rounded-2xl overflow-hidden">
              <TablaMinutas reportes={reportes} filtroArea={filtroArea} filtroBusqueda={busqueda} isAdmin={!!adminUser} />
            </div>
          </div>
        )}

        {/* PERSONAL */}
        {tab === "personal" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider">Personal Registrado</h2>
                <p className="text-tactical-muted text-xs mt-0.5">
                  {usuarios.length} funcionario{usuarios.length !== 1 ? "s" : ""} · Organizado por Área y Sección
                </p>
              </div>
            </div>
            <PersonalDirectorio usuarios={usuarios} isAdmin={!!adminUser} />
          </div>
        )}

        {tab === "cuestionarios" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider">Cuestionarios</h2>
              <p className="text-tactical-muted text-xs mt-0.5">Respuestas de los funcionarios a cuestionarios publicados</p>
            </div>
            <div className="bg-tactical-card border border-tactical-border rounded-2xl p-5">
              <RespuestasCuestionarios isAdmin={!!adminUser} />
            </div>
          </div>
        )}

        {tab === "acceso" && esGestor && (
          <GestionAccesoCOE adminEmail={adminUser.email} />
        )}
      </main>
      </>)}
    </div>
  )
}
