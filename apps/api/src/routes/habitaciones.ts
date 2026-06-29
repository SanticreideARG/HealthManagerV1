import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, eq, habitaciones, habitacionAmenidades, habitacionFotos } from "@suites/db";
import { habitacionCreate, habitacionUpdate } from "@suites/shared";
import { staff, adminOnly } from "../middleware/auth.js";
import { getHabitacionAmenidades, habitacionAmenidadesSet } from "./amenidades.js";
import { put, del } from "@vercel/blob";
import { z } from "zod";

export const habitacionesRoutes = new Hono();
habitacionesRoutes.use("*", staff); // ver: admin + gestor; ABM: solo admin

habitacionesRoutes.get("/", async (c) => {
  const rows = await db.select().from(habitaciones).orderBy(habitaciones.id);
  return c.json(rows);
});

habitacionesRoutes.post("/", adminOnly, zValidator("json", habitacionCreate), async (c) => {
  const data = c.req.valid("json");
  // El payload ya está validado por Zod (habitacionCreate) → runtime seguro.
  // `as any` a propósito: la inferencia de tipos de Drizzle se degrada en el
  // tsc del build de Vercel (incluido $inferInsert), por lo que cualquier cast
  // tipado también falla. Con `any` compila siempre; el runtime no cambia.
  const values = { ...data, tarifaBase: String(data.tarifaBase) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [row] = await db
    .insert(habitaciones)
    .values(values as any)
    .returning();
  return c.json(row, 201);
});

habitacionesRoutes.patch(
  "/:id",
  adminOnly,
  zValidator("json", habitacionUpdate),
  async (c) => {
    const id = Number(c.req.param("id"));
    const { tarifaBase, ...resto } = c.req.valid("json");
    const [row] = await db
      .update(habitaciones)
      .set({
        ...resto,
        ...(tarifaBase !== undefined ? { tarifaBase: String(tarifaBase) } : {}),
      })
      .where(eq(habitaciones.id, id))
      .returning();
    if (!row) return c.json({ error: "No encontrada" }, 404);
    return c.json(row);
  },
);

// Amenidades de una habitación concreta
habitacionesRoutes.get("/:id/amenidades", async (c) => {
  const id = Number(c.req.param("id"));
  return c.json(await getHabitacionAmenidades(id));
});

habitacionesRoutes.put(
  "/:id/amenidades",
  adminOnly,
  zValidator("json", habitacionAmenidadesSet),
  async (c) => {
    const id = Number(c.req.param("id"));
    const data = c.req.valid("json");
    await db
      .delete(habitacionAmenidades)
      .where(eq(habitacionAmenidades.habitacionId, id));
    if (data.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.insert(habitacionAmenidades).values(
        data.map((a) => ({
          habitacionId: id,
          amenidadId: a.amenidadId,
          valor: a.valor ?? null,
        })) as any,
      );
    }
    return c.json(await getHabitacionAmenidades(id));
  },
);

// ---------- Fotos ----------
habitacionesRoutes.get("/:id/fotos", async (c) => {
  const id = Number(c.req.param("id"));
  const rows = await db
    .select()
    .from(habitacionFotos)
    .where(eq(habitacionFotos.habitacionId, id))
    .orderBy(habitacionFotos.orden);
  return c.json(rows);
});

habitacionesRoutes.post("/:id/fotos", adminOnly, async (c) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return c.json({ error: "BLOB_READ_WRITE_TOKEN no configurado" }, 500);

  const id = Number(c.req.param("id"));
  const form = await c.req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return c.json({ error: "Campo 'file' requerido" }, 400);
  }

  const existentes = await db
    .select({ id: habitacionFotos.id })
    .from(habitacionFotos)
    .where(eq(habitacionFotos.habitacionId, id));
  const siguienteOrden = existentes.length;

  const ext = file.name.split(".").pop() ?? "jpg";
  const nombre = `habitaciones/${id}/${Date.now()}.${ext}`;
  const { url } = await put(nombre, file.stream(), {
    access: "public",
    contentType: file.type || "image/jpeg",
    token,
  });

  const [row] = await db
    .insert(habitacionFotos)
    .values({ habitacionId: id, url, orden: siguienteOrden } as any)
    .returning();
  return c.json(row, 201);
});

habitacionesRoutes.delete("/:id/fotos/:fotoId", adminOnly, async (c) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return c.json({ error: "BLOB_READ_WRITE_TOKEN no configurado" }, 500);

  const fotoId = Number(c.req.param("fotoId"));
  const [foto] = await db
    .select()
    .from(habitacionFotos)
    .where(eq(habitacionFotos.id, fotoId));
  if (!foto) return c.json({ error: "No encontrada" }, 404);

  await del(foto.url, { token }).catch(() => {});
  await db.delete(habitacionFotos).where(eq(habitacionFotos.id, fotoId));
  return c.json({ ok: true });
});

const ordenSchema = z.object({ ids: z.array(z.number()) });

habitacionesRoutes.patch("/:id/fotos/orden", adminOnly, zValidator("json", ordenSchema), async (c) => {
  const data = c.req.valid("json");
  for (let i = 0; i < data.ids.length; i++) {
    const fid = data.ids[i];
    if (fid === undefined) continue;
    await db
      .update(habitacionFotos)
      .set({ orden: i })
      .where(eq(habitacionFotos.id, fid));
  }
  const id = Number(c.req.param("id"));
  const rows = await db
    .select()
    .from(habitacionFotos)
    .where(eq(habitacionFotos.habitacionId, id))
    .orderBy(habitacionFotos.orden);
  return c.json(rows);
});

habitacionesRoutes.delete("/:id", adminOnly, async (c) => {
  const id = Number(c.req.param("id"));
  try {
    const [row] = await db
      .delete(habitaciones)
      .where(eq(habitaciones.id, id))
      .returning();
    if (!row) return c.json({ error: "No encontrada" }, 404);
    return c.json({ ok: true });
  } catch (err) {
    // 23503 = foreign_key_violation (tiene reservas asociadas)
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23503"
    ) {
      return c.json(
        {
          error: "en_uso",
          message:
            "No se puede eliminar: la habitación tiene reservas asociadas.",
        },
        409,
      );
    }
    throw err;
  }
});
