import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, eq, amenidades, habitacionAmenidades } from "@suites/db";
import { amenidadCreate, amenidadUpdate, habitacionAmenidadesSet } from "@suites/shared";
import { staff, adminOnly } from "../middleware/auth.js";

export const amenidadesRoutes = new Hono();
amenidadesRoutes.use("*", staff);

// Catálogo completo
amenidadesRoutes.get("/", async (c) => {
  const rows = await db.select().from(amenidades).orderBy(amenidades.nombre);
  return c.json(rows);
});

amenidadesRoutes.post("/", adminOnly, zValidator("json", amenidadCreate), async (c) => {
  const [row] = await db.insert(amenidades).values(c.req.valid("json")).returning();
  return c.json(row, 201);
});

amenidadesRoutes.patch("/:id", adminOnly, zValidator("json", amenidadUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db
    .update(amenidades)
    .set(c.req.valid("json"))
    .where(eq(amenidades.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  return c.json(row);
});

amenidadesRoutes.delete("/:id", adminOnly, async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db.delete(amenidades).where(eq(amenidades.id, id)).returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  return c.json({ ok: true });
});

// Amenidades por habitación — sub-rutas bajo /habitaciones/:id/amenidades
// (registradas en habitaciones.ts; exportamos el helper de fetch aquí)
export async function getHabitacionAmenidades(habitacionId: number) {
  return db
    .select({
      amenidadId: habitacionAmenidades.amenidadId,
      nombre: amenidades.nombre,
      tipo: amenidades.tipo,
      icono: amenidades.icono,
      valor: habitacionAmenidades.valor,
    })
    .from(habitacionAmenidades)
    .innerJoin(amenidades, eq(habitacionAmenidades.amenidadId, amenidades.id))
    .where(eq(habitacionAmenidades.habitacionId, habitacionId));
}

export { habitacionAmenidadesSet };
