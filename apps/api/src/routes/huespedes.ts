import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, db, desc, eq, ne, habitaciones, huespedes, reservas } from "@suites/db";
import { huespedCreate, huespedUpdate } from "@suites/shared";
import { staff } from "../middleware/auth.js";
import { logAudit, computeDiff, diffCrear, diffEliminar } from "../lib/audit.js";

export const huespedesRoutes = new Hono();
huespedesRoutes.use("*", staff);

huespedesRoutes.get("/", async (c) => {
  const rows = await db.select().from(huespedes).orderBy(huespedes.nombre);
  return c.json(rows);
});

// Huéspedes actualmente alojados (reserva en estado 'ocupada')
huespedesRoutes.get("/alojados", async (c) => {
  const rows = await db
    .select({
      id: huespedes.id,
      nombre: huespedes.nombre,
      documento: huespedes.documento,
      email: huespedes.email,
      telefono: huespedes.telefono,
      reservaId: reservas.id,
      habitacion: habitaciones.nombre,
      checkin: reservas.checkin,
    })
    .from(reservas)
    .innerJoin(huespedes, eq(reservas.huespedId, huespedes.id))
    .innerJoin(habitaciones, eq(reservas.habitacionId, habitaciones.id))
    .where(eq(reservas.estado, "ocupada"))
    .orderBy(huespedes.nombre);
  return c.json(rows);
});

huespedesRoutes.post("/", zValidator("json", huespedCreate), async (c) => {
  const data = c.req.valid("json");
  const [row] = await db.insert(huespedes).values(data).returning();
  await logAudit(c, {
    accion: "crear",
    entidad: "huespedes",
    entidadId: row.id,
    entidadLabel: row.nombre,
    diff: diffCrear(row as any, ["nombre", "documento", "email", "telefono"]),
  });
  return c.json(row, 201);
});

huespedesRoutes.patch("/:id", zValidator("json", huespedUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const data = c.req.valid("json");
  const [antes] = await db.select().from(huespedes).where(eq(huespedes.id, id));
  const [row] = await db
    .update(huespedes)
    .set(data)
    .where(eq(huespedes.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrado" }, 404);
  await logAudit(c, {
    accion: "editar",
    entidad: "huespedes",
    entidadId: id,
    entidadLabel: row.nombre,
    diff: computeDiff(antes as any, row as any, ["nombre", "documento", "tipoDocumento", "email", "telefono", "nacionalidad", "notas"]),
  });
  return c.json(row);
});

huespedesRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));

  // Solo bloquea si tiene reservas NO canceladas. Las canceladas no cuentan.
  const activas = await db
    .select({ id: reservas.id })
    .from(reservas)
    .where(and(eq(reservas.huespedId, id), ne(reservas.estado, "cancelada")));
  if (activas.length > 0) {
    return c.json(
      { error: "en_uso", message: "El huésped tiene reservas activas." },
      409,
    );
  }

  const [antes] = await db.select().from(huespedes).where(eq(huespedes.id, id));
  await db.delete(reservas).where(eq(reservas.huespedId, id));
  const [row] = await db
    .delete(huespedes)
    .where(eq(huespedes.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrado" }, 404);
  await logAudit(c, {
    accion: "eliminar",
    entidad: "huespedes",
    entidadId: id,
    entidadLabel: antes?.nombre ?? String(id),
    diff: antes ? diffEliminar(antes as any, ["nombre", "documento", "email"]) : undefined,
  });
  return c.json({ ok: true });
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
