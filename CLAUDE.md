# Health Manager — Contexto para agentes

Gestor de turnos para clínicas, consultorios y profesionales médicos / de otras
disciplinas. Cada profesional gestiona sus **ventanas de trabajo** (franjas horarias) y
sobre ellas se ofrecen turnos. **Sin pagos**: el sistema reserva y coordina, no factura.
Mercado Argentina.

> Este archivo es el contexto compartido del proyecto. Mantenelo actualizado cuando
> cambien decisiones, comandos o el estado del deploy. Reciclado de **Suites Manager**
> (gestor hotelero): se reusó el stack, la arquitectura serverless y —sobre todo— la
> validación anti-solapamiento a nivel base de datos.

## Stack y arquitectura

Monorepo **pnpm workspaces** (NO es Laravel/TALL — es TypeScript de punta a punta):

```
apps/
  web/   → Vite + React 19 + TS + Tailwind v4 + TanStack Query + Zustand
  api/   → Hono + Zod (Node local / funciones serverless en Vercel)
packages/
  db/      → Drizzle ORM + Postgres (driver serverless de Neon) + migraciones SQL
  shared/  → esquemas Zod y tipos compartidos front ↔ back
```

- Workspaces: `@turnos/web`, `@turnos/api` (o su nombre en `apps/`), `@turnos/db`,
  `@turnos/shared`.
- **DB**: PostgreSQL en **Neon** (gestionado vía Vercel). Postgres es obligatorio (no
  SQLite/Turso): SQLite no soporta el constraint anti-solapamiento (ver abajo).
- **Estado en el front**: TanStack Query = estado de servidor; Zustand = estado de UI.
  No mezclar.
- **Requisito rígido: todo serverless.** Nada de containers persistentes (ver
  Recordatorios, Fase 3).

## ⭐ Decisión de diseño clave: anti-overbooking en la DB

Igual que en Suites, el solapamiento se previene **a nivel base de datos**, no en código.
El cambio de dominio: se bloquea por **profesional** (no habitación) y en granularidad
**horaria** (`tstzrange`, no `daterange`).

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE turnos
  ADD CONSTRAINT turnos_sin_solapamiento
  EXCLUDE USING gist (
    profesional_id WITH =,
    tstzrange(inicio, fin, '[)') WITH &&
  ) WHERE (estado <> 'cancelado' AND NOT es_sobreturno);
