import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  and,
  eq,
  gte,
  lt,
  ne,
  db,
  sql,
  habitaciones,
  huespedes,
  reservas,
  tareasHousekeeping,
  PG_EXCLUSION_VIOLATION,
} from "@suites/db";
import { reservaCreate, reservaUpdate, bloqueoCreate } from "@suites/shared";
import { calcularTotal } from "../calcularTarifa.js";
import { staff } from "../middleware/auth.js";
import { logAudit, computeDiff, diffEliminar } from "../lib/audit.js";

export const reservasRoutes = new Hono();
reservasRoutes.use("*", staff);

function esViolacionOverbooking(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === PG_EXCLUSION_VIOLATION
  );
}

// Listado, opcionalmente filtrado por rango de fechas (para el planner).
reservasRoutes.get("/", async (c) => {
  const desde = c.req.query("desde");
  const hasta = c.req.query("hasta");
  const conditions = [ne(reservas.estado, "cancelada")];
  if (desde) conditions.push(gte(reservas.checkout, desde));
  if (hasta) conditions.push(lt(reservas.checkin, hasta));

  const rows = await db
    .select({
      id: reservas.id,
      habitacionId: reservas.habitacionId,
      huespedId: reservas.huespedId,
      checkin: reservas.checkin,
      checkout: reservas.checkout,
      estado: reservas.estado,
      total: reservas.total,
      huesped: huespedes.nombre,
    })
    .from(reservas)
    // leftJoin: los bloqueos de mantenimiento no tienen huésped (huesped null).
    .leftJoin(huespedes, eq(reservas.huespedId, huespedes.id))
    .where(and(...conditions))
    .orderBy(reservas.checkin);

  return c.json(rows);
});

reservasRoutes.post("/", zValidator("json", reservaCreate), async (c) => {
  const data = c.req.valid("json");

  const [hab] = await db
    .select()
    .from(habitaciones)
    .where(eq(habitaciones.id, data.habitacionId));
  if (!hab) return c.json({ error: "Habitación inexistente" }, 404);

  // Total con tarifas dinámicas (suma noche a noche aplicando reglas).
  const { total } = await calcularTotal(
    Number(hab.tarifaBase),
    data.checkin,
    data.checkout,
  );

  // Si la reserva pisa fechas, el EXCLUDE aborta la sentencia → 409.
  // Caso A: huésped existente (huespedId) → insert simple.
  // Caso B: huésped nuevo → CTE atómico (alta huésped + reserva).
  try {
    let rows: unknown[];
    if (data.huespedId != null) {
      rows = (await sql`
        INSERT INTO reservas
          (habitacion_id, huesped_id, checkin, checkout, total, notas)
        VALUES (${data.habitacionId}, ${data.huespedId}, ${data.checkin},
                ${data.checkout}, ${total}, ${data.notas ?? null})
        RETURNING *;
      `) as unknown[];
    } else {
      const h = data.huesped!;
      rows = (await sql`
        WITH nuevo_huesped AS (
          INSERT INTO huespedes (nombre, documento, email, telefono, notas)
          VALUES (${h.nombre}, ${h.documento ?? null}, ${h.email ?? null},
                  ${h.telefono ?? null}, ${h.notas ?? null})
          RETURNING id
        )
        INSERT INTO reservas
          (habitacion_id, huesped_id, checkin, checkout, total, notas)
        SELECT ${data.habitacionId}, nuevo_huesped.id, ${data.checkin},
               ${data.checkout}, ${total}, ${data.notas ?? null}
        FROM nuevo_huesped
        RETURNING *;
      `) as unknown[];
    }
    const created = rows[0] as { id: number; checkin: string; checkout: string; huespedId?: number | null };
    await logAudit(c, {
      accion: "crear",
      entidad: "reservas",
      entidadId: created.id,
      entidadLabel: `Reserva #${created.id} (${data.checkin} → ${data.checkout})`,
      diff: { checkin: { antes: null, despues: data.checkin }, checkout: { antes: null, despues: data.checkout }, habitacionId: { antes: null, despues: data.habitacionId } },
    });
    return c.json(rows[0], 201);
  } catch (err) {
    if (esViolacionOverbooking(err)) {
      return c.json(
        {
          error: "overbooking",
          message: "Esas fechas ya están ocupadas para esta habitación.",
        },
        409,
      );
    }
    throw err;
  }
});

// Bloqueo de mantenimiento: "reserva" sin huésped, estado 'mantenimiento'.
// El EXCLUDE constraint lo trata igual que una reserva → no puede solapar.
reservasRoutes.post(
  "/mantenimiento",
  zValidator("json", bloqueoCreate),
  async (c) => {
    const data = c.req.valid("json");
    try {
      const [row] = await db
        .insert(reservas)
        .values({
          habitacionId: data.habitacionId,
          checkin: data.checkin,
          checkout: data.checkout,
          estado: "mantenimiento",
          notas: data.motivo ?? null,
        })
        .returning();
      await logAudit(c, {
        accion: "crear",
        entidad: "bloqueos",
        entidadId: row.id,
        entidadLabel: `Bloqueo #${row.id} (${data.checkin} → ${data.checkout})`,
        diff: { checkin: { antes: null, despues: data.checkin }, checkout: { antes: null, despues: data.checkout } },
      });
      return c.json(row, 201);
    } catch (err) {
      if (esViolacionOverbooking(err)) {
        return c.json(
          {
            error: "overbooking",
            message: "Esas fechas ya están ocupadas para esta habitación.",
          },
          409,
        );
      }
      throw err;
    }
  },
);

