import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { configRoutes } from "./routes/config.js";
import { usuariosRoutes } from "./routes/usuarios.js";
import { publicRoutes } from "./routes/public.js";
import { landingManagerRoutes } from "./routes/landingManager.js";
import { landingServiciosRoutes } from "./routes/landingServicios.js";
import { landingContactosRoutes } from "./routes/landingContactos.js";
import { auditLogRoutes } from "./routes/auditLog.js";
import { auth } from "./auth.js";

/** App Hono sin servidor: la consume server.ts (local) y api/index.ts (Vercel). */
export const app = new Hono();

app.use("*", logger());
// CORS con credenciales: refleja el origin (necesario para enviar cookies de
// sesión cross-origin entre la web y la API).
app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    credentials: true,
  }),
);

app.get("/", (c) => c.json({ ok: true, service: "turnos-manager-api" }));
app.get("/health", (c) => c.json({ status: "ok" }));

// Better Auth (rutas bajo /api/auth).
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Fase 1 agrega acá: profesionales, pacientes, ventanas, turnos.
app.route("/config", configRoutes);
app.route("/usuarios", usuariosRoutes);
app.route("/landing-manager", landingManagerRoutes);
app.route("/landing-servicios", landingServiciosRoutes);
app.route("/landing-contactos", landingContactosRoutes);
app.route("/audit-log", auditLogRoutes);
app.route("/public", publicRoutes);

export default app;
