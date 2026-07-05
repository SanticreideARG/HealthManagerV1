import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, eq, obrasSociales } from "@turnos/db";
import { obraSocialCreate, obraSocialUpdate } from "@turnos/shared";
import { staff, adminOnly } from "../middleware/auth.js";
import { logAudit } from "../lib/audit.js";

export const obrasSocialesRoutes = new Hono();

obrasSocialesRoutes.get("/", staff, async (c) => {
  const rows = await db.select().from(obrasSociales).orderBy(obrasSociales.nombre);
  return c.json(rows);
});

obrasSocialesRoutes.post("/", adminOnly, zValidator("json", obraSocialCreate), async (c) => {
  const data = c.req.valid("json");
  const [row] = await db.insert(obrasSociales).values(data).returning();
  if (!row) return c.json({ error: "No se pudo crear" }, 500);
  await logAudit(c, {
    accion: "crear",
    entidad: "obras_sociales",
    entidadId: row.id,
    entidadLabel: row.nombre,
  });
  return c.json(row, 201);
});

obrasSocialesRoutes.patch("/:id", adminOnly, zValidator("json", obraSocialUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const data = c.req.valid("json");
  const [row] = await db.update(obrasSociales).set(data).where(eq(obrasSociales.id, id)).returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  await logAudit(c, {
    accion: "editar",
    entidad: "obras_sociales",
    entidadId: id,
    entidadLabel: row.nombre,
  });
  return c.json(row);
});

obrasSocialesRoutes.delete("/:id", adminOnly, async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db.delete(obrasSociales).where(eq(obrasSociales.id, id)).returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  await logAudit(c, {
    accion: "eliminar",
    entidad: "obras_sociales",
    entidadId: id,
    entidadLabel: row.nombre,
  });
  return c.json({ ok: true });
});
