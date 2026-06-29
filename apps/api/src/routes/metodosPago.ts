import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { asc, db, eq, metodosPago } from "@suites/db";
import { metodoPagoCreate, metodoPagoUpdate } from "@suites/shared";
import { adminOnly, staff } from "../middleware/auth.js";

export const metodosPagoRoutes = new Hono();

// Lectura pública para staff (usada en AccionesReserva al registrar pago)
metodosPagoRoutes.get("/", staff, async (c) => {
  const rows = await db.select().from(metodosPago).orderBy(asc(metodosPago.id));
  return c.json(rows);
});

// CRUD solo admin
metodosPagoRoutes.post("/", adminOnly, zValidator("json", metodoPagoCreate), async (c) => {
  const data = c.req.valid("json");
  const [row] = await db.insert(metodosPago).values({
    tipo: data.tipo,
    nombre: data.nombre,
    banco: data.banco ?? null,
    cuotas: data.cuotas ?? 1,
    recargoPct: String(data.recargoPct ?? 0),
    proveedor: data.proveedor ?? null,
    activo: data.activo ?? true,
  }).returning();
  return c.json(row, 201);
});

metodosPagoRoutes.patch("/:id", adminOnly, zValidator("json", metodoPagoUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const data = c.req.valid("json");
  const patch: Record<string, unknown> = {};
  if (data.tipo !== undefined) patch.tipo = data.tipo;
  if (data.nombre !== undefined) patch.nombre = data.nombre;
  if (data.banco !== undefined) patch.banco = data.banco ?? null;
  if (data.cuotas !== undefined) patch.cuotas = data.cuotas;
  if (data.recargoPct !== undefined) patch.recargoPct = String(data.recargoPct);
  if (data.proveedor !== undefined) patch.proveedor = data.proveedor ?? null;
  if (data.activo !== undefined) patch.activo = data.activo;
  const [row] = await db.update(metodosPago).set(patch).where(eq(metodosPago.id, id)).returning();
  if (!row) return c.json({ error: "No encontrado" }, 404);
  return c.json(row);
});

metodosPagoRoutes.delete("/:id", adminOnly, async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(metodosPago).where(eq(metodosPago.id, id));
  return c.json({ ok: true });
});
