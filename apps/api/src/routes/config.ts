import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, eq, configClinica } from "@turnos/db";
import { configClinicaUpdate } from "@turnos/shared";
import { staff, adminOnly } from "../middleware/auth.js";
import { put, del } from "@vercel/blob";

export const configRoutes = new Hono();

// Configuración de la clínica (fila única id=1).
configRoutes.get("/", staff, async (c) => {
  const [row] = await db.select().from(configClinica).where(eq(configClinica.id, 1));
  return c.json(row ?? null);
});

// Modificar reglas de negocio: solo admin.
configRoutes.put("/", adminOnly, zValidator("json", configClinicaUpdate), async (c) => {
  const data = c.req.valid("json");
  const [row] = await db
    .update(configClinica)
    .set(data)
    .where(eq(configClinica.id, 1))
    .returning();
  if (!row) return c.json({ error: "Config no inicializada" }, 404);
  return c.json(row);
});

// Subir/reemplazar logo — recibe multipart/form-data con campo "file"
configRoutes.put("/logo", adminOnly, async (c) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return c.json({ error: "BLOB_READ_WRITE_TOKEN no configurado" }, 500);

  const form = await c.req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return c.json({ error: "Campo 'file' requerido" }, 400);
  }

  // Borrar logo anterior si existe
  const [current] = await db.select({ logoUrl: configClinica.logoUrl }).from(configClinica).where(eq(configClinica.id, 1));
  if (current?.logoUrl) {
    await del(current.logoUrl, { token }).catch(() => {});
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const nombre = `logos/${Date.now()}.${ext}`;
  const { url } = await put(nombre, file.stream(), {
    access: "public",
    contentType: file.type || "image/jpeg",
    token,
  });

  const [row] = await db
    .update(configClinica)
    .set({ logoUrl: url })
    .where(eq(configClinica.id, 1))
    .returning();
  return c.json({ url, config: row });
});
