# Migración a Supabase — pasos

Orden recomendado. Tiempo total: ~30 minutos.

## 1. Crear la base de datos
1. Supabase → **SQL Editor** → New query → pega todo `schema.sql` → **Run**.
2. Al final del archivo hay una línea comentada para el **primer administrador del COE**. Pon tu correo, quítale los `--` y ejecútala.

## 2. Cerrar el registro libre
Las cuentas las crea el COE desde el panel (pestaña **Acceso COE**), con un usuario y una contraseña
temporal que se cambia al primer ingreso. No hay inicio con Google ni registro desde la app.

En **Authentication → Sign In / Providers**: desactiva **Allow new users to sign up**.
(Las cuentas creadas por el COE siguen funcionando: no pasan por el registro.)

## 3. Pasar los datos de Firebase
1. Firebase Console → Realtime Database → **⋮ → Exportar JSON** → guárdalo aquí como `migracion/firebase-export.json`.
2. En `migracion/`, copia `.env.example` como `.env` y pon la URL y la **secret key**.
3. Ejecuta:
   ```
   cd migracion
   npm install
   npm run migrar
   ```
   Lee los avisos del final. Se puede repetir sin duplicar nada.

Firebase no deja exportar contraseñas: después de migrar, el COE asigna a cada persona una contraseña
temporal desde **Personal → editar → Nueva contraseña**, y la app le pedirá crear la suya al entrar.

## 4. Panel web
En `AndroidStudioProjects/BomberosCOEWeb/`: copia `.env.example` como `.env`, pega URL y **anon key**, luego `npm run build` y despliega en Netlify.
En Netlify (Site settings → Environment variables) añade las mismas dos variables si el build se hace allá.

## 5. App Android
En `AndroidStudioProjects/Bomberoscuartelcentral/local.properties` rellena `supabase.url` y `supabase.anonKey`, y compila.

## Qué cambia para el personal
- El COE crea cada cuenta (usuario + contraseña temporal) y se la entrega a la persona; al primer ingreso se cambia.
- Si alguien olvida su contraseña, el COE le genera una temporal nueva (no hay correos de recuperación).
- Sin señal, la minuta se guarda en el teléfono, se envía por WhatsApp igual, y sube sola al recuperar conexión.
- El panel web ya no muestra nada sin iniciar sesión.

## Cuando todo funcione
Apaga Firebase: Realtime Database → Reglas → `".read": false, ".write": false`.
