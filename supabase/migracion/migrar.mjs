// Migra los datos de Firebase Realtime Database a Supabase.
//
// Uso (desde esta carpeta):
//   npm install
//   node --env-file=.env migrar.mjs firebase-export.json            (copia también las fotos)
//   node --env-file=.env migrar.mjs firebase-export.json --sin-fotos
//
// firebase-export.json: Firebase Console → Realtime Database → ⋮ → "Exportar JSON".
// .env: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (la secret key; NUNCA va en la app ni en la web).
// Se puede ejecutar varias veces: todo es upsert, no duplica nada.

import { readFile } from "node:fs/promises"
import { createClient } from "@supabase/supabase-js"

const [archivo, ...flags] = process.argv.slice(2)
const SIN_FOTOS = flags.includes("--sin-fotos")
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

if (!archivo || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Uso: node --env-file=.env migrar.mjs firebase-export.json [--sin-fotos]")
  console.error("El .env debe tener SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const fb = JSON.parse(await readFile(archivo, "utf8"))
const valores = (obj) => Object.entries(obj || {})
const emailNorm = (e) => (e || "").trim().toLowerCase()
const avisos = []

async function upsertPorLotes(tabla, filas, onConflict) {
  for (let i = 0; i < filas.length; i += 500) {
    const { error } = await supabase.from(tabla).upsert(filas.slice(i, i + 500), { onConflict })
    if (error) throw new Error(`${tabla}: ${error.message}`)
  }
  console.log(`  ✓ ${tabla}: ${filas.length}`)
}

// ---------------------------------------------------------------------
// 1. Cuentas: se recrean por correo. Firebase no permite exportar contraseñas
//    en un formato que Supabase acepte, así que:
//    · quien entraba con Google sigue entrando con Google (misma cuenta)
//    · quien usaba correo+contraseña usa "¿Olvidó su contraseña?" una vez
// ---------------------------------------------------------------------
console.log("1/5 Cuentas")

const cuentasExistentes = new Map()
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) throw error
  data.users.forEach(u => cuentasExistentes.set(emailNorm(u.email), u.id))
  if (data.users.length < 1000) break
}

const nombrePorEmail = new Map()
for (const [, u] of valores(fb.usuarios)) if (u?.email) nombrePorEmail.set(emailNorm(u.email), u.displayName || "")
for (const [, u] of valores(fb.usuarios_coe)) if (u?.email && !nombrePorEmail.has(emailNorm(u.email))) nombrePorEmail.set(emailNorm(u.email), u.nombre || "")

const idPorEmail = new Map()
for (const [email, nombre] of nombrePorEmail) {
  if (cuentasExistentes.has(email)) { idPorEmail.set(email, cuentasExistentes.get(email)); continue }
  const { data, error } = await supabase.auth.admin.createUser({
    email, email_confirm: true, user_metadata: { full_name: nombre },
  })
  if (error) { avisos.push(`No se creó la cuenta ${email}: ${error.message}`); continue }
  idPorEmail.set(email, data.user.id)
}
console.log(`  ✓ cuentas: ${idPorEmail.size}`)

// uid de Firebase → id de Supabase
const idPorUidFirebase = new Map()
for (const [, u] of valores(fb.usuarios)) {
  const id = idPorEmail.get(emailNorm(u?.email))
  if (u?.uid && id) idPorUidFirebase.set(u.uid, id)
}
for (const [uid, u] of valores(fb.usuarios_coe)) {
  const id = idPorEmail.get(emailNorm(u?.email))
  if (id) idPorUidFirebase.set(u.uid || uid, id)
}

// ---------------------------------------------------------------------
// 2. Perfiles del personal (todos quedan aprobados: ya estaban en servicio)
// ---------------------------------------------------------------------
console.log("2/5 Personal")
const usuarios = []
const equiposVistos = new Set()
for (const [equipo, u] of valores(fb.usuarios)) {
  const id = idPorUidFirebase.get(u?.uid)
  const numero = (u?.equipmentNumber || equipo).trim().toUpperCase()
  if (!id) { avisos.push(`Perfil ${equipo} sin cuenta (sin email): omitido`); continue }
  if (equiposVistos.has(numero)) { avisos.push(`Equipo ${numero} repetido: se conservó el primero`); continue }
  equiposVistos.add(numero)
  usuarios.push({
    id,
    email: emailNorm(u.email),
    display_name: u.displayName || "",
    equipment_number: numero,
    area: u.area || "",
    seccion: u.seccion || "",
    rol: ["bombero", "jefeArea", "admin"].includes(u.rol) ? u.rol : "bombero",
    jerarquia: u.jerarquia || "",
    perfil_completo: u.perfilCompleto !== false,
    aprobado: true,
  })
}
// Una cuenta con dos perfiles (bug de Firebase): se conserva uno
const unicos = [...new Map(usuarios.map(u => [u.id, u])).values()]
if (unicos.length < usuarios.length) avisos.push(`${usuarios.length - unicos.length} perfil(es) duplicados por cuenta: se conservó uno`)
await upsertPorLotes("usuarios", unicos, "id")
const idsConPerfil = new Set(unicos.map(u => u.id))

