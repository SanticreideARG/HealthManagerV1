import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, desc, eq, habitaciones, huespedes, reservas } from "@suites/db";
import { huespedCreate, huespedUpdate } from "@suites/shared";

export const huespedesRoutes = new Hono();

huespedesRoutes.get("/", async (c) => {
  const rows = await db.select().from(huespedes).orderBy(huespedes.nombre);
  return c.json(rows);
});

huespedesRoutes.post("/", zValidator("json", huespedCreate), async (c) => {
  const data = c.req.valid("json");
  const [row] = await db.insert(huespedes).values(data).returning();
  return c.json(row, 201);
});

huespedesRoutes.patch("/:id", zValidator("json", huespedUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const data = c.req.valid("json");
  const [row] = await db
    .update(huespedes)
    .set(data)
    .where(eq(huespedes.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrado" }, 404);
  return c.json(row);
});

huespedesRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  try {
    const [row] = await db
      .delete(huespedes)
      .where(eq(huespedes.id, id))
      .returning();
    if (!row) return c.json({ error: "No encontrado" }, 404);
    return c.json({ ok: true });
  } catch (err) {
    // 23503 = FK violation (tiene reservas asociadas)
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23503"
    ) {
      return c.json(
        {
          error: "en_uso",
          message: "No se puede eliminar: el huésped tiene reservas.",
        },
        409,
      );
    }
    throw err;
  }
});

// Historial de estadías del huésped (todas las fechas).
huespedesRoutes.get("/:id/historial", async (c) => {
  const id = Number(c.req.param("id"));
  const rows = await db
    .select({
      id: reservas.id,
      habitacionId: reservas.habitacionId,
      habitacion: habitaciones.nombre,
      checkin: reservas.checkin,
      checkout: reservas.checkout,
      estado: reservas.estado,
      total: reservas.total,
    })
    .from(reservas)
    .innerJoin(habitaciones, eq(reservas.habitacionId, habitaciones.id))
    .where(eq(reservas.huespedId, id))
    .orderBy(desc(reservas.checkin));
  return c.json(rows);
});
