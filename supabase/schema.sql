-- =====================================================================
-- Bomberos Miranda · Cuartel Central — Esquema Supabase
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Es idempotente: se puede volver a ejecutar sin perder datos.
--
-- La seguridad vive AQUÍ (Row Level Security), no en la app ni en la web:
--   · bombero   → ve y edita solo sus minutas
--   · jefeArea  → ve las minutas de su área
--   · admin     → todo (rol admin en la app, o acceso COE en el panel web)
--   · cuentas nuevas quedan "pendientes" hasta que un admin las aprueba
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table if not exists public.usuarios (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text not null default '',
  display_name     text not null default '',
  equipment_number text not null unique,
  area             text not null default '',
  seccion          text not null default '',
  rol              text not null default 'bombero' check (rol in ('bombero', 'jefeArea', 'admin')),
  jerarquia        text not null default '',
  perfil_completo  boolean not null default true,
  aprobado         boolean not null default false,
  created_at       timestamptz not null default now()
);

create table if not exists public.reportes (
  id                 text primary key default gen_random_uuid()::text,
  uid                uuid references public.usuarios(id) on delete set null,
  fecha              text not null default '',
  hora               text not null default '',
  nro_minuta         text not null default '',
  estacion           text not null default '',
  antares            text[] not null default '{}',
  direccion          text not null default '',
  resena             text not null default '',
  comandante         text not null default '',
  unidad             text not null default '',
  autoridades        text not null default '',
  elaborado_por      text not null default '',
  timestamp_ms       bigint not null default (extract(epoch from now()) * 1000)::bigint,
  estado             text not null default 'ACTIVO',
  autor_nombre       text not null default '',
  autor_equipo       text not null default '',
  area               text not null default '',
  seccion            text not null default '',
  latitud            double precision not null default 0,
  longitud           double precision not null default 0,
  imagenes_urls      text[] not null default '{}',
  es_correccion      boolean not null default false,
  minuta_original_id text
);
create index if not exists reportes_uid_idx  on public.reportes (uid);
create index if not exists reportes_area_idx on public.reportes (area);
create index if not exists reportes_ts_idx   on public.reportes (timestamp_ms desc);

create table if not exists public.cuestionarios (
  id             text primary key default gen_random_uuid()::text,
  titulo         text not null default '',
  descripcion    text not null default '',
  preguntas      jsonb not null default '[]',
  fecha_creacion bigint not null default (extract(epoch from now()) * 1000)::bigint,
  creado_por     text not null default '',
  activo         boolean not null default true
);

-- Sin FK a cuestionarios a propósito: al borrar un cuestionario se conservan sus respuestas.
create table if not exists public.respuestas_cuestionarios (
  cuestionario_id text not null,
  uid             uuid not null references auth.users(id) on delete cascade,
  nombre          text not null default '',
  equipo          text not null default '',
  jerarquia       text not null default '',
  area            text not null default '',
  respuestas      jsonb not null default '{}',
  timestamp_ms    bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (cuestionario_id, uid)
);

-- Quién puede entrar como administrador al panel web COE (por correo).
create table if not exists public.coe_admins (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  nombre     text not null default '',
  creado_por text not null default '',
  creado_en  timestamptz not null default now(),
  activo     boolean not null default true
);

-- ---------------------------------------------------------------------
-- Funciones de permisos (security definer: leen tablas sin pasar por RLS)
-- ---------------------------------------------------------------------

create or replace function public.es_coe() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.coe_admins c
    join auth.users u on lower(u.email) = lower(c.email)
    where u.id = auth.uid() and c.activo and u.email_confirmed_at is not null
  );
$$;

create or replace function public.es_aprobado() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.usuarios where id = auth.uid() and aprobado);
$$;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_coe()
      or exists (select 1 from public.usuarios where id = auth.uid() and aprobado and rol = 'admin');
$$;

create or replace function public.es_jefe_de(p_area text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid() and aprobado and rol = 'jefeArea' and area = p_area and area <> ''
  );
$$;

-- ---------------------------------------------------------------------
-- Triggers: el servidor fija los campos sensibles (no se confía en el cliente)
-- ---------------------------------------------------------------------

