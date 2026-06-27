import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, eq, habitaciones, habitacionAmenidades } from "@suites/db";
import { habitacionCreate, habitacionUpdate } from "@suites/shared";
import { staff, adminOnly } from "../middleware/auth.js";
import { getHabitacionAmenidades, habitacionAmenidadesSet } from "./amenidades.js";

export const habitacionesRoutes = new Hono();
habitacionesRoutes.use("*", staff); // ver: admin + gestor; ABM: solo admin

habitacionesRoutes.get("/", async (c) => {
  const rows = await db.select().from(habitaciones).orderBy(habitaciones.id);
  return c.json(rows);
});

habitacionesRoutes.post("/", adminOnly, zValidator("json", habitacionCreate), async (c) => {
  const data = c.req.valid("json");
  // El payload ya está validado por Zod (habitacionCreate) → runtime seguro.
  // `as any` a propósito: la inferencia de tipos de Drizzle se degrada en el
  // tsc del build de Vercel (incluido $inferInsert), por lo que cualquier cast
  // tipado también falla. Con `any` compila siempre; el runtime no cambia.
  const values = { ...data, tarifaBase: String(data.tarifaBase) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [row] = await db
    .insert(habitaciones)
    .values(values as any)
    .returning();
  return c.json(row, 201);
});

habitacionesRoutes.patch(
  "/:id",
  adminOnly,
  zValidator("json", habitacionUpdate),
  async (c) => {
    const id = Number(c.req.param("id"));
    const { tarifaBase, ...resto } = c.req.valid("json");
    const [row] = await db
      .update(habitaciones)
      .set({
        ...resto,
        ...(tarifaBase !== undefined ? { tarifaBase: String(tarifaBase) } : {}),
      })
      .where(eq(habitaciones.id, id))
      .returning();
    if (!row) return c.json({ error: "No encontrada" }, 404);
    return c.json(row);
  },
);

// Amenidades de una habitación concreta
habitacionesRoutes.get("/:id/amenidades", async (c) => {
  const id = Number(c.req.param("id"));
  return c.json(await getHabitacionAmenidades(id));
});

habitacionesRoutes.put(
  "/:id/amenidades",
  adminOnly,
  zValidator("json", habitacionAmenidadesSet),
  async (c) => {
    const id = Number(c.req.param("id"));
    const data = c.req.valid("json");
    await db
      .delete(habitacionAmenidades)
      .where(eq(habitacionAmenidades.habitacionId, id));
    if (data.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.insert(habitacionAmenidades).values(
        data.map((a) => ({
          habitacionId: id,
          amenidadId: a.amenidadId,
          valor: a.valor ?? null,
        })) as any,
      );
    }
    return c.json(await getHabitacionAmenidades(id));
  },
);

habitacionesRoutes.delete("/:id", adminOnly, async (c) => {
  const id = Number(c.req.param("id"));
  try {
    const [row] = await db
      .delete(habitaciones)
      .where(eq(habitaciones.id, id))
      .returning();
    if (!row) return c.json({ error: "No encontrada" }, 404);
    return c.json({ ok: true });
  } catch (err) {
    // 23503 = foreign_key_violation (tiene reservas asociadas)
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23503"
    ) {
      return c.json(
        {
          error: "en_uso",
          message:
            "No se puede eliminar: la habitación tiene reservas asociadas.",
        },
        409,
      );
    }
    throw err;
  }
});
