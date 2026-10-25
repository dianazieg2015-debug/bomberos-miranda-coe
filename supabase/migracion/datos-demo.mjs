// Datos de DEMOSTRACIÓN (falsos) para ver el panel y la app funcionando.
// Todo queda marcado: minutas "DEMO-…", correos "@demo.bomberos.test", ids "demo-…".
//
//   node --env-file=.env datos-demo.mjs            crea los datos (borra antes los demo anteriores)
//   node --env-file=.env datos-demo.mjs --vivo     simula una minuta nueva enviada desde la app, ahora
//   node --env-file=.env datos-demo.mjs --borrar   borra TODO lo demo y deja intactos los datos reales
import pg from "pg"
import { randomUUID } from "node:crypto"
import { createClient } from "@supabase/supabase-js"

const DOMINIO = "@demo.bomberos.test"
// La contraseña de la cuenta de prueba vive en .env (DEMO_PASSWORD), nunca en el repositorio
const BOMBERO_PRUEBA = { email: "bombero" + DOMINIO, password: process.env.DEMO_PASSWORD }
if (!BOMBERO_PRUEBA.password && process.argv[2] !== "--borrar") {
  console.error("Falta DEMO_PASSWORD en el archivo .env (contraseña de la cuenta de prueba)")
  process.exit(1)
}
const modo = process.argv[2] || "--crear"

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

