import { createMiddleware } from "hono/factory";
import { auth } from "../auth.js";

/**
 * Exige sesión y que el rol esté entre los permitidos.
 * Roles: admin (todo), profesional (sus ventanas/agenda), administrativo
 * (disponibilidad, alta de turnos y pacientes), paciente (solo portal).
 */
export function requireRole(...roles: string[]) {
  return createMiddleware(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "no_auth", message: "No autenticado." }, 401);
    }
    const role = (session.user as { role?: string }).role ?? "paciente";
    if (!roles.includes(role)) {
      return c.json(
        { error: "forbidden", message: "No tenés permiso para esta acción." },
        403,
      );
    }
    return next();
  });
}

/** Staff del panel: administrador o administrativo. */
export const staff = requireRole("admin", "administrativo");

/** Profesional (sobre sus propios recursos) o staff. */
export const profesionalOrStaff = requireRole("admin", "administrativo", "profesional");

/** Solo administrador (reglas de negocio: config, ABM profesionales, obras sociales). */
export const adminOnly = requireRole("admin");
