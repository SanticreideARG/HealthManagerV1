import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, eq, config } from "@suites/db";
import { configUpdate } from "@suites/shared";

export const configRoutes = new Hono();

// Configuración del alojamiento (fila única id=1).
configRoutes.get("/", async (c) => {
  const [row] = await db.select().from(config).where(eq(config.id, 1));
  return c.json(row ?? null);
});

configRoutes.put("/", zValidator("json", configUpdate), async (c) => {
  const data = c.req.valid("json");
  const [row] = await db
    .update(config)
    .set(data)
    .where(eq(config.id, 1))
    .returning();
  if (!row) return c.json({ error: "Config no inicializada" }, 404);
  return c.json(row);
});
