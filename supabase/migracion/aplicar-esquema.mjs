// Ejecuta ../schema.sql en la base de datos de Supabase.
// Uso: node --env-file=.env aplicar-esquema.mjs [correo-admin-coe]
import { readFile } from "node:fs/promises"
import pg from "pg"

const { DATABASE_URL } = process.env
const [correoAdmin] = process.argv.slice(2)
if (!DATABASE_URL) {
  console.error("Falta DATABASE_URL en el archivo .env")
  process.exit(1)
}

const sql = await readFile(new URL("../schema.sql", import.meta.url), "utf8")
const cliente = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
await cliente.connect()
try {
  await cliente.query(sql)
  console.log("✓ Esquema aplicado")
  if (correoAdmin) {
    await cliente.query(
      "insert into public.coe_admins (email, nombre, creado_por) values (lower($1), 'Administrador', 'sistema') on conflict (email) do update set activo = true",
      [correoAdmin]
    )
    console.log(`✓ ${correoAdmin} es administrador del COE`)
  }
  const { rows } = await cliente.query(
    "select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename"
  )
  rows.forEach(r => console.log(`  ${r.tablename.padEnd(26)} RLS ${r.rowsecurity ? "activo" : "INACTIVO"}`))
} finally {
  await cliente.end()
}