```

- Requiere `btree_gist` (Neon lo soporta).
- El rango `[)` incluye el inicio y excluye el fin → un turno que termina 10:00 y otro
  que arranca 10:00 **no** chocan.
- La API traduce la violación (código PG `23P01`) a un **HTTP 409 `overbooking`**.
- **Sobreturnos**: `es_sobreturno = true` sale del constraint a propósito → puede pisar
  a otros. Solo lo pueden emitir `profesional`/`administrativo`; el flujo online del
  paciente **nunca** lo setea → el paciente no puede generar solapamientos.
- **Bloqueos de agenda** (ausencia, feriado, reunión) son turnos sin paciente, estado
  `bloqueo`. Participan del constraint (estado <> cancelado, no sobreturno) → nada se
  agenda encima.

### ⚠️ El constraint previene *solapamiento*, no *contención*

El EXCLUDE garantiza que dos turnos no se pisen, pero **no** valida que un turno caiga
*dentro* de una ventana de trabajo. Eso es regla de negocio a nivel aplicación (chequear
contra la ventana antes de insertar). El constraint es el backstop contra condiciones de
carrera, no la única validación.

## Concepto central: ventanas de trabajo

Lo único que el proyecto hotelero no tenía. Cada profesional define su disponibilidad
como franjas recurrentes + excepciones. La disponibilidad ofrecida se **calcula**; no se
materializan slots.

- **`ventanas_recurrentes`**: `profesional_id`, `dia_semana`, `hora_inicio`, `hora_fin`,
  `duracion_turno` (nullable → fallback), `modo_confirmacion` (nullable → fallback),
  `vigencia_desde`, `vigencia_hasta` (nullable), `activa`.
- **`ventanas_excepciones`**: `profesional_id`, `fecha`, `tipo` (`agrega` | `bloquea`),
  `hora_inicio`/`hora_fin` (nullable = día completo), `motivo`.

### Cálculo de disponibilidad (reemplaza `/disponibilidad`)

Dado profesional + fecha (o rango):
1. Expandir ventanas recurrentes de esa fecha (match `dia_semana` + dentro de vigencia).
2. Aplicar excepciones: sumar las `agrega`, restar las `bloquea`.
3. **Restar** los turnos no cancelados (rangos ocupados).
4. Trocear los rangos libres en slots de `duracion_turno`.
5. Devolver los slots libres.

Es aritmética de rangos pura (capa app). La **duración/segmentación no toca la BD**: el
turno guarda `inicio`/`fin` concretos y el constraint opera sobre el rango real, agnóstico
a cómo se segmentó. Cambiar la duración de una ventana no reescribe turnos existentes.

### Duración y modo de confirmación (resolución en cascada)

- **Duración**: presets 20/30/40/60 min, editables. Orden de fallback:
  `ventana.duracion_turno` → `profesional.duracion_turno_default` → `config.duracion_default`.
- **Modo de confirmación** (`automatico` | `aprobacion`): mismo orden de fallback.
  Turno creado online hereda el modo de la ventana: `automatico → confirmado`,
  `aprobacion → solicitado`. Staff siempre crea `confirmado`.

## Modelo de datos (tablas núcleo)

| Tabla | Rol |
|---|---|
| `profesionales` | recurso reservable **+** usuario opcional. `auth_user_id` **nullable** (recepción puede agendar a quien no loguea). Campos: `especialidad`, `duracion_turno_default`, `modo_confirmacion_default`, `ubicacion` (informativa), `color` (agenda), `activo`. |
| `pacientes` | (era `huespedes`). `documento`, `tipo_documento`, `fecha_nacimiento`, `email`, `telefono`, `obra_social_id` (nullable), `nro_afiliado`, `notas`, `auth_user_id` (nullable si se auto-registró). |
| `obras_sociales` | catálogo. |
| `profesional_obras_sociales` | M2M: qué OS acepta cada profesional. |
| `ventanas_recurrentes` | disponibilidad recurrente (ver arriba). |
| `ventanas_excepciones` | altas/bloqueos puntuales por fecha. |
| `turnos` | (era `reservas`). Núcleo + EXCLUDE. Columnas clave: `profesional_id`, `paciente_id` (nullable), `inicio`/`fin` (timestamptz), `estado`, `es_sobreturno`, `es_particular`, `origen` (`online`|`administrativo`), `notas`, `confirmado_at`, `arribo_at`, `atendido_at`. `CHECK (fin > inicio)`. |
| `config_clinica` | (era config alojamiento) + defaults globales (`duracion_default`, `modo_confirmacion_default`). |
| `audit_log` | trazabilidad con hash encadenado (reciclado, clave en salud). |
| `auth_user/session/account/verification` | Better Auth. |
| `landing_*` | hero, fotos, links, servicios, contactos (reciclado). |

### Estados del turno

`solicitado → confirmado → en_sala → atendido`, más `ausente` (no-show), `cancelado`
y `bloqueo` (agenda sin paciente). El EXCLUDE excluye solo `cancelado` y `es_sobreturno`.

### Obra social

Al agendar, el paciente indica su OS. Si **no** está entre las compatibles del
profesional → `es_particular = true` + aviso no bloqueante ("el turno será particular,
los costos corren por tu cuenta") con conformidad. Sin procesamiento de pago.

## Roles y permisos

Campo `role` en `auth_user` (default `paciente`):

- **`admin`** — todo (config, ABM profesionales, obras sociales, reportes, landing).
- **`profesional`** — gestiona **sus** ventanas y su agenda; puede emitir sobreturnos.
- **`administrativo`** — ve disponibilidad, da de alta turnos y pacientes, baja la lista
  de pacientes del día, emite sobreturnos, confirma solicitados. No toca config global.
- **`paciente`** — portal: reserva online, ve/cancela sus turnos. Nunca sobreturnos.

Middleware análogo al de Suites: `requireRole(...roles)`; `staff = admin|administrativo`;
`profesionalOrStaff`; `adminOnly`. Un `profesional` es **recurso y usuario** a la vez.

## Comandos

```bash
pnpm install
pnpm db:migrate      # aplica packages/db/migrations/*.sql (runner propio)
pnpm db:seed         # datos de ejemplo (profesionales, ventanas, obras sociales)
pnpm dev             # web + api en paralelo
pnpm dev:api / dev:web
pnpm dev:mock        # web con datos en memoria, SIN DB (VITE_MOCK=1)
pnpm typecheck       # tsc --noEmit en los 4 workspaces
pnpm test            # vitest (unit) — lógica de disponibilidad
```

## Base de datos (reciclado de Suites — aplica igual)

- **Migraciones**: runner propio en `packages/db/src/migrate.ts` (NO drizzle-kit para el
  DDL, porque el `EXCLUDE` va en SQL crudo). Aplica los `.sql` en orden y registra en
  `_migrations`. Usa `pg` + `DATABASE_URL_UNPOOLED`.
- **Runtime**: `packages/db/src/index.ts` usa el driver **HTTP de Neon** (`neon()` +
  `drizzle-orm/neon-http`). Fetch nativo, sin WebSocket → no crashea en Vercel. **No** usar
  el driver WebSocket (`neon-serverless` + `ws`).
  - Fijar `@neondatabase/serverless` en **0.10.x** (la v1.x rompe con drizzle-orm 0.38).
  - El driver HTTP **no tiene transacciones interactivas**. El alta de turno con paciente
    nuevo (huésped + reserva en Suites) se hace con **una sola sentencia CTE**
    (`WITH nuevo_paciente AS (INSERT ... RETURNING id) INSERT INTO turnos SELECT ...`),
    atómica, que dispara igual el `EXCLUDE` → 409 si hay solapamiento.
  - `index.ts` exporta `sql` (tagged-template de neon) para esa sentencia.
- **Schema Drizzle** (`packages/db/src/schema.ts`) es la fuente de tipos. El `EXCLUDE`
  vive solo en el SQL de la migración `0000`; mantener ambos en sync.
- **Env**: `.env` en la RAÍZ (gitignored). `DATABASE_URL` (pooled, runtime) y
  `DATABASE_URL_UNPOOLED` (directa, migraciones). En Vercel las inyecta la integración de
  Neon.

### ⚠️ Gotcha: degradación de tipos de Drizzle en builds

En el `tsc` de Vercel (sin `skipLibCheck`) la inferencia de Drizzle **se degrada** (tablas
pierden columnas opcionales, `$inferInsert` roto). Reglas para queries de escritura:
- En `.values()`/`.set()` nunca uses objeto literal con propiedades explícitas → usá
  **variable** o **spread** (`{ ...data }`). El chequeo de "excess property" solo aplica a
  literales.
- Si la inferencia degradada no ve columnas requeridas, castear el payload con `as any`
  (ya validado por Zod, es seguro).
- `drizzle-orm` debe ser **una sola instancia**: solo `@turnos/db` lo declara como dep y
  re-exporta los operadores; la API los importa desde `@turnos/db`, no desde `drizzle-orm`.

## Deploy en Vercel (DOS proyectos, mismo repo, Root Directory distinto)

Idéntico a Suites. La **API** se despliega con la **Build Output API** (`.vercel/output/`):
esbuild autocontenido que inlinea las deps de workspace y escribe
`functions/api.func/` + `config.json` (rutas a `/api`). `vercel.json` solo con
`framework: null` + `buildCommand`. La **Web** con preset Vite y env `VITE_API_URL`.
No usar `@vercel/node` nativo (degrada tipos + `ERR_MODULE_NOT_FOUND` por TS sin compilar).
Guía paso a paso con la configuración de cada proyecto: `docs/deploy-vercel.md`.

## Autenticación (Better Auth)

- `better-auth@1.2.12` (zod 3). Override `better-call=1.0.29` en el root para evitar el
  peer de zod 4 (el proyecto usa zod 3 — no subir sin migrar todo).
- Config en `apps/api/src/auth.ts`: `drizzleAdapter` sobre la `db` neon-http,
  `emailAndPassword`, `socialProviders.google`, campo `role`
  (`admin|profesional|administrativo|paciente`, default `paciente`). Handler en Hono bajo
  `/api/auth/...`.
- Promover: `UPDATE auth_user SET role='admin' WHERE email=...`.
- Env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID/SECRET` (agregarlos en
  el proyecto API de Vercel). En prod (https, cross-site) las cookies necesitan
  `SameSite=None; Secure`.
