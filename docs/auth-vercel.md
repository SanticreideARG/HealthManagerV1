# Autenticación en Vercel — habilitar login y gestionar usuarios

La autenticación (Better Auth) corre en el **proyecto API**. Para que el login
funcione en producción hay que configurar variables de entorno; luego se crean
usuarios y se les asigna un rol.

> La base es **Neon** y es la misma para local y producción. Por eso un usuario
> creado en cualquier entorno (o promovido desde local) sirve en Vercel.

---

## Paso 1 — Variables de entorno en el proyecto API (obligatorio)

Sin esto el login "no funciona": cada cold start de la función usa un secreto
distinto y la sesión nunca queda válida.

Vercel → proyecto **API** (`health-manager-v1-api`) → **Settings → Environment
Variables** → agregá estas 3 (Production, y Preview si querés):

| Variable | Valor | Ejemplo |
|---|---|---|
| `BETTER_AUTH_SECRET` | un secreto fuerte y fijo | salida de `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | URL pública del **API** | `https://health-manager-v1-api.vercel.app` |
| `WEB_URL` | URL pública de la **web** | `https://health-manager-v1-web.vercel.app` (ajustá al nombre real de tu proyecto web) |

> Para generar el secreto: en una terminal `openssl rand -base64 32`
> (o en Node: `node -e "console.log(crypto.randomBytes(32).toString('base64'))"`).
> Guardalo: si lo cambiás, se invalidan todas las sesiones existentes.

Después de guardar, **Deployments → Redeploy** del proyecto API.

### Verificación rápida
```bash
curl -i -X POST https://health-manager-v1-api.vercel.app/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"santi.creide@gmail.com","password":"TU_PASS"}'
```
Debe devolver **200** y un `Set-Cookie` de sesión. Si da 500, revisá que las
variables estén bien y que el deploy haya tomado los cambios.

---

## Paso 2 — Crear un usuario

**Opción A (recomendada): registrarse desde la web.**
Abrí la web desplegada → en el login, "¿No tenés cuenta? Registrate" → completá
nombre, email y contraseña. Queda con rol **paciente** por defecto.

**Opción B: por API (curl).**
```bash
curl -X POST https://health-manager-v1-api.vercel.app/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"persona@mail.com","password":"contraseña","name":"Nombre"}'
```

> La contraseña mínima es 8 caracteres.

---

## Paso 3 — Asignar el rol (admin / profesional / administrativo / paciente)

Los nuevos usuarios nacen como **paciente**. Para hacerlos **admin**, **profesional** o
**administrativo**:

**Opción A: script local** (corre contra la misma base Neon de producción):
```bash
pnpm db:promote persona@mail.com admin
pnpm db:promote otra@mail.com administrativo
```

**Opción B: SQL desde el panel de Neon** (Neon Console → tu proyecto → SQL Editor):
```sql
UPDATE auth_user SET role = 'admin' WHERE email = 'persona@mail.com';
```

Roles (detalle completo en [CLAUDE.md](../CLAUDE.md)):
- **admin**: acceso total (config, ABM profesionales, obras sociales, landing, usuarios).
- **profesional**: gestiona sus propias ventanas de trabajo y su agenda; puede emitir
  sobreturnos. Requiere vincular el usuario a un registro de `profesionales`
  (`auth_user_id`) para que `GET /profesionales/me` lo resuelva.
- **administrativo**: ve disponibilidad, da de alta turnos y pacientes, gestiona la
  lista del día. No toca config global ni el ABM de profesionales.
- **paciente**: sin acceso al panel (reservado para el futuro portal de reserva,
  Fase 2).

---

## Estado actual
- Ya existe un admin: **santi.creide@gmail.com** (rol admin). Funciona apenas
  configures las variables del Paso 1 y redeploys el API.
- Usuarios de prueba (se pueden borrar): `admin@turnos.test`, `administrativo@turnos.test`,
  `paciente@turnos.test`.

## Síntoma: "ingreso bien pero me vuelve al login"
Es la **cookie de sesión cross-site** que el navegador no guarda/envía (web y API en
dominios distintos de `vercel.app`). Antes la cookie salía `SameSite=Lax` (mal); ya se
corrigió para que en producción salga **`SameSite=None; Secure`** (commit que detecta
`NODE_ENV=production`). **Redeploy del proyecto API** y probá de nuevo.

### Si AÚN falla (navegador que bloquea cookies de terceros: Safari, Chrome estricto)
La solución robusta es servir todo bajo **el mismo origen** (la cookie pasa a ser
first-party). La web hace de proxy hacia la API:

1. **`apps/web/vercel.json`** — agregar un rewrite (reemplazá por tu URL real de API):
   ```json
   {
     "rewrites": [
       { "source": "/backend/:path*",
         "destination": "https://health-manager-v1-api.vercel.app/:path*" }
     ]
   }
   ```
2. En el proyecto **web** (Vercel → Settings → Environment Variables) cambiar:
   - `VITE_API_URL` = `/backend`  (relativo → mismo origen que la web)
   - **Redeploy de la web** (Vite hornea la variable en build).

Con esto el navegador solo habla con la web; la API queda detrás de `/backend` y la
cookie es first-party (funciona en todos los navegadores). En el proyecto **API** dejá
`WEB_URL` = URL de la web (para `trustedOrigins`).

> Alternativa: tokens Bearer (plugin de Better Auth) en vez de cookies — más cambios de
> código; lo hacemos si preferís no usar el proxy.