// ── Catálogos ────────────────────────────────────────────────────────────
const ANTARES = {
  2: "INCENDIO EN EDIFICACION E INMUEBLE", 3: "INCENDIO EN VEHICULO", 4: "INCENDIO EN VEGETACION", 5: "INCENDIO FORESTAL",
  6: "INCENDIO EN DESECHOS SOLIDOS", 7: "INCENDIO EN EQUIPO ELECTRICO", 11: "RESCATE DE PERSONA", 12: "RESCATE DE ANIMAL",
  16: "ARBOL CAIDO", 19: "PERSONA ATRAPADA", 24: "DESLIZAMIENTO DE TIERRA", 27: "ACCIDENTES DE TRANSITO", 28: "EXTRICACION",
  29: "PERSONA CAIDA", 31: "ATENCION PREHOSPITALARIA", 32: "TRASLADO DE PACIENTE", 35: "PREVENCION Y SEGURIDAD",
  36: "GUARDIA DE PREVENCION VIAL", 37: "GUARDIA DE PREVENCION", 39: "APOYO O REFUERZO", 50: "SUMINISTRO DE AGUA",
  55: "INSPECCION DE PREVENCION", 57: "INUNDACION", 61: "DERRAME DE COMBUSTIBLE", 62: "FUGA / ESCAPE DE GASES",
  64: "INCIDENTE CON MATERIALES PELIGROSOS", 74: "INDUCCION O MEJORAMIENTO PROFESIONAL", 77: "EQUIPAR COMBUSTIBLE", 80: "COMISION ESPECIAL",
}
const POR_AREA = {
  "INCENDIO":       { peso: 25, codigos: [2, 3, 4, 4, 5, 6, 7], nota: ["Llamas visibles en fachada, se aplicó ataque con línea de 1½\". Controlado.", "Quema de vegetación en talud, riesgo a viviendas cercanas. Extinguido.", "Vehículo incendiado en el hombrillo, sin lesionados."] },
  "RESCATE":        { peso: 20, codigos: [11, 12, 16, 19, 24, 27, 28], nota: ["Colisión entre dos vehículos, un ocupante atrapado. Extricación exitosa.", "Árbol caído obstruyendo la vía, se cortó y despejó el canal.", "Persona atrapada en ascensor, rescatada sin lesiones."] },
  "APH":            { peso: 25, codigos: [27, 29, 31, 31, 32], nota: ["Paciente masculino con trauma en miembro inferior, trasladado al hospital Victorino Santaella.", "Adulta mayor con caída de su propia altura, estable.", "Motorizado con politraumatismo, se inmovilizó y trasladó."] },
  "MATPEL":         { peso: 8,  codigos: [61, 62, 64], nota: ["Fuga de gas en bombona doméstica, se cerró la válvula y ventiló.", "Derrame de gasoil en la vía, se aplicó material absorbente."] },
  "PREVENCIÓN":     { peso: 12, codigos: [35, 36, 37, 55], nota: ["Guardia de prevención en evento público, sin novedad.", "Inspección de prevención a local comercial, se dejaron recomendaciones."] },
  "LOGÍSTICA":      { peso: 6,  codigos: [39, 50, 77], nota: ["Suministro de agua potable a la comunidad.", "Abastecimiento de combustible de la unidad."] },
  "ADMINISTRACIÓN": { peso: 4,  codigos: [74, 80], nota: ["Comisión especial a la sede del Comando.", "Jornada de inducción al personal de nuevo ingreso."] },
}
// Más actividad cerca del Cuartel Central (Los Teques)
const LUGARES = [
  { peso: 6, lat: 10.3447, lon: -67.0411, dir: ["Av. Bermúdez, Los Teques", "Sector El Tambor, Los Teques", "Calle Guaicaipuro, Los Teques"] },
  { peso: 4, lat: 10.3500, lon: -66.9880, dir: ["Sector Colinas de Carrizal", "Av. principal de Carrizal"] },
  { peso: 4, lat: 10.3830, lon: -66.9590, dir: ["Urb. Los Castores, San Antonio de los Altos", "Urb. El Paso, San Antonio de los Altos"] },
  { peso: 3, lat: 10.3950, lon: -66.9850, dir: ["Autopista Panamericana, km 12", "Autopista Panamericana, km 15"] },
  { peso: 2, lat: 10.4700, lon: -66.6100, dir: ["Calle Real de Guarenas", "Urb. Trapichito, Guarenas"] },
  { peso: 2, lat: 10.4747, lon: -66.5420, dir: ["Av. Intercomunal Guarenas-Guatire", "Casco histórico de Guatire"] },
  { peso: 2, lat: 10.4840, lon: -66.8100, dir: ["Barrio José Félix Ribas, Petare", "Redoma de Petare"] },
  { peso: 1, lat: 10.4950, lon: -66.8530, dir: ["Av. Francisco de Miranda, Chacao"] },
  { peso: 1, lat: 10.4320, lon: -66.8750, dir: ["Urb. Las Mercedes, Baruta"] },
  { peso: 2, lat: 10.2430, lon: -66.8620, dir: ["Autopista Charallave-Ocumare", "Casco central de Charallave"] },
  { peso: 1, lat: 10.1650, lon: -66.8850, dir: ["Casco central de Cúa"] },
  { peso: 1, lat: 10.1190, lon: -66.7800, dir: ["Sector Marín, Ocumare del Tuy"] },
  { peso: 1, lat: 10.2330, lon: -66.6640, dir: ["Av. principal de Santa Teresa del Tuy"] },
  { peso: 1, lat: 10.4867, lon: -66.0990, dir: ["Playa Los Totumos, Higuerote"] },
]
const PERSONAL = [
  ["Carlos Mendoza", "INCENDIO", "A", "jefeArea", "Capitán", true],
  ["Yusmary Pérez", "INCENDIO", "A", "bombero", "Cabo Primero", true],
  ["José Gregorio Rivas", "INCENDIO", "B", "bombero", "Bombero", true],
  ["Andreína Salazar", "RESCATE", "A", "bombero", "Sargento Segundo", true],
  ["Luis Alfredo Tovar", "RESCATE", "B", "bombero", "Distinguido", true],
  ["María Fernanda Ochoa", "APH", "A", "bombero", "Teniente", true],
  ["Kevin Herrera", "APH", "B", "bombero", "Bombero", true],
  ["Rosa Elena Guzmán", "MATPEL", "C", "bombero", "Sargento Primero", true],
  ["Pedro Luis Castillo", "PREVENCIÓN", "A", "bombero", "Cabo Segundo", true],
  ["Daniela Martínez", "LOGÍSTICA", "D", "bombero", "Bombero", true],
  ["Héctor Blanco", "ADMINISTRACIÓN", "A", "bombero", "Mayor", true],
  ["Jesús Alberto Rondón", "RESCATE", "C", "bombero", "Bombero", false],
  ["Génesis Villarroel", "APH", "C", "bombero", "Bombero", false],
]

