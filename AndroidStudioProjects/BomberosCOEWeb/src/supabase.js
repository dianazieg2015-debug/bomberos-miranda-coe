import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en el archivo .env")
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const check = ({ data, error }) => {
  if (error) throw error
  return data
}

// ---------------------------------------------------------------------
// Conversión entre columnas de la BD (snake_case) y los objetos que usa la UI
// ---------------------------------------------------------------------

export const usuarioDesdeBD = (u) => ({
  uid: u.id,
  email: u.email,
  displayName: u.display_name,
  equipmentNumber: u.equipment_number,
  area: u.area,
  seccion: u.seccion,
  rol: u.rol,
  jerarquia: u.jerarquia,
  perfilCompleto: u.perfil_completo,
  aprobado: u.aprobado,
})

const USUARIO_A_BD = {
  email: "email", displayName: "display_name", equipmentNumber: "equipment_number", area: "area",
  seccion: "seccion", rol: "rol", jerarquia: "jerarquia", aprobado: "aprobado",
}

export const reporteDesdeBD = (r) => ({
  id: r.id,
  uid: r.uid,
  fecha: r.fecha,
  hora: r.hora,
  nroMinuta: r.nro_minuta,
  estacion: r.estacion,
  antares: r.antares || [],
  direccion: r.direccion,
  resena: r.resena,
  comandante: r.comandante,
  unidad: r.unidad,
  autoridades: r.autoridades,
  elaboradoPor: r.elaborado_por,
  timestamp: r.timestamp_ms,
  estado: r.estado,
  autorNombre: r.autor_nombre,
  autorEquipo: r.autor_equipo,
  area: r.area,
  seccion: r.seccion,
  latitud: r.latitud,
  longitud: r.longitud,
  imagenesUrls: r.imagenes_urls || [],
  esCorreccion: r.es_correccion,
  minutaOriginalId: r.minuta_original_id,
})

const REPORTE_A_BD = {
  uid: "uid", fecha: "fecha", hora: "hora", nroMinuta: "nro_minuta", estacion: "estacion", antares: "antares",
  direccion: "direccion", resena: "resena", comandante: "comandante", unidad: "unidad", autoridades: "autoridades",
  elaboradoPor: "elaborado_por", estado: "estado", autorNombre: "autor_nombre", autorEquipo: "autor_equipo",
  area: "area", seccion: "seccion", latitud: "latitud", longitud: "longitud", imagenesUrls: "imagenes_urls",
  esCorreccion: "es_correccion", minutaOriginalId: "minuta_original_id",
}

const cuestionarioDesdeBD = (c) => ({
  id: c.id,
  titulo: c.titulo,
  descripcion: c.descripcion,
  preguntas: c.preguntas || [],
  fechaCreacion: c.fecha_creacion,
  creadoPor: c.creado_por,
  activo: c.activo,
})

const CUESTIONARIO_A_BD = {
  titulo: "titulo", descripcion: "descripcion", preguntas: "preguntas", creadoPor: "creado_por", activo: "activo",
}

const respuestaDesdeBD = (r) => ({
  cuestionarioId: r.cuestionario_id,
  uid: r.uid,
  nombre: r.nombre,
  equipo: r.equipo,
  jerarquia: r.jerarquia,
  area: r.area,
  respuestas: r.respuestas || {},
  timestamp: r.timestamp_ms,
})

const usuarioCOEDesdeBD = (u) => ({
  uid: u.id,
  email: u.email,
  nombre: u.nombre,
  creadoPor: u.creado_por,
  creadoEn: u.creado_en,
  activo: u.activo,
})

const aBD = (mapa, obj) => {
  const fila = {}
  for (const [k, v] of Object.entries(obj)) if (k in mapa && v !== undefined) fila[mapa[k]] = v
  return fila
}

// ---------------------------------------------------------------------
// Tiempo real: carga la tabla y la vuelve a cargar cuando cambia algo.
// Recargar (en vez de aplicar cada evento) garantiza que la web muestre
// exactamente lo mismo que la base de datos, respetando los permisos.
// ---------------------------------------------------------------------

async function leerTodo(construirConsulta) {
  const PAGINA = 1000
  const filas = []
  for (let desde = 0; ; desde += PAGINA) {
    const data = check(await construirConsulta().range(desde, desde + PAGINA - 1))
    filas.push(...data)
    if (data.length < PAGINA) return filas
  }
}

