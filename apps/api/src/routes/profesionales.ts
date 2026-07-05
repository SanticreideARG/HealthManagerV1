import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  db,
  eq,
  and,
  profesionales,
  profesionalObrasSociales,
  obrasSociales,
  ventanasRecurrentes,
  ventanasExcepciones,
} from "@turnos/db";
import {
  profesionalCreate,
  profesionalUpdate,
  ventanaRecurrenteCreate,
  ventanaRecurrenteUpdate,
  ventanaExcepcionCreate,
} from "@turnos/shared";
import { staff, adminOnly, profesionalOrStaff } from "../middleware/auth.js";
import { auth } from "../auth.js";
import { logAudit, computeDiff } from "../lib/audit.js";

export const profesionalesRoutes = new Hono();

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Un profesional gestiona sus propias ventanas; staff (admin/administrativo)
 * gestiona las de cualquiera. Devuelve el rol y, si aplica, el profesionalId
 * propio para el chequeo de pertenencia.
 */
async function puedeGestionarProfesional(
  c: Parameters<typeof auth.api.getSession>[0] extends never ? never : any,
  profesionalId: number,
): Promise<boolean> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role === "admin" || role === "administrativo") return true;
  if (role === "profesional" && session) {
    const [propio] = await db
      .select({ id: profesionales.id })
      .from(profesionales)
      .where(eq(profesionales.authUserId, session.user.id));
    return propio?.id === profesionalId;
  }
  return false;
}

// ---------- Profesionales (ABM: admin) ----------

profesionalesRoutes.get("/", staff, async (c) => {
  const rows = await db.select().from(profesionales).orderBy(profesionales.nombre);

  const osRows = await db
    .select({
      profesionalId: profesionalObrasSociales.profesionalId,
      id: obrasSociales.id,
      nombre: obrasSociales.nombre,
    })
    .from(profesionalObrasSociales)
    .innerJoin(obrasSociales, eq(profesionalObrasSociales.obraSocialId, obrasSociales.id));

  const osPorProfesional = new Map<number, { id: number; nombre: string }[]>();
  for (const os of osRows) {
    const lista = osPorProfesional.get(os.profesionalId) ?? [];
    lista.push({ id: os.id, nombre: os.nombre });
    osPorProfesional.set(os.profesionalId, lista);
  }

  return c.json(
    rows.map((p) => ({ ...p, obrasSociales: osPorProfesional.get(p.id) ?? [] })),
  );
});

profesionalesRoutes.post("/", adminOnly, zValidator("json", profesionalCreate), async (c) => {
  const { obraSocialIds, ...data } = c.req.valid("json");
  const [row] = await db.insert(profesionales).values(data).returning();
  if (!row) return c.json({ error: "No se pudo crear" }, 500);
  if (obraSocialIds?.length) {
    await db
      .insert(profesionalObrasSociales)
      .values(obraSocialIds.map((obraSocialId) => ({ profesionalId: row.id, obraSocialId })));
  }
  await logAudit(c, {
    accion: "crear",
    entidad: "profesionales",
    entidadId: row.id,
    entidadLabel: row.nombre,
  });
  return c.json(row, 201);
});

profesionalesRoutes.patch("/:id", adminOnly, zValidator("json", profesionalUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const { obraSocialIds, ...data } = c.req.valid("json");

  const [antes] = await db.select().from(profesionales).where(eq(profesionales.id, id));
  if (!antes) return c.json({ error: "No encontrado" }, 404);

  const [row] = await db.update(profesionales).set(data).where(eq(profesionales.id, id)).returning();
  if (!row) return c.json({ error: "No encontrado" }, 404);

  if (obraSocialIds !== undefined) {
    await db.delete(profesionalObrasSociales).where(eq(profesionalObrasSociales.profesionalId, id));
    if (obraSocialIds.length) {
      await db
        .insert(profesionalObrasSociales)
        .values(obraSocialIds.map((obraSocialId) => ({ profesionalId: id, obraSocialId })));
    }
  }

  await logAudit(c, {
    accion: "editar",
    entidad: "profesionales",
    entidadId: id,
    entidadLabel: row.nombre,
    diff: computeDiff(antes, row, ["nombre", "especialidad", "activo", "ubicacion", "color"]),
  });
  return c.json(row);
});