// ── Utilidades ───────────────────────────────────────────────────────────
let semilla = 20261025
const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647
const elegir = (lista) => lista[Math.floor(azar() * lista.length)]
const ponderado = (pares) => { let r = azar() * pares.reduce((s, [, p]) => s + p, 0); for (const [v, p] of pares) if ((r -= p) <= 0) return v; return pares[0][0] }
const caracas = (ms) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("es-VE", { timeZone: "America/Caracas", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(new Date(ms)).map(x => [x.type, x.value]))
  return { fecha: `${p.day}-${p.month}-${p.year}`, hora: `${p.hour}:${p.minute}` }
}

async function borrarDemo() {
  await db.query("delete from public.respuestas_cuestionarios where cuestionario_id like 'demo-%'")
  await db.query("delete from public.cuestionarios where id like 'demo-%'")
  const r = await db.query("delete from public.reportes where id like 'demo-%' or nro_minuta like 'DEMO-%'")
  const u = await db.query(`delete from auth.users where email like '%${DOMINIO}'`)  // borra perfiles en cascada
  return { minutas: r.rowCount, cuentas: u.rowCount }
}

async function crearCuenta(email, password, nombre) {
  const id = randomUUID()
  await db.query(`
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2,
      extensions.crypt($3, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', $4::text), now(), now(), '', '', '', '')`,
    [id, email, password, nombre])
  await db.query(`
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), $1::uuid, $3::text, 'email', jsonb_build_object('sub', $3::text, 'email', $2::text, 'email_verified', true), now(), now(), now())`,
    [id, email, id])
  return id
}

