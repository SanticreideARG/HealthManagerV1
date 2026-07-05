import { Hono } from "hono";
import { db, profesionales, eq } from "@turnos/db";

/**
 * Rutas públicas — sin autenticación. Solo lectura, info para el portal.
 *
 * El cálculo de disponibilidad (expandir ventanas recurrentes, aplicar
 * excepciones, restar turnos ocupados y trocear en slots) es el algoritmo
 * central de Fase 1 y todavía no está implementado — ver CLAUDE.md.
 */
export const publicRoutes = new Hono();

publicRoutes.get("/profesionales", async (c) => {
  const rows = await db
    .select({
      id: profesionales.id,
      nombre: profesionales.nombre,
      especialidad: profesionales.especialidad,
      ubicacion: profesionales.ubicacion,
      color: profesionales.color,
    })
    .from(profesionales)
    .where(eq(profesionales.activo, true))
    .orderBy(profesionales.nombre);
  return c.json(rows);
});
