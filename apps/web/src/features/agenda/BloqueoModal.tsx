import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api.js";
import { Modal } from "../../components/Modal.js";

const input =
  "mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export function BloqueoModal({
  profesionalId,
  fecha,
  onClose,
  onCreated,
}: {
  profesionalId: number;
  fecha: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("10:00");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const qc = useQueryClient();
  const crear = useMutation({
    mutationFn: () =>
      api.turnos.createBloqueo({
        profesionalId,
        inicio: `${fecha}T${horaInicio}:00-03:00`,
        fin: `${fecha}T${horaFin}:00-03:00`,
        motivo: motivo || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["turnos"] });
      qc.invalidateQueries({ queryKey: ["disponibilidad"] });
      onCreated();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "No se pudo crear el bloqueo."),
  });

  const horarioValido = horaFin > horaInicio;

  return (
    <Modal titulo="Bloquear agenda" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-400">{fecha} — ausencia, feriado, reunión…</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Desde</span>
            <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={input} />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Hasta</span>
            <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className={input} />
          </label>
        </div>
        {!horarioValido && <p className="text-xs text-rose-600">El fin debe ser posterior al inicio.</p>}
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Motivo</span>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={input} placeholder="Feriado, licencia…" />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          disabled={!horarioValido || crear.isPending}
          onClick={() => {
            setError(null);
            crear.mutate();
          }}
          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
        >
          {crear.isPending ? "Guardando…" : "Bloquear"}
        </button>
      </div>
    </Modal>
  );
}
