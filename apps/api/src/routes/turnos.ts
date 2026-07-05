import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  db,
  sql,
  eq,
  and,
  ne,
  gte,
  lt,
  profesionales,
  profesionalObrasSociales,
  pacientes,
  configClinica,
  ventanasRecurrentes,
  ventanasExcepciones,
  turnos,
  PG_EXCLUSION_VIOLATION,
} from "@turnos/db";
import { turnoCreate, bloqueoCreate } from "@turnos/shared";
import { profesionalOrStaff, staff } from "../middleware/auth.js";
import { puedeGestionarProfesional } from "../lib/profesionalPropio.js";
import { logAudit } from "../lib/audit.js";
import { calcularDisponibilidad, turnoDentroDeVentana } from "../disponibilidad.js";
import type { ExcepcionInput } from "../disponibilidad.js";

export const turnosRoutes = new Hono();

/** Argentina no tiene horario de verano: offset fijo. */
const OFFSET_MS_AR = 3 * 60 * 60 * 1000;

/** "YYYY-MM-DD" en hora de Argentina, a partir de un instante ISO. */
function fechaArDe(iso: string): string {
  return new Date(new Date(iso).getTime() - OFFSET_MS_AR).toISOString().slice(0, 10);
}

/** "HH:MM" en hora de Argentina, a partir de un instante ISO. */
function horaArDe(iso: string): string {
  return new Date(new Date(iso).getTime() - OFFSET_MS_AR).toISOString().slice(11, 16);
}

/** Rango UTC [desde, hasta) que cubre un día calendario completo en hora de Argentina. */
function rangoUtcDelDiaAr(fecha: string): { desde: Date; hasta: Date } {
  const desde = new Date(`${fecha}T00:00:00-03:00`);
  return { desde, hasta: new Date(desde.getTime() + 24 * 60 * 60 * 1000) };
}

function esViolacionOverbooking(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === PG_EXCLUSION_VIOLATION
  );
}

async function resolverDuracionFallback(profesionalId: number): Promise<number> {
  const [prof] = await db
    .select({ duracionTurnoDefault: profesionales.duracionTurnoDefault })
    .from(profesionales)
    .where(eq(profesionales.id, profesionalId));
  if (prof?.duracionTurnoDefault) return prof.duracionTurnoDefault;
  const [config] = await db.select({ duracionDefault: configClinica.duracionDefault }).from(configClinica);
  return config?.duracionDefault ?? 30;
}

/**
 * Si la obra social del paciente no está entre las que acepta el profesional
 * (o no tiene obra social), el turno es particular. Se calcula server-side —
 * no se confía en lo que mande el cliente.
 */
async function resolverEsParticular(profesionalId: number, obraSocialId: number | null): Promise<boolean> {
  if (obraSocialId == null) return true;
  const [match] = await db
    .select({ obraSocialId: profesionalObrasSociales.obraSocialId })
    .from(profesionalObrasSociales)
    .where(
      and(
        eq(profesionalObrasSociales.profesionalId, profesionalId),
        eq(profesionalObrasSociales.obraSocialId, obraSocialId),
      ),
    );
  return !match;
}

// ---------- Disponibilidad ----------

turnosRoutes.get("/disponibilidad", profesionalOrStaff, async (c) => {
  const profesionalId = Number(c.req.query("profesionalId"));
  const fecha = c.req.query("fecha");
  if (!profesionalId || !fecha) {
    return c.json({ error: "Faltan parámetros: profesionalId y fecha" }, 400);
  }
  if (!(await puedeGestionarProfesional(c, profesionalId))) {
    return c.json({ error: "forbidden", message: "No tenés permiso sobre este profesional." }, 403);
  }

  const [recurrentes, excepciones, duracionFallback, ocupados] = await Promise.all([
    db.select().from(ventanasRecurrentes).where(eq(ventanasRecurrentes.profesionalId, profesionalId)),
    db
      .select()
      .from(ventanasExcepciones)
      .where(and(eq(ventanasExcepciones.profesionalId, profesionalId), eq(ventanasExcepciones.fecha, fecha))),
    resolverDuracionFallback(profesionalId),
    (async () => {
      const { desde, hasta } = rangoUtcDelDiaAr(fecha);
      return db
        .select({ inicio: turnos.inicio, fin: turnos.fin })
        .from(turnos)
        .where(
          and(
            eq(turnos.profesionalId, profesionalId),
            ne(turnos.estado, "cancelado"),
            gte(turnos.inicio, desde),
            lt(turnos.inicio, hasta),
          ),
        );
    })(),
  ]);

  const slots = calcularDisponibilidad({
    fecha,
    ventanasRecurrentes: recurrentes,
    excepciones: excepciones as ExcepcionInput[],
    turnosOcupados: ocupados.map((o) => ({
      horaInicio: horaArDe(o.inicio.toISOString()),
      horaFin: horaArDe(o.fin.toISOString()),
    })),
    duracionFallback,
  });

  return c.json({ profesionalId, fecha, slots });
});

