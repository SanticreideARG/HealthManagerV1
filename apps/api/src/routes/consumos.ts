import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, consumos, reservas, eq, drizzleSql } from "@suites/db";
import { consumoCreate } from "@suites/shared";
import { staff } from "../middleware/auth.js";

export const consumosRoutes = new Hono();
consumosRoutes.use("*", staff);

// GET /consumos?reservaId=
consumosRoutes.get("/", async (c) => {
  const reservaId = Number(c.req.query("reservaId"));
  if (!reservaId) return c.json({ error: "Falta reservaId" }, 400);

  const rows = await db
    .select()
    .from(consumos)
    .where(eq(consumos.reservaId, reservaId))
    .orderBy(consumos.fecha);
  return c.json(rows);
});

// POST /consumos — agrega un cargo a la reserva y suma su subtotal al total.
consumosRoutes.post("/", zValidator("json", consumoCreate), async (c) => {
  const data = c.req.valid("json");

  const [reserva] = await db
    .select()
    .from(reservas)
    .where(eq(reservas.id, data.reservaId));
  if (!reserva) return c.json({ error: "Reserva inexistente" }, 404);

  const subtotal = Math.round(data.cantidad * data.precioUnit * 100) / 100;

  const [row] = await db
    .insert(consumos)
    .values({
      reservaId: data.reservaId,
      servicioId: data.servicioId,
      descripcion: data.descripcion,
      cantidad: String(data.cantidad),
      precioUnit: String(data.precioUnit),
      subtotal: String(subtotal),
      notas: data.notas,
    } as any)
    .returning();

  await db
    .update(reservas)
    .set({ total: drizzleSql`${reservas.total} + ${subtotal}` })
    .where(eq(reservas.id, data.reservaId));

  return c.json(row, 201);
});

// DELETE /consumos/:id — quita el cargo y resta su subtotal del total.
consumosRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db.delete(consumos).where(eq(consumos.id, id)).returning();
  if (!row) return c.json({ error: "No encontrado" }, 404);

  await db
    .update(reservas)
    .set({ total: drizzleSql`${reservas.total} - ${Number(row.subtotal)}` })
    .where(eq(reservas.id, row.reservaId));

  return c.json({ ok: true });
});