// Cotización: total estimado de una estadía con tarifas dinámicas (sin reservar).
reservasRoutes.get("/cotizar", async (c) => {
  const habitacionId = Number(c.req.query("habitacionId"));
  const checkin = c.req.query("checkin");
  const checkout = c.req.query("checkout");
  if (!habitacionId || !checkin || !checkout || checkout <= checkin) {
    return c.json({ error: "Parámetros inválidos" }, 400);
  }
  const [hab] = await db
    .select()
    .from(habitaciones)
    .where(eq(habitaciones.id, habitacionId));
  if (!hab) return c.json({ error: "Habitación inexistente" }, 404);

  const tarifaBase = Number(hab.tarifaBase);
  const { total, noches } = await calcularTotal(tarifaBase, checkin, checkout);
  return c.json({ habitacionId, checkin, checkout, noches, tarifaBase, total });
});

reservasRoutes.patch("/:id", zValidator("json", reservaUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const data = c.req.valid("json");

  const [antes] = await db.select().from(reservas).where(eq(reservas.id, id));
  if (!antes) return c.json({ error: "No encontrada" }, 404);

  let total: string | undefined;
  if (data.checkin || data.checkout) {
    const checkin = data.checkin ?? antes.checkin;
    const checkout = data.checkout ?? antes.checkout;
    const [hab] = await db.select().from(habitaciones).where(eq(habitaciones.id, antes.habitacionId));
    const calc = await calcularTotal(Number(hab?.tarifaBase ?? 0), checkin, checkout);
    total = String(calc.total);
  }

  try {
    const [row] = await db
      .update(reservas)
      .set({ ...data, ...(total !== undefined ? { total } : {}) })
      .where(eq(reservas.id, id))
      .returning();
    if (!row) return c.json({ error: "No encontrada" }, 404);
    await logAudit(c, {
      accion: "editar",
      entidad: "reservas",
      entidadId: id,
      entidadLabel: `Reserva #${id} (${row.checkin} → ${row.checkout})`,
      diff: computeDiff(antes as any, row as any, ["estado", "checkin", "checkout", "notas", "total"]),
    });
    return c.json(row);
  } catch (err) {
    if (esViolacionOverbooking(err)) {
      return c.json({ error: "overbooking", message: "Las nuevas fechas se solapan." }, 409);
    }
    throw err;
  }
});

// Check-in
reservasRoutes.post("/:id/checkin", async (c) => {
  const id = Number(c.req.param("id"));
  // Payload como variable (no objeto literal) a propósito: la inferencia de
  // tipos de Drizzle sobre la tabla puede degradarse en algunos entornos de
  // build (p.ej. Vercel) y disparar un falso "excess property" sobre el
  // literal. Con una variable se chequea por asignabilidad estructural y el
  // runtime es idéntico.
  const cambios = { estado: "ocupada" as const, checkinAt: new Date() };
  const [row] = await db
    .update(reservas)
    .set(cambios)
    .where(eq(reservas.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  await logAudit(c, {
    accion: "editar",
    entidad: "reservas",
    entidadId: id,
    entidadLabel: `Reserva #${id} — Check-in`,
    diff: { estado: { antes: "reservada", despues: "ocupada" } },
  });
  return c.json(row);
});

// Check-out
reservasRoutes.post("/:id/checkout", async (c) => {
  const id = Number(c.req.param("id"));
  const cambios = { estado: "checkout" as const, checkoutAt: new Date() };
  const [row] = await db
    .update(reservas)
    .set(cambios)
    .where(eq(reservas.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);

  await db.insert(tareasHousekeeping).values({
    habitacionId: row.habitacionId,
    reservaId: id,
    tipo: "limpieza",
    prioridad: "alta",
    fechaProgramada: row.checkout,
    descripcion: "Limpieza post check-out",
  } as any);

  await logAudit(c, {
    accion: "editar",
    entidad: "reservas",
    entidadId: id,
    entidadLabel: `Reserva #${id} — Check-out`,
    diff: { estado: { antes: "ocupada", despues: "checkout" } },
  });
  return c.json(row);
});

// Cancelar
reservasRoutes.post("/:id/cancelar", async (c) => {
  const id = Number(c.req.param("id"));
  const [antes] = await db.select().from(reservas).where(eq(reservas.id, id));
  const cambios = { estado: "cancelada" as const };
  const [row] = await db
    .update(reservas)
    .set(cambios)
    .where(eq(reservas.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  await logAudit(c, {
    accion: "eliminar",
    entidad: "reservas",
    entidadId: id,
    entidadLabel: `Reserva #${id} (${row.checkin} → ${row.checkout})`,
    diff: { estado: { antes: antes?.estado ?? null, despues: "cancelada" } },
  });
  return c.json(row);
});
