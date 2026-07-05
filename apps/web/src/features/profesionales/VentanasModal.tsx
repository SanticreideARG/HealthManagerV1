import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api.js";
import type { Profesional } from "../../lib/api.js";
import { Modal } from "../../components/Modal.js";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function VentanasModal({
  profesional,
  onClose,
}: {
  profesional: Profesional;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const ventanasQ = useQuery({
    queryKey: ["ventanas", profesional.id],
    queryFn: () => api.profesionales.ventanas.list(profesional.id),
  });
  const [tab, setTab] = useState<"recurrentes" | "excepciones">("recurrentes");
  const [error, setError] = useState<string | null>(null);

  const invalidar = () => qc.invalidateQueries({ queryKey: ["ventanas", profesional.id] });

  const [diaSemana, setDiaSemana] = useState(1);
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("13:00");

  const crearRecurrente = useMutation({
    mutationFn: () =>
      api.profesionales.ventanas.createRecurrente(profesional.id, {
        profesionalId: profesional.id,
        diaSemana,
        horaInicio,
        horaFin,
        activa: true,
      }),
    onSuccess: invalidar,
    onError: (e) => setError(e instanceof ApiError ? e.message : "No se pudo crear la ventana."),
  });

  const borrarRecurrente = useMutation({
    mutationFn: (ventanaId: number) => api.profesionales.ventanas.removeRecurrente(profesional.id, ventanaId),
    onSuccess: invalidar,
  });

  const [fecha, setFecha] = useState("");
  const [tipo, setTipo] = useState<"agrega" | "bloquea">("bloquea");
  const [motivo, setMotivo] = useState("");

  const crearExcepcion = useMutation({
    mutationFn: () =>
      api.profesionales.ventanas.createExcepcion(profesional.id, {
        profesionalId: profesional.id,
        fecha,
        tipo,
        motivo: motivo || undefined,
      }),
    onSuccess: () => {
      invalidar();
      setFecha("");
      setMotivo("");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "No se pudo crear la excepción."),
  });

  const borrarExcepcion = useMutation({
    mutationFn: (excepcionId: number) => api.profesionales.ventanas.removeExcepcion(profesional.id, excepcionId),
    onSuccess: invalidar,
  });

  return (
    <Modal titulo={`Ventanas de trabajo — ${profesional.nombre}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
          <button onClick={() => setTab("recurrentes")} className={tabCls(tab === "recurrentes")}>
            Recurrentes
          </button>
          <button onClick={() => setTab("excepciones")} className={tabCls(tab === "excepciones")}>
            Excepciones
          </button>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {ventanasQ.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}

        {tab === "recurrentes" && (
          <div className="space-y-3">
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {ventanasQ.data?.recurrentes.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700"
                >
                  <span>
                    {DIAS[v.diaSemana]} · {v.horaInicio}–{v.horaFin}
                  </span>
                  <button onClick={() => borrarRecurrente.mutate(v.id)} className="text-slate-400 hover:text-rose-600">
                    ✕
                  </button>
                </li>
              ))}
              {ventanasQ.data?.recurrentes.length === 0 && (
                <p className="text-sm text-slate-400">Sin ventanas cargadas.</p>
              )}
            </ul>

            <div className="flex flex-wrap items-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <label className="text-sm">
                <span className="block text-slate-600 dark:text-slate-300">Día</span>
                <select value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))} className={input}>
                  {DIAS.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="block text-slate-600 dark:text-slate-300">Desde</span>
                <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={input} />
              </label>
              <label className="text-sm">
                <span className="block text-slate-600 dark:text-slate-300">Hasta</span>
                <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className={input} />
              </label>
              <button
                disabled={crearRecurrente.isPending}
                onClick={() => {
                  setError(null);
                  crearRecurrente.mutate();
                }}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
              >
                + Agregar
              </button>
            </div>
          </div>
        )}

        {tab === "excepciones" && (
          <div className="space-y-3">
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {ventanasQ.data?.excepciones.map((ex) => (
                <li
                  key={ex.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700"
                >
                  <span>
                    {ex.fecha} · {ex.tipo === "bloquea" ? "Bloqueo" : "Agrega"}
                    {ex.motivo ? ` — ${ex.motivo}` : ""}
                  </span>
                  <button onClick={() => borrarExcepcion.mutate(ex.id)} className="text-slate-400 hover:text-rose-600">
                    ✕
                  </button>
                </li>
              ))}
              {ventanasQ.data?.excepciones.length === 0 && (
                <p className="text-sm text-slate-400">Sin excepciones cargadas.</p>
              )}
            </ul>

            <div className="flex flex-wrap items-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <label className="text-sm">
                <span className="block text-slate-600 dark:text-slate-300">Fecha</span>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={input} />
              </label>
              <label className="text-sm">
                <span className="block text-slate-600 dark:text-slate-300">Tipo</span>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as "agrega" | "bloquea")} className={input}>
                  <option value="bloquea">Bloquea (feriado, ausencia)</option>
                  <option value="agrega">Agrega (guardia extra)</option>
                </select>
              </label>
              <label className="min-w-32 flex-1 text-sm">
                <span className="block text-slate-600 dark:text-slate-300">Motivo</span>
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={input} placeholder="Feriado, licencia…" />
              </label>
              <button
                disabled={!fecha || crearExcepcion.isPending}
                onClick={() => {
                  setError(null);
                  crearExcepcion.mutate();
                }}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
              >
                + Agregar
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

const input =
  "mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

function tabCls(active: boolean) {
  return `flex-1 rounded px-2 py-1.5 font-medium transition-colors ${
    active
      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
  }`;
}
