import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { asc, db, eq, impuestos } from "@suites/db";
import { impuestoCreate, impuestoUpdate } from "@suites/shared";
import { adminOnly } from "../middleware/auth.js";

export const impuestosRoutes = new Hono();
impuestosRoutes.use("*", adminOnly);

impuestosRoutes.get("/", async (c) => {
  const rows = await db.select().from(impuestos).orderBy(asc(impuestos.orden), asc(impuestos.id));
  return c.json(rows);
});

impuestosRoutes.post("/", zValidator("json", impuestoCreate), async (c) => {
  const data = c.req.valid("json");
  const [row] = await db.insert(impuestos).values({
    nombre: data.nombre,
    tipo: data.tipo,
    valor: String(data.valor),
    aplicaA: data.aplicaA ?? "todo",
    activo: data.activo ?? true,
    orden: data.orden ?? 0,
  }).returning();
  return c.json(row, 201);
});

impuestosRoutes.patch("/:id", zValidator("json", impuestoUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const data = c.req.valid("json");
  const patch: Record<string, unknown> = {};
  if (data.nombre !== undefined) patch.nombre = data.nombre;
  if (data.tipo !== undefined) patch.tipo = data.tipo;
  if (data.valor !== undefined) patch.valor = String(data.valor);
  if (data.aplicaA !== undefined) patch.aplicaA = data.aplicaA;
  if (data.activo !== undefined) patch.activo = data.activo;
  if (data.orden !== undefined) patch.orden = data.orden;
  const [row] = await db.update(impuestos).set(patch).where(eq(impuestos.id, id)).returning();
  if (!row) return c.json({ error: "No encontrado" }, 404);
  return c.json(row);
});

impuestosRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(impuestos).where(eq(impuestos.id, id));
  return c.json({ ok: true });
});
