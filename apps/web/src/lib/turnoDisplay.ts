import type { EstadoTurno } from "./api.js";

export const ESTADO_INFO: Record<EstadoTurno, { label: string; className: string }> = {
  solicitado: { label: "A confirmar", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  confirmado: { label: "Confirmado", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  en_sala: { label: "En sala", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  atendido: { label: "Atendido", className: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
  ausente: { label: "Ausente", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  cancelado: { label: "Cancelado", className: "bg-rose-50 text-rose-400 dark:bg-rose-950/20 dark:text-rose-500" },
  bloqueo: { label: "Bloqueo", className: "border border-dashed border-slate-300 text-slate-500 dark:border-slate-600" },
};

/** "HH:MM" en hora de Argentina, a partir de un instante ISO (con cualquier offset). */
export function horaArDe(iso: string): string {
  return new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(11, 16);
}
