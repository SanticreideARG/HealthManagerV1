import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { Turno } from "../../lib/api.js";
import { ESTADO_INFO, horaArDe, fechaArDe, hoyISO, addDaysISO, lunesDeLaSemana } from "../../lib/turnoDisplay.js";

const NOMBRES_LUN_DOM = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/** Resumen semanal (lun-dom) por profesional. Solo lectura: clickear un día vuelve a la vista día. */
export function SemanaAgenda({
  profesionalId,
  fecha,
  onSeleccionarDia,
}: {
  profesionalId: number;
  fecha: string;
  onSeleccionarDia: (fecha: string) => void;
}) {
  const lunes = lunesDeLaSemana(fecha);
  const dias = Array.from({ length: 7 }, (_, i) => addDaysISO(lunes, i));
  const hoy = hoyISO();

  const semanaQ = useQuery({
    queryKey: ["turnos-semana", profesionalId, lunes],
    queryFn: () => {
      const desde = new Date(`${lunes}T00:00:00-03:00`);
      const hasta = new Date(desde.getTime() + 7 * 24 * 60 * 60 * 1000);
      return api.turnos.list(profesionalId, desde.toISOString(), hasta.toISOString());
    },
  });

  const porDia = new Map<string, Turno[]>(dias.map((f) => [f, []]));
  for (const t of semanaQ.data ?? []) {
    porDia.get(fechaArDe(t.inicio))?.push(t);
  }

  return (
    <div className="space-y-2">
      {semanaQ.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
      <div className="grid grid-cols-7 gap-2 overflow-x-auto">
        {dias.map((f, i) => {
          const turnosDia = (porDia.get(f) ?? []).sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
          const esHoy = f === hoy;
          const esSeleccionado = f === fecha;
          return (
            <button
              key={f}
              onClick={() => onSeleccionarDia(f)}
              className={`min-w-[110px] space-y-1.5 rounded-xl border p-2 text-left align-top transition-colors ${
                esSeleccionado
                  ? "border-slate-400 bg-slate-50 dark:border-slate-500 dark:bg-slate-800"
                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/60"
              }`}
            >
              <div className="text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {NOMBRES_LUN_DOM[i]}
                </div>
                <div className={`text-lg font-bold ${esHoy ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}>
                  {f.slice(8, 10)}
                  {esHoy && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />}
                </div>
              </div>

              <div className="space-y-1">
                {turnosDia.length === 0 && (
                  <p className="text-center text-xs text-slate-300 dark:text-slate-600">—</p>
                )}
                {turnosDia.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className={`truncate rounded px-1.5 py-1 text-xs ${ESTADO_INFO[t.estado].className}`}
                    title={t.estado === "bloqueo" ? (t.notas ?? "Bloqueo") : (t.paciente ?? "—")}
                  >
                    <span className="font-medium tabular-nums">{horaArDe(t.inicio)}</span>{" "}
                    {t.estado === "bloqueo" ? (t.notas ?? "Bloqueo") : (t.paciente ?? "—")}
                  </div>
                ))}
                {turnosDia.length > 5 && (
                  <p className="text-center text-[11px] text-slate-400">+{turnosDia.length - 5} más</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
