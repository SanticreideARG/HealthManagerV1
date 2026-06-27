import { Hono } from "hono";
import { db, habitaciones } from "@suites/db";

/** Rutas públicas — sin autenticación. Solo lectura, info para el portal. */
export const publicRoutes = new Hono();

publicRoutes.get("/habitaciones", async (c) => {
  const rows = await db
    .select({
      id: habitaciones.id,
      nombre: habitaciones.nombre,
      tipo: habitaciones.tipo,
      capacidad: habitaciones.capacidad,
      tarifaBase: habitaciones.tarifaBase,
    })
    .from(habitaciones)
    .orderBy(habitaciones.id);
  return c.json(rows);
});
