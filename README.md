# Turnos Manager

Gestor de turnos para clínicas, consultorios y profesionales médicos / de otras
disciplinas. Cada profesional gestiona sus ventanas de trabajo y sobre ellas se
ofrecen turnos. Sin pagos: el sistema reserva y coordina, no factura. Mercado Argentina.

## Stack

- **Frontend** (`apps/web`): Vite + React 19 + TypeScript + Tailwind v4, TanStack Query (estado de servidor) + Zustand (estado de UI).
- **Backend** (`apps/api`): Hono (Node) + Zod.
- **DB** (`packages/db`): Postgres (Neon en prod) + Drizzle ORM.
- **Shared** (`packages/shared`): esquemas Zod/tipos compartidos front ↔ back.

Monorepo con **pnpm workspaces**. Ver [CLAUDE.md](CLAUDE.md) para el detalle completo
de arquitectura, decisiones de dominio y roadmap.

## Pieza clave: anti-overbooking

El solapamiento de turnos se previene **a nivel base de datos** con un constraint
`EXCLUDE USING gist` (ver `packages/db/migrations/0000_init.sql`). Dos turnos no
cancelados y sin marcar como sobreturno no pueden pisar horario para el mismo
profesional, sin importar condiciones de carrera. La API traduce esa violación
(código `23P01`) a un `409 overbooking`.

## Puesta en marcha

La base es **Postgres en Vercel (Neon)**. Seguí la guía paso a paso:
👉 [docs/setup-db-vercel.md](docs/setup-db-vercel.md)

Resumen:

```bash
pnpm install
cp .env.example .env        # pegar DATABASE_URL y DATABASE_URL_UNPOOLED (ver guía)

pnpm db:migrate             # crea tablas + constraint
pnpm db:seed                # (opcional) profesionales/ventanas/obras sociales de ejemplo

pnpm dev                    # levanta web (:5180) y api (:3001)
```

- Web: http://localhost:5180
- API: http://localhost:3001

### Alternativa: Postgres local con Docker

```bash
docker run --name turnos-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=turnos -p 5432:5432 -d postgres:16
# DATABASE_URL="postgres://postgres:postgres@localhost:5432/turnos"
```

## Estructura

```
apps/
  web/   SPA React (panel, landing pública)
  api/   API Hono (auth, config, landing, audit log — Fase 1 agrega profesionales/turnos)
packages/
  db/      schema Drizzle + migraciones SQL + runner
  shared/  esquemas Zod compartidos
```

## Estado y roadmap

Fase 0 (fork & purga del scaffold hotelero) completa. Ver la sección "Roadmap" en
[CLAUDE.md](CLAUDE.md) para Fase 1 (MVP turnos) en adelante.