// ---------- Listado (agenda) ----------

turnosRoutes.get("/", profesionalOrStaff, async (c) => {
  const profesionalId = Number(c.req.query("profesionalId"));
  if (!profesionalId) return c.json({ error: "Falta profesionalId" }, 400);
  if (!(await puedeGestionarProfesional(c, profesionalId))) {
    return c.json({ error: "forbidden", message: "No tenés permiso sobre este profesional." }, 403);
  }

  const desde = c.req.query("desde"); // ISO
  const hasta = c.req.query("hasta"); // ISO
  const conditions = [eq(turnos.profesionalId, profesionalId), ne(turnos.estado, "cancelado")];
  if (desde) conditions.push(gte(turnos.inicio, new Date(desde)));
  if (hasta) conditions.push(lt(turnos.inicio, new Date(hasta)));

  const rows = await db
    .select({
      id: turnos.id,
      profesionalId: turnos.profesionalId,
      pacienteId: turnos.pacienteId,
      paciente: pacientes.nombre,
      inicio: turnos.inicio,
      fin: turnos.fin,
      estado: turnos.estado,
      esSobreturno: turnos.esSobreturno,
      esParticular: turnos.esParticular,
      origen: turnos.origen,
      notas: turnos.notas,
    })
    .from(turnos)
    .leftJoin(pacientes, eq(turnos.pacienteId, pacientes.id))
    .where(and(...conditions))
    .orderBy(turnos.inicio);

  return c.json(rows);
});

// ---------- Alta de turno ----------

turnosRoutes.post("/", profesionalOrStaff, zValidator("json", turnoCreate), async (c) => {
  const data = c.req.valid("json");

  if (!(await puedeGestionarProfesional(c, data.profesionalId))) {
    return c.json({ error: "forbidden", message: "No tenés permiso sobre este profesional." }, 403);
  }
  if (data.pacienteId == null && data.paciente == null) {
    return c.json({ error: "Falta el paciente (existente o nuevo)" }, 400);
  }

  if (!data.esSobreturno) {
    const fecha = fechaArDe(data.inicio);
    const [recurrentes, excepciones] = await Promise.all([
      db.select().from(ventanasRecurrentes).where(eq(ventanasRecurrentes.profesionalId, data.profesionalId)),
      db
        .select()
        .from(ventanasExcepciones)
        .where(and(eq(ventanasExcepciones.profesionalId, data.profesionalId), eq(ventanasExcepciones.fecha, fecha))),
    ]);
    const dentro = turnoDentroDeVentana({
      fecha,
      horaInicio: horaArDe(data.inicio),
      horaFin: horaArDe(data.fin),
      ventanasRecurrentes: recurrentes,
      excepciones: excepciones as ExcepcionInput[],
    });
    if (!dentro) {
      return c.json(
        { error: "fuera_de_ventana", message: "Ese horario está fuera de la ventana de trabajo del profesional." },
        400,
      );
    }
  }

  // Fase 2 (portal paciente / origen "online") deberá resolver acá la cascada
  // completa ventana.modoConfirmacion → profesional → config (ver CLAUDE.md).
  // Hoy origen siempre es "administrativo" (staff/profesional), que confirma directo.
  const estado = data.origen === "administrativo" ? "confirmado" : "solicitado";

  let obraSocialId: number | null;
  if (data.pacienteId != null) {
    const [pacienteRow] = await db
      .select({ obraSocialId: pacientes.obraSocialId })
      .from(pacientes)
      .where(eq(pacientes.id, data.pacienteId));
    if (!pacienteRow) return c.json({ error: "Paciente inexistente" }, 404);
    obraSocialId = pacienteRow.obraSocialId;
  } else {
    obraSocialId = data.paciente!.obraSocialId ?? null;
  }
  const esParticular = await resolverEsParticular(data.profesionalId, obraSocialId);

  try {
    let rows: unknown[];
    if (data.pacienteId != null) {
      rows = (await sql`
        INSERT INTO turnos
          (profesional_id, paciente_id, inicio, fin, estado, es_sobreturno, es_particular, origen, notas)
        VALUES (${data.profesionalId}, ${data.pacienteId}, ${data.inicio}, ${data.fin}, ${estado},
                ${data.esSobreturno}, ${esParticular}, ${data.origen}, ${data.notas ?? null})
        RETURNING *;
      `) as unknown[];
    } else {
      const p = data.paciente!;
      rows = (await sql`
        WITH nuevo_paciente AS (
          INSERT INTO pacientes
            (nombre, documento, tipo_documento, fecha_nacimiento, email, telefono, obra_social_id, nro_afiliado, notas)
          VALUES (${p.nombre}, ${p.documento ?? null}, ${p.tipoDocumento ?? null}, ${p.fechaNacimiento ?? null},
                  ${p.email ?? null}, ${p.telefono ?? null}, ${p.obraSocialId ?? null}, ${p.nroAfiliado ?? null},
                  ${p.notas ?? null})
          RETURNING id
        )
        INSERT INTO turnos
          (profesional_id, paciente_id, inicio, fin, estado, es_sobreturno, es_particular, origen, notas)
        SELECT ${data.profesionalId}, nuevo_paciente.id, ${data.inicio}, ${data.fin}, ${estado},
               ${data.esSobreturno}, ${esParticular}, ${data.origen}, ${data.notas ?? null}
        FROM nuevo_paciente
        RETURNING *;
      `) as unknown[];
    }
    const creado = rows[0] as { id: number };
    await logAudit(c, {
      accion: "crear",
      entidad: "turnos",
      entidadId: creado.id,
      entidadLabel: `Turno #${creado.id} (${data.inicio} → ${data.fin})`,
    });
    return c.json(creado, 201);
  } catch (err) {
    if (esViolacionOverbooking(err)) {
      return c.json(
        { error: "overbooking", message: "Ese horario ya está ocupado para este profesional." },
        409,
      );
    }
    throw err;
  }
});

