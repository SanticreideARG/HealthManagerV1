import type { Context } from "hono";
import { db, eq, profesionales } from "@turnos/db";
import { auth } from "../auth.js";

/**
 * Un profesional gestiona sus propios recursos (ventanas, turnos); staff
 * (admin/administrativo) gestiona los de cualquiera.
 */
export async function puedeGestionarProfesional(c: Context, profesionalId: number): Promise<boolean> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role === "admin" || role === "administrativo") return true;
  if (role === "profesional" && session) {
    const [propio] = await db
      .select({ id: profesionales.id })
      .from(profesionales)
      .where(eq(profesionales.authUserId, session.user.id));
    return propio?.id === profesionalId;
  }
  return false;
}