- Reciclar la sección "Mi cuenta" (re-autenticación antes de cambiar password/email/borrar).

## Recordatorios (Fase 3, serverless — NO containers)

- **WhatsApp**: usar el **WhatsApp Cloud API oficial de Meta** (hosteado por Meta, solo
  llamadas HTTP a la Graph API desde una función de Vercel). La API on-premise se
  discontinuó (oct-2025) y Evolution API exige Docker/sesión persistente → descartado por
  el requisito serverless. Recordatorio de turno = plantilla categoría *utility*. Costo
  per-message desde jul-2025 (servicio entrante gratis, plantillas salientes se cobran).
- **Mail**: Resend o Amazon SES (HTTP puro).

## Diseño

Ver `docs/manual-diseno.md`. Resumen: identidad sobria de salud AR, primario **teal
profundo** (`#0E5A6B`), papel cálido-frío, verde semántico (`#2E8C79`) para
disponible/confirmado, terracota (`#B8482A`) **solo** para alertas. Tipografía
**Source Serif 4** (display) + **Public Sans** (UI/cuerpo). Elemento signature: el **chip
de horario**. Flujo de reserva en ≤4 pasos. Accesibilidad AA no negociable (cuerpo ≥16px,
estado nunca solo por color, foco visible, toque ≥44px). Filtro por especialidad en la
landing (conviven disciplinas).