async function crear() {
  await db.query("begin")
  const borrados = await borrarDemo()

  // Personal
  const personal = []
  for (const [i, [nombre, area, seccion, rol, jerarquia, aprobado]] of PERSONAL.entries()) {
    const email = i === 1 ? BOMBERO_PRUEBA.email : nombre.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").split(" ").slice(0, 2).join(".") + DOMINIO
    const id = await crearCuenta(email, i === 1 ? BOMBERO_PRUEBA.password : randomUUID(), nombre)
    const equipo = `D-${String(101 + i)}`
    await db.query(`insert into public.usuarios (id, email, display_name, equipment_number, area, seccion, rol, jerarquia, perfil_completo, aprobado)
      values ($1,$2,$3,$4,$5,$6,$7,$8,true,$9)`, [id, email, nombre, equipo, area, seccion, rol, jerarquia, aprobado])
    personal.push({ id, nombre, area, seccion, equipo, jerarquia, rol, aprobado })
  }
  const activos = personal.filter(p => p.aprobado)

  // Minutas: 30 días, más densas hacia hoy; 6 de hoy (2 en la última hora)
  const ahora = Date.now()
  const momentos = [
    ahora - 12 * 60000, ahora - 41 * 60000, ahora - 2.2 * 3600e3, ahora - 4.5 * 3600e3, ahora - 6.8 * 3600e3, ahora - 9.1 * 3600e3,
    ...Array.from({ length: 64 }, () => ahora - (0.5 + Math.pow(azar(), 1.6) * 29.5) * 864e5),
  ].sort((a, b) => a - b)

  const minutas = momentos.map((ts, i) => {
    const area = ponderado(Object.entries(POR_AREA).map(([a, c]) => [a, c.peso]))
    const conf = POR_AREA[area]
    const lugar = ponderado(LUGARES.map(l => [l, l.peso]))
    const autor = activos.find(p => p.area === area && azar() < 0.7) || elegir(activos)
    const cod = elegir(conf.codigos)
    const sinGps = azar() < 0.15
    const { fecha, hora } = caracas(ts)
    return {
      id: `demo-${i + 1}`, uid: autor.id, fecha, hora, nro_minuta: `DEMO-${String(2300 + i + 1)}`,
      estacion: elegir(["Cuartel Central", "Estación Carrizal", "Estación San Antonio", "Estación Guarenas"]),
      antares: azar() < 0.2 ? [`${cod} - ${ANTARES[cod]}`, `31 - ${ANTARES[31]}`] : [`${cod} - ${ANTARES[cod]}`],
      direccion: elegir(lugar.dir), resena: elegir(conf.nota),
      comandante: elegir(["Tte. R. Hernández", "Cap. C. Mendoza", "Sgto. A. Salazar", "Tte. M. Ochoa"]),
      unidad: elegir(["U-12 (bomba)", "U-07 (rescate)", "A-03 (ambulancia)", "U-21 (cisterna)"]),
      autoridades: azar() < 0.4 ? elegir(["PNB", "Policía Municipal", "Protección Civil", "INTT"]) : "",
      elaborado_por: `${autor.nombre} | ${autor.jerarquia} · ${autor.area}`,
      timestamp_ms: Math.round(ts), estado: "ACTIVO", autor_nombre: autor.nombre, autor_equipo: autor.equipo,
      area: autor.area === area ? area : autor.area, seccion: autor.seccion,
      latitud: sinGps ? 0 : lugar.lat + (azar() - 0.5) * 0.024, longitud: sinGps ? 0 : lugar.lon + (azar() - 0.5) * 0.024,
      imagenes_urls: [], es_correccion: false, minuta_original_id: null,
    }
  })
  // 3 correcciones del COE sobre minutas de días anteriores
  for (const n of [20, 35, 50]) {
    const o = minutas[n]
    minutas.push({ ...o, id: `demo-c${n}`, nro_minuta: o.nro_minuta, timestamp_ms: o.timestamp_ms + 3 * 3600e3,
      direccion: o.direccion + " (dirección corregida)", es_correccion: true, minuta_original_id: o.id })
  }
  const columnas = Object.keys(minutas[0])
  for (const m of minutas) {
    await db.query(`insert into public.reportes (${columnas.join(",")}) values (${columnas.map((_, i) => "$" + (i + 1)).join(",")})`, columnas.map(c => m[c]))
  }

  // Cuestionarios con respuestas
  const cuestionarios = [
    { id: "demo-c-epp", titulo: "Estado del equipo de protección personal", descripcion: "Revisión mensual del EPP de cada funcionario.",
      preguntas: [
        { id: "p1", texto: "¿Tu traje estructural está en buen estado?", tipo: "opcion_multiple", opciones: ["Sí", "No", "Necesita reparación"] },
        { id: "p2", texto: "¿Tu ERA (equipo de respiración) pasó la prueba de este mes?", tipo: "opcion_multiple", opciones: ["Sí", "No"] },
        { id: "p3", texto: "¿Qué equipo te hace falta?", tipo: "texto_libre", opciones: [] },
      ], activo: true },
    { id: "demo-c-simulacro", titulo: "Evaluación del simulacro de incendio estructural", descripcion: "Simulacro realizado en la sede del Cuartel Central.",
      preguntas: [
        { id: "p1", texto: "¿Los tiempos de respuesta fueron adecuados?", tipo: "opcion_multiple", opciones: ["Sí", "No"] },
        { id: "p2", texto: "¿Qué mejorarías para el próximo simulacro?", tipo: "texto_libre", opciones: [] },
      ], activo: false },
  ]
  for (const [i, c] of cuestionarios.entries()) {
    await db.query("insert into public.cuestionarios (id, titulo, descripcion, preguntas, fecha_creacion, creado_por, activo) values ($1,$2,$3,$4,$5,'COE',$6)",
      [c.id, c.titulo, c.descripcion, JSON.stringify(c.preguntas), ahora - (i + 1) * 9 * 864e5, c.activo])
  }
  const textos = ["Botas nuevas talla 42", "Guantes de extricación", "Linterna de casco", "Nada, todo en orden", "Mejorar la comunicación por radio", "Más práctica con el ERA"]
  for (const p of activos.slice(0, 8)) {
    await db.query("insert into public.respuestas_cuestionarios (cuestionario_id, uid, nombre, equipo, jerarquia, area, respuestas, timestamp_ms) values ($1,$2,$3,$4,$5,$6,$7,$8)",
      ["demo-c-epp", p.id, p.nombre, p.equipo, p.jerarquia, p.area,
        JSON.stringify({ p1: elegir(["Sí", "Sí", "Necesita reparación"]), p2: elegir(["Sí", "Sí", "No"]), p3: elegir(textos) }), Math.round(ahora - azar() * 5 * 864e5)])
  }
  await db.query("commit")
  console.log(`Borrados antes: ${borrados.minutas} minutas y ${borrados.cuentas} cuentas demo.`)
  console.log(`✓ ${personal.length} funcionarios (${personal.length - activos.length} pendientes de aprobación)`)
  console.log(`✓ ${minutas.length} minutas (${minutas.filter(m => m.latitud).length} con GPS, 3 correcciones)`)
  console.log(`✓ ${cuestionarios.length} cuestionarios con respuestas`)
  console.log(`\nCuenta para probar la app: ${BOMBERO_PRUEBA.email} / ${BOMBERO_PRUEBA.password}`)
}

