import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, servicios, eq } from "@suites/db";
import { servicioCreate, servicioUpdate } from "@suites/shared";
import { staff, adminOnly } from "../middleware/auth.js";

export const serviciosRoutes = new Hono();

// GET /servicios — catálogo completo (staff necesita verlo al cargar consumos).
serviciosRoutes.get("/", staff, async (c) => {
  const rows = await db.select().from(servicios).orderBy(servicios.nombre);
  return c.json(rows);
});

serviciosRoutes.post(
  "/",
  adminOnly,
  zValidator("json", servicioCreate),
  async (c) => {
    const data = c.req.valid("json");
    const [row] = await db
      .insert(servicios)
      .values(data as any)
      .returning();
    return c.json(row, 201);
  },
);

serviciosRoutes.patch(
  "/:id",
  adminOnly,
  zValidator("json", servicioUpdate),
  async (c) => {
    const id = Number(c.req.param("id"));
    const data = c.req.valid("json");
    const [row] = await db
      .update(servicios)
      .set(data as any)
      .where(eq(servicios.id, id))
      .returning();
    if (!row) return c.json({ error: "No encontrado" }, 404);
    return c.json(row);
  },
);

serviciosRoutes.delete("/:id", adminOnly, async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db.delete(servicios).where(eq(servicios.id, id)).returning();
  if (!row) return c.json({ error: "No encontrado" }, 404);
  return c.json({ ok: true });
});
