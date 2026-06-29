import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { desc, db, eq, metodosPago, pagos } from "@suites/db";
import { pagoRegistrar } from "@suites/shared";
import { staff } from "../middleware/auth.js";

export const pagosRoutes = new Hono();
pagosRoutes.use("*", staff);

// Pagos de una reserva
pagosRoutes.get("/", async (c) => {
  const reservaId = Number(c.req.query("reservaId"));
  if (!reservaId) return c.json({ error: "reservaId requerido" }, 400);

  const rows = await db
    .select({
      id: pagos.id,
      reservaId: pagos.reservaId,
      metodoId: pagos.metodoId,
      metodoPago: metodosPago.nombre,
      monto: pagos.monto,
      montoBase: pagos.montoBase,
      montoExtras: pagos.montoExtras,
      referencia: pagos.referencia,
      notas: pagos.notas,
      fecha: pagos.fecha,
    })
    .from(pagos)
    .leftJoin(metodosPago, eq(pagos.metodoId, metodosPago.id))
    .where(eq(pagos.reservaId, reservaId))
    .orderBy(desc(pagos.fecha));

  return c.json(rows);
});

// Registrar pago
pagosRoutes.post("/", zValidator("json", pagoRegistrar), async (c) => {
  const data = c.req.valid("json");

  const [metodo] = await db
    .select()
    .from(metodosPago)
    .where(eq(metodosPago.id, data.metodoId));
  if (!metodo) return c.json({ error: "Método de pago no encontrado" }, 404);

  const montoBase = data.montoBase;
  const montoExtras = data.montoExtras ?? 0;
  const recargo = Number(metodo.recargoPct);
  const subtotal = montoBase + montoExtras;
  const monto = Math.round(subtotal * (1 + recargo / 100) * 100) / 100;

  // Compatibilidad con el enum legacy: mapear tipo → efectivo/transferencia
  const metodoLegacy =
    metodo.tipo === "efectivo" ? ("efectivo" as const) : ("transferencia" as const);

  const [row] = await db
    .insert(pagos)
    .values({
      reservaId: data.reservaId,
      metodo: metodoLegacy,
      metodoId: data.metodoId,
      monto: String(monto),
      montoBase: String(montoBase),
      montoExtras: String(montoExtras),
      referencia: data.referencia ?? null,
      notas: data.notas ?? null,
    })
    .returning();

  return c.json({ ...row, metodoPago: metodo.nombre }, 201);
});