-- Cargas administrativas (migración, datos demo, SQL Editor) copian los datos tal cual.
-- La app y la web llegan SIEMPRE por la API (sesión "authenticator"); solo la clave secreta
-- (service_role) o una conexión directa a la base de datos quedan fuera de las protecciones.
-- Es security invoker a propósito: dentro de un trigger security definer, current_user sería el dueño.
create or replace function public.es_carga_administrativa() returns boolean
language sql stable as $$
  select session_user <> 'authenticator'
      or coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;
revoke execute on function public.es_carga_administrativa() from public, anon, authenticated;

create or replace function public.usuarios_proteger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.es_carga_administrativa() then
    return new;
  end if;
  new.equipment_number := upper(trim(new.equipment_number));
  if new.equipment_number = '' then
    raise exception 'Número de equipo requerido';
  end if;
  if not public.es_admin() then
    if tg_op = 'INSERT' then
      new.rol := 'bombero';
      new.aprobado := false;
      new.email := coalesce((select email from auth.users where id = auth.uid()), '');
    else
      new.rol := old.rol;
      new.aprobado := old.aprobado;
      new.email := old.email;
      new.id := old.id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists usuarios_proteger on public.usuarios;
create trigger usuarios_proteger before insert or update on public.usuarios
  for each row execute function public.usuarios_proteger();

create or replace function public.reportes_proteger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  u public.usuarios;
begin
  if public.es_carga_administrativa() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    -- Respeta la hora del teléfono (minutas guardadas sin señal) pero nunca en el futuro
    new.timestamp_ms := least(
      coalesce(nullif(new.timestamp_ms, 0), (extract(epoch from now()) * 1000)::bigint),
      (extract(epoch from now()) * 1000)::bigint
    );
    -- El COE puede crear correcciones a nombre del autor original; el resto firma con su propia cuenta.
    if not public.es_admin() or new.uid is null then
      select * into u from public.usuarios where id = auth.uid();
      new.uid          := u.id;  -- null si quien escribe es del COE sin perfil de bombero
      new.autor_nombre := coalesce(nullif(u.display_name, ''), new.elaborado_por);
      new.autor_equipo := coalesce(u.equipment_number, '');
      new.area         := coalesce(u.area, '');
      new.seccion      := coalesce(u.seccion, '');
    end if;
  elsif not public.es_admin() then
    new.id           := old.id;
    new.uid          := old.uid;
    new.timestamp_ms := old.timestamp_ms;
    new.autor_nombre := old.autor_nombre;
    new.autor_equipo := old.autor_equipo;
    new.area         := old.area;
    new.seccion      := old.seccion;
  end if;
  return new;
end $$;

drop trigger if exists reportes_proteger on public.reportes;
create trigger reportes_proteger before insert or update on public.reportes
  for each row execute function public.reportes_proteger();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.usuarios                 enable row level security;
alter table public.reportes                 enable row level security;
alter table public.cuestionarios            enable row level security;
alter table public.respuestas_cuestionarios enable row level security;
alter table public.coe_admins               enable row level security;

-- usuarios
drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios for select to authenticated
  using (id = auth.uid() or public.es_admin() or public.es_jefe_de(area));
drop policy if exists usuarios_insert on public.usuarios;
create policy usuarios_insert on public.usuarios for insert to authenticated
  with check (id = auth.uid() or public.es_admin());
drop policy if exists usuarios_update on public.usuarios;
create policy usuarios_update on public.usuarios for update to authenticated
  using (id = auth.uid() or public.es_admin());
drop policy if exists usuarios_delete on public.usuarios;
create policy usuarios_delete on public.usuarios for delete to authenticated
  using (public.es_admin());

-- reportes
drop policy if exists reportes_select on public.reportes;
create policy reportes_select on public.reportes for select to authenticated
  using (public.es_admin() or (public.es_aprobado() and (uid = auth.uid() or public.es_jefe_de(area))));
drop policy if exists reportes_insert on public.reportes;
create policy reportes_insert on public.reportes for insert to authenticated
  with check (public.es_aprobado() or public.es_admin());
drop policy if exists reportes_update on public.reportes;
create policy reportes_update on public.reportes for update to authenticated
  using (public.es_admin() or (public.es_aprobado() and uid = auth.uid()));