## Qué se recicló y qué se eliminó de Suites Manager

- **Reciclado**: monorepo + stack, EXCLUDE anti-solapamiento (adaptado), CTE atómico +
  409, Better Auth + Google OAuth + roles + "Mi cuenta", audit log con hash encadenado,
  landing pública + admin de landing, export Excel/PDF (→ "lista de pacientes del día"),
  modo mock, deploy dual en Vercel, gotchas de Drizzle/Neon.
- **Eliminado**: todo el módulo de pagos (`pagos`, `metodos_pago`, `impuestos`,
  facturación), tarifas dinámicas + `tarifaCalc`, `consumos`/`servicios`, housekeeping,
  amenidades, `capacidad`, y el cargo monetario por cancelación (la cancelación queda,
  sin dinero; se trackea anticipación y ausentismo).

## Convenciones de Git

- **Commit en cada cambio importante.** Mensajes en español.
- Identidad de commits: `SanticreideARG <santi.creide@gmail.com>` (git config LOCAL del repo).
- `.env` NUNCA se commitea.

## Roadmap

- **Fase 0 — Fork & purga** ✅: renombrar workspaces a `@turnos/*`, migración `0000` limpia
  con el EXCLUDE en `tstzrange` + sobreturno, borrar módulos de pago/tarifas/housekeeping.
- **Fase 1 — MVP turnos** (en curso): CRUD profesionales ✅ · ventanas recurrentes +
  excepciones ✅ · obras sociales ✅ · CRUD pacientes ✅ · cálculo de disponibilidad ✅
  (con tests) · alta de turno (CTE→409) ✅ · estados (confirmar/arribo/atendido/ausente/
  cancelar) ✅ · agenda día por profesional (UI) ✅ · vista propia del rol `profesional`
  (agenda + ventanas, `GET /profesionales/me`) ✅ · lista de pacientes del día + export
  Excel (todos los profesionales, `GET /turnos/dia`) ✅ · falta: agenda en vista semana.
- **Fase 2 — Portal paciente**: landing clínica · registro OAuth/email · reserva
  self-service (especialidad→profesional→fecha→slot) · "Mis turnos" (ver/cancelar) ·
  confirmación de solicitados por administrativo.
- **Fase 3 — Operación**: recordatorios WhatsApp Cloud API/email (serverless) · lista de
  espera · reportes de ausentismo · notas clínicas mínimas por turno · multi-sede.

## Estado actual

> Fase 0 completa (schema + purga del scaffold hotelero). Fase 1 prácticamente completa:
> profesionales, ventanas de trabajo, obras sociales, pacientes, agenda (vista día,
> `features/agenda/`), vista propia del rol `profesional` (`MiAgendaPage.tsx` +
> `GET /profesionales/me`) y lista de pacientes del día + export a Excel
> (`features/lista-dia/`, `GET /turnos/dia`) ya están, backend + UI. El algoritmo de
> disponibilidad (`apps/api/src/disponibilidad.ts`, con tests) y la ruta de alta de turno
> con CTE atómico + 409 overbooking (`apps/api/src/routes/turnos.ts`) sostienen todo esto.
> Único pendiente de Fase 1: la agenda en vista semana (hoy solo día). Después sigue Fase 2
> (portal paciente).
