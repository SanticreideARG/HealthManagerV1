import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  db, tareasHousekeeping, habitaciones,
  eq, and, gte, lt, asc,
} from "@suites/db";
import { tareaHousekeepingCreate, tareaHousekeepingUpdate } from "@suites/shared";
import { staff, adminOnly } from "../middleware/auth.js";

export const housekeepingRoutes = new Hono();

// GET /housekeeping?estado=&habitacionId=&desde=&hasta=
housekeepingRoutes.get("/", staff, async (c) => {
  const estado      = c.req.query("estado");
  const habitacionId = c.req.query("habitacionId");
  const desde       = c.req.query("desde");
  const hasta       = c.req.query("hasta");

  const conds: ReturnType<typeof eq>[] = [];
  if (estado)       conds.push(eq(tareasHousekeeping.estado,       estado));
  if (habitacionId) conds.push(eq(tareasHousekeeping.habitacionId, Number(habitacionId)));
  if (desde)        conds.push(gte(tareasHousekeeping.fechaProgramada, desde));
  if (hasta)        conds.push(lt(tareasHousekeeping.fechaProgramada,  hasta));

  const rows = await db
    .select({
      id:              tareasHousekeeping.id,
      habitacionId:    tareasHousekeeping.habitacionId,
      habitacionNombre: habitaciones.nombre,
      reservaId:       tareasHousekeeping.reservaId,
      tipo:            tareasHousekeeping.tipo,
      descripcion:     tareasHousekeeping.descripcion,
      prioridad:       tareasHousekeeping.prioridad,
      estado:          tareasHousekeeping.estado,
      fechaProgramada: tareasHousekeeping.fechaProgramada,
      asignadoA:       tareasHousekeeping.asignadoA,
      notas:           tareasHousekeeping.notas,
      completadoAt:    tareasHousekeeping.completadoAt,
      createdAt:       tareasHousekeeping.createdAt,
    })
    .from(tareasHousekeeping)
    .leftJoin(habitaciones, eq(tareasHousekeeping.habitacionId, habitaciones.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(tareasHousekeeping.fechaProgramada), asc(tareasHousekeeping.id));

  return c.json(rows);
});

// POST /housekeeping
housekeepingRoutes.post(
  "/",
  staff,
  zValidator("json", tareaHousekeepingCreate),
  async (c) => {
    const data = c.req.valid("json");
    const [row] = await db
      .insert(tareasHousekeeping)
      .values(data as any)
      .returning();
    // Attach habitacionNombre
    const [hab] = await db
      .select({ nombre: habitaciones.nombre })
      .from(habitaciones)
      .where(eq(habitaciones.id, row.habitacionId));
    return c.json({ ...row, habitacionNombre: hab?.nombre ?? null }, 201);
  },
);

// PATCH /housekeeping/:id
housekeepingRoutes.patch(
  "/:id",
  staff,
  zValidator("json", tareaHousekeepingUpdate),
  async (c) => {
    const id   = Number(c.req.param("id"));
    const data = c.req.valid("json");

    const cambios: Record<string, unknown> = { ...data };
    if (data.estado === "completado")  cambios.completadoAt = new Date();
    if (data.estado === "pendiente" || data.estado === "en_proceso") {
      cambios.completadoAt = null;
    }

    const [row] = await db
      .update(tareasHousekeeping)
      .set(cambios as any)
      .where(eq(tareasHousekeeping.id, id))
      .returning();
    if (!row) return c.json({ error: "No encontrada" }, 404);

    const [hab] = await db
      .select({ nombre: habitaciones.nombre })
      .from(habitaciones)
      .where(eq(habitaciones.id, row.habitacionId));
    return c.json({ ...row, habitacionNombre: hab?.nombre ?? null });
  },
);

// DELETE /housekeeping/:id
housekeepingRoutes.delete("/:id", adminOnly, async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db
    .delete(tareasHousekeeping)
    .where(eq(tareasHousekeeping.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  return c.json({ ok: true });
});
