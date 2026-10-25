# COE · Bomberos Miranda Cuartel Central

Sistema de gestión operativa del Cuerpo de Bomberos del Estado Miranda: los funcionarios envían minutas desde el teléfono y el Centro de Operaciones de Emergencia (COE) las sigue en tiempo real desde el panel web.

| Carpeta | Qué es |
|---|---|
| `AndroidStudioProjects/Bomberoscuartelcentral/` | App Android (Kotlin + Jetpack Compose): minutas con GPS, fotos con marca de agua, envío por WhatsApp, clasificación ANTARES, historial. Funciona sin señal (cola local). |
| `AndroidStudioProjects/BomberosCOEWeb/` | Panel web COE (React + Vite + Tailwind): pantalla de despacho en vivo, mapa táctico WebGL con radar de zona, minutas, personal, cuestionarios y gestión de cuentas. |
| `supabase/` | Base de datos: `schema.sql` (tablas, seguridad por roles RLS, funciones de cuentas) y scripts de migración y de datos de prueba. |

Las dos aplicaciones usan la misma base de datos en **Supabase**, por eso se mantienen sincronizadas al instante.

## Puesta en marcha

1. **Base de datos:** ver [`supabase/README.md`](supabase/README.md).
2. **Panel web:** en `AndroidStudioProjects/BomberosCOEWeb/` copia `.env.example` como `.env` con la URL y la publishable key de Supabase, luego `npm install` y `npm run dev`.
3. **App Android:** en `AndroidStudioProjects/Bomberoscuartelcentral/local.properties` agrega `supabase.url` y `supabase.anonKey`, y compila con Android Studio o `gradlew assembleDebug`.

## Cuentas

No hay registro libre. Un administrador del COE crea cada cuenta en **Acceso COE** (usuario + contraseña temporal generada) y se la entrega a la persona; al primer ingreso la app y el panel obligan a crear la contraseña propia.

## Seguridad

Ningún secreto vive en este repositorio: `.env`, `local.properties` y las claves de firma están excluidos por `.gitignore`. La publishable key de Supabase es pública por diseño; lo que protege los datos son las políticas RLS de `supabase/schema.sql`.
