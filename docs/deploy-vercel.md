# Deploy en Vercel (web + API serverless)

El monorepo se despliega como **dos proyectos Vercel** desde el mismo repo de
GitHub: uno para la web (Vite) y otro para la API (Hono serverless).

```
Repo  ──┬──> Proyecto "turnos-web"  (Root Directory: apps/web)
        └──> Proyecto "turnos-api"  (Root Directory: apps/api)
```

---

## 1. Base de datos (Neon)

Seguí [setup-db-vercel.md](setup-db-vercel.md) para crear la base. Luego, **desde
tu máquina** (no en Vercel), aplicá el esquema:

```bash
# .env con DATABASE_URL / DATABASE_URL_UNPOOLED apuntando a Neon
pnpm db:migrate
pnpm db:seed   # opcional
```

> Las migraciones corren como script Node con `pg` (DDL: extensión btree_gist +
> constraint EXCLUDE). No se ejecutan en las funciones serverless.

---

## 2. Proyecto API (`turnos-api`)

En Vercel → Add New → Project → importás el repo y creás un proyecto con:

- **Root Directory**: `apps/api`
- **Framework Preset**: `Other` (el `vercel.json` del proyecto fija `framework: null`)
- **Build Command**: se toma de `vercel.json` (`pnpm build:vercel`) — no hace falta
  configurarlo a mano en el dashboard.
- **Install Command**: `pnpm install` (default; resuelve los workspaces)
- **Environment Variables**:
  - `DATABASE_URL` → la connection string **pooled** de Neon. Si conectaste la
    base Neon a este proyecto desde el Marketplace, ya viene inyectada.
  - `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
    (ver [google-oauth-setup.md](google-oauth-setup.md)).

Cómo funciona (Build Output API de Vercel, **no** `@vercel/node` ni `hono/vercel`):
- `apps/api/vercel.json` es minimal: `{ "framework": null, "buildCommand": "pnpm build:vercel" }`.
- `pnpm build:vercel` corre `apps/api/scripts/build-vercel.mjs`, que bundlea
  `src/vercel-entry.ts` con **esbuild** (autocontenido: inlinea `@turnos/db`,
  `@turnos/shared`, etc.) y escribe a mano `.vercel/output/functions/api.func/index.js`
  + `.vc-config.json` (runtime `nodejs20.x`) + `.vercel/output/config.json`
  (`routes: [{ src: "/(.*)", dest: "/api" }]` — todo el tráfico va a la función,
  Hono enruta internamente por el path original).
- `src/vercel-entry.ts` exporta `getRequestListener(app.fetch)` de `@hono/node-server`:
  adapta la app Hono (fetch-based) a la firma `(req, res)` que espera la función Node.
- **Por qué no el enfoque estándar** (`@vercel/node` + `api/index.ts` autodetectado):
  degrada tipos de Drizzle en el build de Vercel y tira `ERR_MODULE_NOT_FOUND` porque
  Vercel no compila el TS de las deps de workspace. El Build Output API a mano
  evita ambos problemas.
- El cliente de DB (`packages/db/src/index.ts`) usa el **driver HTTP de Neon**
  (`@neondatabase/serverless` + `drizzle-orm/neon-http`, fetch nativo, **sin
  WebSocket**) — no el driver `neon-serverless`/`ws`. Este driver **no soporta
  transacciones interactivas**; las operaciones que necesitan atomicidad (p. ej.
  alta de turno con paciente nuevo) se resuelven con una sola sentencia CTE.

Tras desplegar, probá: `https://turnos-api-xxx.vercel.app/health` → `{"status":"ok"}`.

---

## 3. Proyecto Web (`turnos-web`)

Otro proyecto Vercel sobre el mismo repo:

- **Root Directory**: `apps/web`
- **Framework Preset**: `Vite`
- **Environment Variables**:
  - `VITE_API_URL` → la URL del proyecto API (ej. `https://turnos-api-xxx.vercel.app`).
    ⚠️ Vite **inyecta las env en build**: si cambiás esta URL, hay que redeployar la web.

> No definas `VITE_MOCK` en producción (o ponelo en 0): en prod la web pega a la API real.

---

## 4. Notas

- **Monorepo + pnpm**: Vercel detecta `pnpm-workspace.yaml`. Si algún build no
  encuentra `@turnos/db` / `@turnos/shared`, verificá que esté activado
  "Include files outside of the Root Directory" (default en pnpm).
- **CORS**: la API hoy habilita CORS abierto. Para producción conviene
  restringirlo al dominio de la web (en `apps/api/src/app.ts`).
- **Una sola instancia de drizzle-orm**: la API importa los operadores
  (`eq`, `and`, …) desde `@turnos/db`, no desde `drizzle-orm`, para evitar
  choques de tipos por peers duplicados en el build.
- **Local vs Vercel**: en local `pnpm dev:api` corre `src/index.ts` (servidor Node
  con `serve()` de `@hono/node-server`); en Vercel se usa `src/vercel-entry.ts`
  (serverless, bundleado por `build-vercel.mjs`). Misma app Hono (`src/app.ts`) en
  ambos casos, solo cambia el adaptador de entrada.
