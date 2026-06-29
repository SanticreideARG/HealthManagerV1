import { Hono } from "hono";
import { db, habitaciones, reservas, and, ne, lt, gt, drizzleSql } from "@suites/db";

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
      fotoUrl: drizzleSql<string | null>`(SELECT url FROM habitacion_fotos WHERE habitacion_id = ${habitaciones.id} ORDER BY orden ASC LIMIT 1)`,
    })
    .from(habitaciones)
    .orderBy(habitaciones.id);
  return c.json(rows);
});

publicRoutes.get("/disponibilidad", async (c) => {
  const checkin = c.req.query("checkin");
  const checkout = c.req.query("checkout");
  if (!checkin || !checkout || checkout <= checkin) {
    return c.json({ error: "Parámetros inválidos" }, 400);
  }

  const bloqueadas = await db
    .select({ habitacionId: reservas.habitacionId })
    .from(reservas)
    .where(
      and(
        ne(reservas.estado, "cancelada"),
        lt(reservas.checkin, checkout),
        gt(reservas.checkout, checkin),
      ),
    );

  const bloqueadasSet = new Set(bloqueadas.map((r) => r.habitacionId));
  const todas = await db.select({ id: habitaciones.id }).from(habitaciones);
  const disponibles = todas.filter((h) => !bloqueadasSet.has(h.id)).map((h) => h.id);

  return c.json({ checkin, checkout, disponibles });
});
