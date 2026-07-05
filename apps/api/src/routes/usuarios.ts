import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, authUser, desc, eq } from "@turnos/db";
import { adminOnly } from "../middleware/auth.js";
import { auth } from "../auth.js";
import { logAudit } from "../lib/audit.js";

/** Gestión de usuarios del sistema (solo admin). */
export const usuariosRoutes = new Hono();
usuariosRoutes.use("*", adminOnly);

const rolUpdate = z.object({ role: z.enum(["admin", "profesional", "administrativo", "paciente"]) });

usuariosRoutes.get("/", async (c) => {
  const rows = await db
    .select({
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      role: authUser.role,
      createdAt: authUser.createdAt,
    })
    .from(authUser)
    .orderBy(desc(authUser.createdAt));
  return c.json(rows);
});

usuariosRoutes.patch("/:id", zValidator("json", rolUpdate), async (c) => {
  const id = c.req.param("id");
  const { role } = c.req.valid("json");
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (session?.user?.id === id) {
    return c.json(
      { error: "self", message: "No podés cambiar tu propio rol." },
      400,
    );
  }
  const [row] = await db
    .update(authUser)
    .set({ role })
    .where(eq(authUser.id, id))
    .returning({
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      role: authUser.role,
      createdAt: authUser.createdAt,
    });
  if (!row) return c.json({ error: "No encontrado" }, 404);
  await logAudit(c, {
    accion: "editar",
    entidad: "usuarios",
    entidadId: id,
    entidadLabel: row.name,
    diff: { role: { antes: null, despues: role } },
  });
  return c.json(row);
});

usuariosRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (session?.user?.id === id) {
    return c.json(
      { error: "self", message: "No podés eliminar tu propia cuenta." },
      400,
    );
  }
  const [row] = await db
    .delete(authUser)
    .where(eq(authUser.id, id))
    .returning({ id: authUser.id });
  if (!row) return c.json({ error: "No encontrado" }, 404);
  return c.json({ ok: true });
});