// Simula exactamente lo que hace la app: inicia sesión como bombero y envía una minuta.
// Pasa por las mismas reglas de seguridad y llega al panel en tiempo real.
async function minutaEnVivo() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const { error: e1 } = await sb.auth.signInWithPassword(BOMBERO_PRUEBA)
  if (e1) throw new Error("No se pudo entrar como bombero de prueba: " + e1.message)
  const ahora = Date.now()
  const { fecha, hora } = caracas(ahora)
  const { count } = await sb.from("reportes").select("id", { count: "exact", head: true })
  const minuta = {
    id: randomUUID(), fecha, hora, nro_minuta: `DEMO-${String(9000 + (count || 0))}`, estacion: "Cuartel Central",
    antares: [`2 - ${ANTARES[2]}`], direccion: "Calle Guaicaipuro, Los Teques",
    resena: "Humo denso en vivienda unifamiliar, se despliega línea de ataque. EN CURSO.",
    comandante: "Cap. C. Mendoza", unidad: "U-12 (bomba)", autoridades: "Policía Municipal",
    elaborado_por: "Yusmary Pérez | Cabo Primero · INCENDIO", timestamp_ms: ahora,
    latitud: 10.3462, longitud: -67.0437,
  }
  const { error: e2 } = await sb.from("reportes").insert(minuta)
  if (e2) throw new Error("La minuta fue rechazada: " + e2.message)
  console.log(`✓ Minuta ${minuta.nro_minuta} enviada como lo haría la app. Mira el panel: debe aparecer arriba con "NUEVO".`)
}

await db.connect()
try {
  if (modo === "--borrar") {
    await db.query("begin"); const b = await borrarDemo(); await db.query("commit")
    console.log(`✓ Borradas ${b.minutas} minutas y ${b.cuentas} cuentas demo. Los datos reales no se tocaron.`)
  } else if (modo === "--vivo") {
    await minutaEnVivo()
  } else {
    await crear()
  }
} catch (e) {
  await db.query("rollback").catch(() => {})
  console.error("✗", e.message)
  process.exitCode = 1
} finally {
  await db.end()
}
