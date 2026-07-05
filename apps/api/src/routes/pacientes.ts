import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, eq, desc, drizzleSql, pacientes, obrasSociales } from "@turnos/db";
import { pacienteCreate, pacienteUpdate } from "@turnos/shared";
import { staff } from "../middleware/auth.js";
import { logAudit, computeDiff } from "../lib/audit.js";

export const pacientesRoutes = new Hono();
pacientesRoutes.use("*", staff);

pacientesRoutes.get("/", async (c) => {
  const q = c.req.query("q")?.trim();

  const rows = await db
    .select({
      id: pacientes.id,
      nombre: pacientes.nombre,
      documento: pacientes.documento,
      tipoDocumento: pacientes.tipoDocumento,
      fechaNacimiento: pacientes.fechaNacimiento,
      email: pacientes.email,
      telefono: pacientes.telefono,
      obraSocialId: pacientes.obraSocialId,
      obraSocialNombre: obrasSociales.nombre,
      nroAfiliado: pacientes.nroAfiliado,
      notas: pacientes.notas,
      createdAt: pacientes.createdAt,
    })
    .from(pacientes)
    .leftJoin(obrasSociales, eq(pacientes.obraSocialId, obrasSociales.id))
    .where(
      q
        ? drizzleSql`(${pacientes.nombre} ILIKE ${"%" + q + "%"} OR ${pacientes.documento} ILIKE ${"%" + q + "%"})`
        : undefined,
    )
    .orderBy(desc(pacientes.createdAt));

  return c.json(rows);
});

pacientesRoutes.post("/", zValidator("json", pacienteCreate), async (c) => {
  const data = c.req.valid("json");
  const [row] = await db.insert(pacientes).values(data).returning();
  if (!row) return c.json({ error: "No se pudo crear" }, 500);
  await logAudit(c, {
    accion: "crear",
    entidad: "pacientes",
    entidadId: row.id,
    entidadLabel: row.nombre,
  });
  return c.json(row, 201);
});

pacientesRoutes.patch("/:id", zValidator("json", pacienteUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const data = c.req.valid("json");

  const [antes] = await db.select().from(pacientes).where(eq(pacientes.id, id));
  if (!antes) return c.json({ error: "No encontrado" }, 404);

  const [row] = await db.update(pacientes).set(data).where(eq(pacientes.id, id)).returning();
  if (!row) return c.json({ error: "No encontrado" }, 404);

  await logAudit(c, {
    accion: "editar",
    entidad: "pacientes",
    entidadId: id,
    entidadLabel: row.nombre,
    diff: computeDiff(antes, row, ["nombre", "documento", "email", "telefono", "obraSocialId", "nroAfiliado"]),
  });
  return c.json(row);
});

pacientesRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  try {
    const [row] = await db.delete(pacientes).where(eq(pacientes.id, id)).returning();
    if (!row) return c.json({ error: "No encontrado" }, 404);
    await logAudit(c, {
      accion: "eliminar",
      entidad: "pacientes",
      entidadId: id,
      entidadLabel: row.nombre,
    });
    return c.json({ ok: true });
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "23503") {
      return c.json(
        { error: "en_uso", message: "No se puede eliminar: el paciente tiene turnos asociados." },
        409,
      );
    }
    throw err;
  }
});
