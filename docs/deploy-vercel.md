# Deploy en Vercel (web + API serverless)

El monorepo se despliega como **dos proyectos Vercel** desde el mismo repo de
GitHub: uno para la web (Vite) y otro para la API (Hono serverless).

```
Repo  ──┬──> Proyecto "suites-web"  (Root Directory: apps/web)
        └──> Proyecto "suites-api"  (Root Directory: apps/api)
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

## 2. Proyecto API (`suites-api`)

En Vercel → Add New → Project → importás el repo y creás un proyecto con:

- **Root Directory**: `apps/api`
- **Framework Preset**: `Other`
- **Build Command**: vacío (Vercel bundlea la función sola)
- **Install Command**: `pnpm install` (default; resuelve los workspaces)
- **Environment Variables**:
  - `DATABASE_URL` → la connection string **pooled** de Neon. Si conectaste la
    base Neon a este proyecto desde el Marketplace, ya viene inyectada.

Cómo funciona:
- `apps/api/api/index.ts` es la **función serverless** (runtime Node) que exporta
  la app Hono con el adaptador `hono/vercel`.
- `apps/api/vercel.json` reescribe **todas** las rutas a `/api`, y Hono enruta
  internamente por el path original (`/habitaciones`, `/reservas`, etc.).
- El cliente de DB usa el **driver serverless de Neon** (`@neondatabase/serverless`
  por WebSocket), que funciona en funciones efímeras y soporta transacciones.

Tras desplegar, probá: `https://suites-api-xxx.vercel.app/health` → `{"status":"ok"}`.

---

## 3. Proyecto Web (`suites-web`)

Otro proyecto Vercel sobre el mismo repo:

- **Root Directory**: `apps/web`
- **Framework Preset**: `Vite`
- **Environment Variables**:
  - `VITE_API_URL` → la URL del proyecto API (ej. `https://suites-api-xxx.vercel.app`).
    ⚠️ Vite **inyecta las env en build**: si cambiás esta URL, hay que redeployar la web.

> No definas `VITE_MOCK` en producción (o ponelo en 0): en prod la web pega a la API real.

---

## 4. Notas

- **Monorepo + pnpm**: Vercel detecta `pnpm-workspace.yaml`. Si algún build no
  encuentra `@suites/db` / `@suites/shared`, verificá que esté activado
  "Include files outside of the Root Directory" (default en pnpm).
- **CORS**: la API hoy habilita CORS abierto. Para producción conviene
  restringirlo al dominio de la web (en `apps/api/src/app.ts`).
- **Una sola instancia de drizzle-orm**: la API importa los operadores
  (`eq`, `and`, …) desde `@suites/db`, no desde `drizzle-orm`, para evitar
  choques de tipos por peers duplicados en el build.
- **Local vs Vercel**: en local `pnpm dev:api` corre `src/index.ts` (servidor Node
  con `serve()`); en Vercel se usa `api/index.ts` (serverless). Misma app.