drop policy if exists reportes_delete on public.reportes;
create policy reportes_delete on public.reportes for delete to authenticated
  using (public.es_admin() or (public.es_aprobado() and uid = auth.uid()));

-- cuestionarios
drop policy if exists cuestionarios_select on public.cuestionarios;
create policy cuestionarios_select on public.cuestionarios for select to authenticated
  using (public.es_aprobado() or public.es_admin());
drop policy if exists cuestionarios_write on public.cuestionarios;
create policy cuestionarios_write on public.cuestionarios for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- respuestas_cuestionarios
drop policy if exists respuestas_select on public.respuestas_cuestionarios;
create policy respuestas_select on public.respuestas_cuestionarios for select to authenticated
  using (uid = auth.uid() or public.es_admin());
drop policy if exists respuestas_insert on public.respuestas_cuestionarios;
create policy respuestas_insert on public.respuestas_cuestionarios for insert to authenticated
  with check (uid = auth.uid() and public.es_aprobado());
drop policy if exists respuestas_update on public.respuestas_cuestionarios;
create policy respuestas_update on public.respuestas_cuestionarios for update to authenticated
  using (uid = auth.uid() and public.es_aprobado());
drop policy if exists respuestas_delete on public.respuestas_cuestionarios;
create policy respuestas_delete on public.respuestas_cuestionarios for delete to authenticated
  using (public.es_admin());

-- coe_admins: solo el COE gestiona el COE
drop policy if exists coe_admins_all on public.coe_admins;
create policy coe_admins_all on public.coe_admins for all to authenticated
  using (public.es_coe()) with check (public.es_coe());

-- Permisos explícitos (no depender de "Automatically expose new tables").
-- Solo usuarios con sesión; las políticas RLS de arriba deciden QUÉ filas ve cada uno.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.usuarios, public.reportes, public.cuestionarios,
  public.respuestas_cuestionarios, public.coe_admins
to authenticated;
revoke all on
  public.usuarios, public.reportes, public.cuestionarios,
  public.respuestas_cuestionarios, public.coe_admins
from anon;

-- Para que el panel sepa si quien inició sesión es COE (sin poder leer la tabla).
grant execute on function public.es_coe(), public.es_admin(), public.es_aprobado() to authenticated;

-- ---------------------------------------------------------------------
-- Tiempo real (la app y la web escuchan cambios en estas tablas)
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['usuarios', 'reportes', 'cuestionarios', 'respuestas_cuestionarios', 'coe_admins'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Storage: fotos de las minutas
-- Bucket público de lectura (URLs con ID aleatorio, no listables);
-- solo personal aprobado sube fotos y solo admins las borran.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('reportes', 'reportes', true)
on conflict (id) do nothing;

drop policy if exists reportes_fotos_insert on storage.objects;
create policy reportes_fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'reportes' and (public.es_aprobado() or public.es_admin()));
drop policy if exists reportes_fotos_delete on storage.objects;
create policy reportes_fotos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'reportes' and public.es_admin());

-- ---------------------------------------------------------------------
-- Cuentas creadas por el COE (no hay registro libre)
-- El COE asigna un USUARIO (yperez) y el sistema genera una contraseña temporal;
-- al primer ingreso la app y el panel obligan a cambiarla.
-- Por dentro, un usuario es una cuenta con correo interno <usuario>@cuentas.coe-miranda.test
-- (dominio reservado .test: nunca se envía nada ahí).
-- ---------------------------------------------------------------------

create or replace function public.correo_de_usuario(p text) returns text
language sql immutable as $$
  select case when position('@' in p) > 0 then lower(trim(p))
              else lower(trim(p)) || '@cuentas.coe-miranda.test' end;
$$;