// Baja lógica: hay ventanas/turnos que referencian al profesional.
profesionalesRoutes.delete("/:id", adminOnly, async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db
    .update(profesionales)
    .set({ activo: false })
    .where(eq(profesionales.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrado" }, 404);
  await logAudit(c, {
    accion: "eliminar",
    entidad: "profesionales",
    entidadId: id,
    entidadLabel: row.nombre,
  });
  return c.json({ ok: true });
});

// ---------- Ventanas de trabajo (recurrentes + excepciones) ----------

profesionalesRoutes.get("/:id/ventanas", profesionalOrStaff, async (c) => {
  const id = Number(c.req.param("id"));
  if (!(await puedeGestionarProfesional(c, id))) {
    return c.json({ error: "forbidden", message: "No tenés permiso sobre este profesional." }, 403);
  }
  const recurrentes = await db
    .select()
    .from(ventanasRecurrentes)
    .where(eq(ventanasRecurrentes.profesionalId, id))
    .orderBy(ventanasRecurrentes.diaSemana, ventanasRecurrentes.horaInicio);
  const excepciones = await db
    .select()
    .from(ventanasExcepciones)
    .where(eq(ventanasExcepciones.profesionalId, id))
    .orderBy(ventanasExcepciones.fecha);
  return c.json({ recurrentes, excepciones });
});

profesionalesRoutes.post(
  "/:id/ventanas",
  profesionalOrStaff,
  zValidator("json", ventanaRecurrenteCreate),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (!(await puedeGestionarProfesional(c, id))) {
      return c.json({ error: "forbidden", message: "No tenés permiso sobre este profesional." }, 403);
    }
    const data = c.req.valid("json");
    if (data.profesionalId !== id) {
      return c.json({ error: "profesionalId no coincide con la URL" }, 400);
    }
    const [row] = await db
      .insert(ventanasRecurrentes)
      .values({ ...data, vigenciaDesde: data.vigenciaDesde ?? hoyISO() })
      .returning();
    if (!row) return c.json({ error: "No se pudo crear" }, 500);
    await logAudit(c, {
      accion: "crear",
      entidad: "ventanas",
      entidadId: row.id,
      entidadLabel: `Ventana profesional #${id} — día ${data.diaSemana} ${data.horaInicio}-${data.horaFin}`,
    });
    return c.json(row, 201);
  },
);

profesionalesRoutes.patch(
  "/:id/ventanas/:ventanaId",
  profesionalOrStaff,
  zValidator("json", ventanaRecurrenteUpdate),
  async (c) => {
    const id = Number(c.req.param("id"));
    const ventanaId = Number(c.req.param("ventanaId"));
    if (!(await puedeGestionarProfesional(c, id))) {
      return c.json({ error: "forbidden", message: "No tenés permiso sobre este profesional." }, 403);
    }
    const data = c.req.valid("json");
    const [row] = await db
      .update(ventanasRecurrentes)
      .set(data)
      .where(and(eq(ventanasRecurrentes.id, ventanaId), eq(ventanasRecurrentes.profesionalId, id)))
      .returning();
    if (!row) return c.json({ error: "No encontrada" }, 404);
    await logAudit(c, {
      accion: "editar",
      entidad: "ventanas",
      entidadId: ventanaId,
      entidadLabel: `Ventana profesional #${id}`,
    });
    return c.json(row);
  },
);

profesionalesRoutes.delete("/:id/ventanas/:ventanaId", profesionalOrStaff, async (c) => {
  const id = Number(c.req.param("id"));
  const ventanaId = Number(c.req.param("ventanaId"));
  if (!(await puedeGestionarProfesional(c, id))) {
    return c.json({ error: "forbidden", message: "No tenés permiso sobre este profesional." }, 403);
  }
  const [row] = await db
    .delete(ventanasRecurrentes)
    .where(and(eq(ventanasRecurrentes.id, ventanaId), eq(ventanasRecurrentes.profesionalId, id)))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  await logAudit(c, {
    accion: "eliminar",
    entidad: "ventanas",
    entidadId: ventanaId,
    entidadLabel: `Ventana profesional #${id}`,
  });
  return c.json({ ok: true });
});

profesionalesRoutes.post(
  "/:id/excepciones",
  profesionalOrStaff,
  zValidator("json", ventanaExcepcionCreate),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (!(await puedeGestionarProfesional(c, id))) {
      return c.json({ error: "forbidden", message: "No tenés permiso sobre este profesional." }, 403);
    }
    const data = c.req.valid("json");
    if (data.profesionalId !== id) {
      return c.json({ error: "profesionalId no coincide con la URL" }, 400);
    }
    const [row] = await db.insert(ventanasExcepciones).values(data).returning();
    if (!row) return c.json({ error: "No se pudo crear" }, 500);
    await logAudit(c, {
      accion: "crear",
      entidad: "ventanas_excepciones",
      entidadId: row.id,
      entidadLabel: `Excepción profesional #${id} — ${data.fecha} (${data.tipo})`,
    });
    return c.json(row, 201);
  },
);

profesionalesRoutes.delete("/:id/excepciones/:excepcionId", profesionalOrStaff, async (c) => {
  const id = Number(c.req.param("id"));
  const excepcionId = Number(c.req.param("excepcionId"));
  if (!(await puedeGestionarProfesional(c, id))) {
    return c.json({ error: "forbidden", message: "No tenés permiso sobre este profesional." }, 403);
  }
  const [row] = await db
    .delete(ventanasExcepciones)
    .where(and(eq(ventanasExcepciones.id, excepcionId), eq(ventanasExcepciones.profesionalId, id)))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  await logAudit(c, {
    accion: "eliminar",
    entidad: "ventanas_excepciones",
    entidadId: excepcionId,
    entidadLabel: `Excepción profesional #${id}`,
  });
  return c.json({ ok: true });
});
