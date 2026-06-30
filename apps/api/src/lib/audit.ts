import type { Context } from "hono";
import { db, auditLog } from "@suites/db";
import { auth } from "../auth.js";

export type Accion = "crear" | "editar" | "eliminar";

export type Diff = Record<string, { antes: unknown; despues: unknown }>;

/** Calcula diff entre dos snapshots — solo campos que cambiaron. */
export function computeDiff<T extends Record<string, unknown>>(
  antes: T,
  despues: T,
  campos: (keyof T)[],
): Diff {
  const diff: Diff = {};
  for (const campo of campos) {
    const a = String(antes[campo] ?? "");
    const b = String(despues[campo] ?? "");
    if (a !== b) {
      diff[String(campo)] = { antes: antes[campo] ?? null, despues: despues[campo] ?? null };
    }
  }
  return diff;
}

/** Diff para "crear": todos los campos tienen antes=null. */
export function diffCrear<T extends Record<string, unknown>>(
  despues: T,
  campos: (keyof T)[],
): Diff {
  const diff: Diff = {};
  for (const campo of campos) {
    if (despues[campo] != null) {
      diff[String(campo)] = { antes: null, despues: despues[campo] };
    }
  }
  return diff;
}

/** Diff para "eliminar": todos los campos tienen despues=null. */
export function diffEliminar<T extends Record<string, unknown>>(
  antes: T,
  campos: (keyof T)[],
): Diff {
  const diff: Diff = {};
  for (const campo of campos) {
    if (antes[campo] != null) {
      diff[String(campo)] = { antes: antes[campo], despues: null };
    }
  }
  return diff;
}

interface LogParams {
  accion: Accion;
  entidad: string;
  entidadId?: string | number | null;
  entidadLabel?: string | null;
  diff?: Diff;
}

/**
 * Registra una entrada en audit_log.
 * Extrae usuario e IP del contexto Hono. Fire-and-forget: los errores
 * se silencian para no interrumpir la respuesta principal.
 */
export async function logAudit(c: Context, params: LogParams): Promise<void> {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return;

    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      null;

    await db.insert(auditLog).values({
      userId:       session.user.id,
      userName:     session.user.name,
      userEmail:    session.user.email,
      accion:       params.accion,
      entidad:      params.entidad,
      entidadId:    params.entidadId != null ? String(params.entidadId) : null,
      entidadLabel: params.entidadLabel ?? null,
      diff:         params.diff ? JSON.stringify(params.diff) : null,
      ip,
    } as any);
  } catch {
    // No interrumpir la respuesta por fallos de logging
  }
}