// ---------------------------------------------------------------------
// 3. Minutas (+ fotos de Firebase Storage → Supabase Storage)
// ---------------------------------------------------------------------
console.log(`3/5 Minutas${SIN_FOTOS ? " (sin fotos)" : " y fotos"}`)

async function copiarFoto(url, ruta) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const bytes = new Uint8Array(await resp.arrayBuffer())
  const { error } = await supabase.storage.from("reportes")
    .upload(ruta, bytes, { contentType: resp.headers.get("content-type") || "image/jpeg", upsert: true })
  if (error) throw error
  return supabase.storage.from("reportes").getPublicUrl(ruta).data.publicUrl
}

const reportes = []
let fotos = 0
for (const [id, r] of valores(fb.reportes)) {
  if (!r) continue
  const uid = idPorUidFirebase.get(r.uid)
  let urls = r.imagenesUrls || []
  if (!SIN_FOTOS && urls.length) {
    const copiadas = []
    for (const [i, url] of urls.entries()) {
      if (url.includes(SUPABASE_URL)) { copiadas.push(url); continue }
      try { copiadas.push(await copiarFoto(url, `${id}/imagen_${i}.jpg`)); fotos++ }
      catch (e) { avisos.push(`Foto ${i} de la minuta ${id}: ${e.message} (se deja la URL original)`); copiadas.push(url) }
    }
    urls = copiadas
  }
  reportes.push({
    id,
    uid: uid && idsConPerfil.has(uid) ? uid : null,
    fecha: r.fecha || "",
    hora: r.hora || "",
    nro_minuta: r.nroMinuta || "",
    estacion: r.estacion || "",
    antares: r.antares || [],
    direccion: r.direccion || "",
    resena: r.resena || "",
    comandante: r.comandante || "",
    unidad: r.unidad || "",
    autoridades: r.autoridades || "",
    elaborado_por: r.elaboradoPor || "",
    timestamp_ms: r.timestamp || 0,
    estado: r.estado || "ACTIVO",
    autor_nombre: r.autorNombre || "",
    autor_equipo: r.autorEquipo || "",
    area: r.area || "",
    seccion: r.seccion || "",
    latitud: r.latitud || 0,
    longitud: r.longitud || 0,
    imagenes_urls: urls,
    es_correccion: !!r.esCorreccion,
    minuta_original_id: r.minutaOriginalId || null,
  })
}
await upsertPorLotes("reportes", reportes, "id")
if (!SIN_FOTOS) console.log(`  ✓ fotos copiadas: ${fotos}`)

// ---------------------------------------------------------------------
// 4. Cuestionarios y respuestas
// ---------------------------------------------------------------------
console.log("4/5 Cuestionarios")
await upsertPorLotes("cuestionarios", valores(fb.cuestionarios).filter(([, c]) => c).map(([id, c]) => ({
  id,
  titulo: c.titulo || "",
  descripcion: c.descripcion || "",
  preguntas: c.preguntas || [],
  fecha_creacion: c.fechaCreacion || 0,
  creado_por: c.creadoPor || "",
  activo: c.activo !== false,
})), "id")

const respuestas = []
for (const [cuestionarioId, porUsuario] of valores(fb.respuestasCuestionarios)) {
  for (const [uidFb, r] of valores(porUsuario)) {
    const uid = idPorUidFirebase.get(uidFb)
    if (!uid) { avisos.push(`Respuesta de ${r?.nombre || uidFb} sin cuenta: omitida`); continue }
    respuestas.push({
      cuestionario_id: cuestionarioId,
      uid,
      nombre: r.nombre || "",
      equipo: r.equipo || "",
      jerarquia: r.jerarquia || "",
      area: r.area || "",
      respuestas: r.respuestas || {},
      timestamp_ms: r.timestamp || 0,
    })
  }
}
await upsertPorLotes("respuestas_cuestionarios", respuestas, "cuestionario_id,uid")

// ---------------------------------------------------------------------
// 5. Acceso al panel COE
// ---------------------------------------------------------------------
console.log("5/5 Acceso COE")
await upsertPorLotes("coe_admins", valores(fb.usuarios_coe).filter(([, u]) => u?.email).map(([, u]) => ({
  email: emailNorm(u.email),
  nombre: u.nombre || "",
  creado_por: u.creadoPor || "",
  creado_en: u.creadoEn || new Date().toISOString(),
  activo: u.activo !== false,
})), "email")

console.log("\nMigración terminada.")
if (avisos.length) {
  console.log(`\n${avisos.length} aviso(s) para revisar:`)
  avisos.forEach(a => console.log("  - " + a))
}