// ---------- Bloqueo de agenda (sin paciente) ----------

turnosRoutes.post("/bloqueos", profesionalOrStaff, zValidator("json", bloqueoCreate), async (c) => {
  const data = c.req.valid("json");
  if (!(await puedeGestionarProfesional(c, data.profesionalId))) {
    return c.json({ error: "forbidden", message: "No tenés permiso sobre este profesional." }, 403);
  }
  try {
    const [row] = await db
      .insert(turnos)
      .values({
        profesionalId: data.profesionalId,
        inicio: new Date(data.inicio),
        fin: new Date(data.fin),
        estado: "bloqueo",
        notas: data.motivo ?? null,
      })
      .returning();
    if (!row) return c.json({ error: "No se pudo crear" }, 500);
    await logAudit(c, {
      accion: "crear",
      entidad: "bloqueos",
      entidadId: row.id,
      entidadLabel: `Bloqueo #${row.id} (${data.inicio} → ${data.fin})`,
    });
    return c.json(row, 201);
  } catch (err) {
    if (esViolacionOverbooking(err)) {
      return c.json({ error: "overbooking", message: "Ese horario ya está ocupado para este profesional." }, 409);
    }
    throw err;
  }
});

// ---------- Estados ----------

async function cambiarEstado(
  c: Context,
  id: number,
  estado: "confirmado" | "en_sala" | "atendido" | "ausente" | "cancelado",
  campoTimestamp?: "confirmadoAt" | "arriboAt" | "atendidoAt",
) {
  const [antes] = await db.select().from(turnos).where(eq(turnos.id, id));
  if (!antes) return c.json({ error: "No encontrado" }, 404);
  if (!(await puedeGestionarProfesional(c, antes.profesionalId))) {
    return c.json({ error: "forbidden", message: "No tenés permiso sobre este turno." }, 403);
  }

  const cambios: Record<string, unknown> = { estado };
  if (campoTimestamp) cambios[campoTimestamp] = new Date();

  const [row] = await db.update(turnos).set(cambios).where(eq(turnos.id, id)).returning();
  if (!row) return c.json({ error: "No encontrado" }, 404);
  await logAudit(c, {
    accion: "editar",
    entidad: "turnos",
    entidadId: id,
    entidadLabel: `Turno #${id} — ${estado}`,
    diff: { estado: { antes: antes.estado, despues: estado } },
  });
  return c.json(row);
}

turnosRoutes.post("/:id/confirmar", staff, async (c) =>
  cambiarEstado(c, Number(c.req.param("id")), "confirmado", "confirmadoAt"));

turnosRoutes.post("/:id/arribo", profesionalOrStaff, async (c) =>
  cambiarEstado(c, Number(c.req.param("id")), "en_sala", "arriboAt"));

turnosRoutes.post("/:id/atendido", profesionalOrStaff, async (c) =>
  cambiarEstado(c, Number(c.req.param("id")), "atendido", "atendidoAt"));

turnosRoutes.post("/:id/ausente", profesionalOrStaff, async (c) =>
  cambiarEstado(c, Number(c.req.param("id")), "ausente"));

turnosRoutes.post("/:id/cancelar", profesionalOrStaff, async (c) =>
  cambiarEstado(c, Number(c.req.param("id")), "cancelado"));