function escucharTabla(tabla, cargar, cb) {
  let activo = true
  let timer = null
  const recargar = async () => {
    try {
      const datos = await cargar()
      if (activo) cb(datos)
    } catch (e) {
      console.error(`Error cargando ${tabla}:`, e)
    }
  }
  const canal = supabase
    .channel(`rt-${tabla}-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: tabla }, () => {
      clearTimeout(timer)
      timer = setTimeout(recargar, 300)
    })
    .subscribe(status => {
      // También recarga al reconectar, por si se perdieron eventos sin conexión
      if (status === "SUBSCRIBED") recargar()
    })
  recargar()
  return () => {
    activo = false
    clearTimeout(timer)
    supabase.removeChannel(canal)
  }
}

// ---------------------------------------------------------------------
// Cuentas: el COE asigna un USUARIO; por dentro es <usuario>@cuentas.coe-miranda.test
// (mismo dominio que public.correo_de_usuario en schema.sql). Un correo completo también vale.
// ---------------------------------------------------------------------

const DOMINIO_CUENTAS = "@cuentas.coe-miranda.test"
export const correoDeUsuario = (u) => {
  const v = (u || "").trim().toLowerCase()
  return v.includes("@") ? v : v + DOMINIO_CUENTAS
}
export const usuarioDeCorreo = (email) =>
  (email || "").toLowerCase().endsWith(DOMINIO_CUENTAS) ? email.slice(0, -DOMINIO_CUENTAS.length) : (email || "")

// Sin 0/O, 1/l/I: se dicta por radio o se copia de una pantalla sin confusiones
export function generarPasswordTemporal() {
  const letras = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz", cifras = "23456789"
  const al = (s, n) => Array.from(crypto.getRandomValues(new Uint32Array(n)), x => s[x % s.length]).join("")
  return `${al(letras, 4)}-${al(cifras, 4)}`
}

// "Yusmary Pérez" → "yperez"
export function sugerirUsuario(nombre) {
  const partes = (nombre || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, "").split(/\s+/).filter(Boolean)
  if (partes.length === 0) return ""
  return partes.length === 1 ? partes[0] : partes[0][0] + partes[1]
}

// ---------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------

export const loginCOE = async (usuario, password) =>
  check(await supabase.auth.signInWithPassword({ email: correoDeUsuario(usuario), password }))
export const logoutCOE = () => supabase.auth.signOut()
export const tieneAccesoCOE = async () => check(await supabase.rpc("es_admin"))
export const esGestorCOE = async () => check(await supabase.rpc("es_coe"))
export const debeCambiarPassword = (user) => user?.app_metadata?.debe_cambiar_password === true

// Primer ingreso o tras un restablecimiento: pone la contraseña habitual y deja de pedirla
export async function cambiarPassword(password) {
  check(await supabase.auth.updateUser({ password }))
  check(await supabase.rpc("password_cambiada"))
  return check(await supabase.auth.refreshSession())
}

export const crearCuenta = async ({ usuario, password, nombre, tipo, equipo, area, seccion, rol, jerarquia }) =>
  check(await supabase.rpc("crear_cuenta", {
    p_usuario: usuario, p_password: password, p_nombre: nombre, p_tipo: tipo,
    p_equipo: equipo ?? null, p_area: area ?? "", p_seccion: seccion ?? "", p_rol: rol ?? "bombero", p_jerarquia: jerarquia ?? "",
  }))
export const restablecerPassword = async (usuarioOCorreo, password) =>
  check(await supabase.rpc("restablecer_password", { p_usuario: usuarioOCorreo, p_password: password }))
export const eliminarCuenta = async (uid) => check(await supabase.rpc("eliminar_cuenta", { p_uid: uid }))

// ---------------------------------------------------------------------
// Reportes (minutas)
// ---------------------------------------------------------------------

export const escucharReportes = (cb) =>
  escucharTabla("reportes", async () =>
    (await leerTodo(() => supabase.from("reportes").select("*").order("timestamp_ms", { ascending: false })))
      .map(reporteDesdeBD), cb)

export const eliminarReporteCOE = async (id) => check(await supabase.from("reportes").delete().eq("id", id))
export const actualizarReporteCOE = async (id, campos) =>
  check(await supabase.from("reportes").update(aBD(REPORTE_A_BD, campos)).eq("id", id))
export const crearReporteCOE = async (datos) => {
  const fila = check(await supabase.from("reportes").insert(aBD(REPORTE_A_BD, datos)).select("id").single())
  return fila.id
}

// ---------------------------------------------------------------------
// Cuestionarios
// ---------------------------------------------------------------------

export const escucharCuestionarios = (cb) =>
  escucharTabla("cuestionarios", async () =>
    check(await supabase.from("cuestionarios").select("*")).map(cuestionarioDesdeBD), cb)

export const crearCuestionario = async (datos) => {
  const fila = check(await supabase.from("cuestionarios").insert(aBD(CUESTIONARIO_A_BD, datos)).select("id").single())
  return fila.id
}
export const actualizarCuestionario = async (id, campos) =>
  check(await supabase.from("cuestionarios").update(aBD(CUESTIONARIO_A_BD, campos)).eq("id", id))
export const eliminarCuestionario = async (id) => check(await supabase.from("cuestionarios").delete().eq("id", id))
export const getRespuestasCuestionario = async (id) =>
  check(await supabase.from("respuestas_cuestionarios").select("*").eq("cuestionario_id", id)).map(respuestaDesdeBD)

// ---------------------------------------------------------------------
// Personal (perfiles de la app móvil)
// ---------------------------------------------------------------------

export const escucharUsuarios = (cb) =>
  escucharTabla("usuarios", async () =>
    (await leerTodo(() => supabase.from("usuarios").select("*").order("equipment_number"))).map(usuarioDesdeBD), cb)

export const actualizarUsuario = async (uid, datos) =>
  check(await supabase.from("usuarios").update(aBD(USUARIO_A_BD, datos)).eq("id", uid))

// ---------------------------------------------------------------------
// Acceso al panel COE
// ---------------------------------------------------------------------

export const escucharUsuariosCOE = (cb) =>
  escucharTabla("coe_admins", async () =>
    check(await supabase.from("coe_admins").select("*").order("creado_en", { ascending: false })).map(usuarioCOEDesdeBD), cb)

// Quitar la fila basta para quitar el acceso al panel: los permisos del servidor dependen de esta tabla.
export const eliminarUsuarioCOE = async (id) => check(await supabase.from("coe_admins").delete().eq("id", id))
