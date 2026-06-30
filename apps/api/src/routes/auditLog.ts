import { Hono } from "hono";
import { db, auditLog, desc, and, eq, gte, lte, drizzleSql } from "@suites/db";
import { adminOnly } from "../middleware/auth.js";

export const auditLogRoutes = new Hono();
auditLogRoutes.use("*", adminOnly);

const PAGE_SIZE = 50;

auditLogRoutes.get("/", async (c) => {
  const q       = c.req.query("q")       ?? "";
  const userId  = c.req.query("userId")  ?? "";
  const entidad = c.req.query("entidad") ?? "";
  const accion  = c.req.query("accion")  ?? "";
  const desde   = c.req.query("desde")   ?? "";
  const hasta   = c.req.query("hasta")   ?? "";
  const page    = Math.max(1, Number(c.req.query("page") ?? "1"));

  const conditions = [];

  if (userId)  conditions.push(eq(auditLog.userId, userId));
  if (entidad) conditions.push(eq(auditLog.entidad, entidad));
  if (accion)  conditions.push(eq(auditLog.accion, accion));
  if (desde)   conditions.push(gte(auditLog.timestamp, new Date(desde)));
  if (hasta) {
    const hastaDate = new Date(hasta);
    hastaDate.setHours(23, 59, 59, 999);
    conditions.push(lte(auditLog.timestamp, hastaDate));
  }
  if (q) {
    conditions.push(
      drizzleSql`to_tsvector('spanish',
        coalesce(${auditLog.userName},'') || ' ' ||
        coalesce(${auditLog.userEmail},'') || ' ' ||
        coalesce(${auditLog.entidadLabel},'') || ' ' ||
        coalesce(${auditLog.entidad},'')
      ) @@ plainto_tsquery('spanish', ${q})`,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: drizzleSql<number>`count(*)::int` })
    .from(auditLog)
    .where(where);

  const items = await db
    .select()
    .from(auditLog)
    .where(where)
    .orderBy(desc(auditLog.timestamp))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return c.json({ items, total, page, pageSize: PAGE_SIZE });
});

// Purga manual: elimina entradas con más de 6 meses
auditLogRoutes.post("/purge", async (c) => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  const result = await db
    .delete(auditLog)
    .where(lte(auditLog.timestamp, cutoff))
    .returning({ id: auditLog.id });
  return c.json({ eliminados: result.length });
});