create or replace function public.crear_cuenta(
  p_usuario text, p_password text, p_nombre text, p_tipo text,
  p_equipo text default null, p_area text default '', p_seccion text default '',
  p_rol text default 'bombero', p_jerarquia text default ''
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := public.correo_de_usuario(p_usuario);
begin
  if not public.es_coe() then
    raise exception 'Solo un administrador del COE puede crear cuentas' using errcode = '42501';
  end if;
  if position('@' in p_usuario) = 0 and p_usuario !~ '^[a-z0-9][a-z0-9._-]{2,39}$' then
    raise exception 'Usuario inválido: de 3 a 40 letras minúsculas, números, punto o guion, sin espacios';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'La contraseña temporal debe tener al menos 8 caracteres';
  end if;
  if p_tipo not in ('bombero', 'coe') then
    raise exception 'Tipo de cuenta inválido';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'El usuario % ya existe', p_usuario using errcode = '23505';
  end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'debe_cambiar_password', true),
    jsonb_build_object('full_name', p_nombre), now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text, 'email',
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true), now(), now(), now());

  if p_tipo = 'bombero' then
    insert into public.usuarios (id, email, display_name, equipment_number, area, seccion, rol, jerarquia, perfil_completo, aprobado)
    values (v_id, v_email, p_nombre, coalesce(p_equipo, ''), coalesce(p_area, ''), coalesce(p_seccion, ''),
            coalesce(nullif(p_rol, ''), 'bombero'), coalesce(p_jerarquia, ''), true, true);
  else
    insert into public.coe_admins (email, nombre, creado_por)
    values (v_email, p_nombre, coalesce((select email from auth.users where id = auth.uid()), ''))
    on conflict (email) do update set activo = true, nombre = excluded.nombre;
  end if;
  return v_id;
end $$;

-- Nueva contraseña temporal (olvido, o cuenta comprometida). Cierra sus sesiones abiertas.
create or replace function public.restablecer_password(p_usuario text, p_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_email text := public.correo_de_usuario(p_usuario);
  v_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede restablecer contraseñas' using errcode = '42501';
  end if;
  -- La cuenta de un administrador del COE solo la restablece otro administrador del COE
  if exists (select 1 from public.coe_admins where lower(email) = v_email) and not public.es_coe() then
    raise exception 'Solo el COE puede restablecer la contraseña de otro administrador del COE' using errcode = '42501';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'La contraseña temporal debe tener al menos 8 caracteres';
  end if;
  update auth.users
     set encrypted_password = crypt(p_password, gen_salt('bf')),
         raw_app_meta_data = coalesce(raw_app_meta_data, '{}') || '{"debe_cambiar_password": true}',
         updated_at = now()
   where lower(email) = v_email
  returning id into v_id;
  if v_id is null then
    raise exception 'No existe el usuario %', p_usuario;
  end if;
  delete from auth.sessions where user_id = v_id;
end $$;

-- La persona ya puso su contraseña habitual: deja de pedírsela
create or replace function public.password_cambiada() returns void
language sql security definer set search_path = public as $$
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}') - 'debe_cambiar_password', updated_at = now()
   where id = auth.uid();
$$;

-- Dar de baja: borra la cuenta (ya no puede entrar). Sus minutas se conservan con su nombre.
create or replace function public.eliminar_cuenta(p_uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede dar de baja cuentas' using errcode = '42501';
  end if;
  if exists (select 1 from public.coe_admins c join auth.users u on lower(u.email) = lower(c.email) where u.id = p_uid)
     and not public.es_coe() then
    raise exception 'Solo el COE puede dar de baja a un administrador del COE' using errcode = '42501';
  end if;
  if p_uid = auth.uid() then
    raise exception 'No puede darse de baja a sí mismo';
  end if;
  delete from public.coe_admins where lower(email) = (select lower(email) from auth.users where id = p_uid);
  delete from auth.users where id = p_uid;
end $$;

revoke execute on function public.crear_cuenta(text, text, text, text, text, text, text, text, text),
  public.restablecer_password(text, text), public.password_cambiada(), public.eliminar_cuenta(uuid)
  from public, anon;
grant execute on function public.crear_cuenta(text, text, text, text, text, text, text, text, text),
  public.restablecer_password(text, text), public.password_cambiada(), public.eliminar_cuenta(uuid)
  to authenticated;

-- ---------------------------------------------------------------------
-- PRIMER ADMINISTRADOR DEL COE
-- Cambia el correo, quita los "--" y ejecuta esta línea una sola vez.
-- Luego crea esa cuenta en el panel web (o con "Add user" en Authentication).
-- ---------------------------------------------------------------------
-- insert into public.coe_admins (email, nombre, creado_por) values ('tu-correo@ejemplo.com', 'Administrador', 'sistema');
