import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api.js";
import type { Huesped } from "../../lib/api.js";
import { Modal } from "../habitaciones/NuevaHabitacion.js";
import { HuespedForm } from "./HuespedForm.js";

const estadoLabel: Record<string, string> = {
  reservada: "Reservada",
  ocupada: "Ocupada",
  checkout: "Check-out",
  cancelada: "Cancelada",
};

export function HuespedDetalle({
  huesped,
  onClose,
}: {
  huesped: Huesped;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const historialQ = useQuery({
    queryKey: ["historial", huesped.id],
    queryFn: () => api.huespedes.historial(huesped.id),
  });

  const eliminar = useMutation({
    mutationFn: () => api.huespedes.remove(huesped.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["huespedes"] });
      onClose();
    },
    onError: (err) =>
      setError(
        err instanceof ApiError && err.enUso
          ? "No se puede eliminar: el huésped tiene reservas."
          : "No se pudo eliminar.",
      ),
  });

  if (editando) {
    return <HuespedForm huesped={huesped} onClose={() => setEditando(false)} />;
  }

  const noches = (a: string, b: string) =>
    Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

  return (
    <Modal titulo={huesped.nombre} onClose={onClose}>
      <dl className="space-y-1 text-sm text-slate-600">
        <Fila label="Documento" valor={huesped.documento} />
        <Fila label="Email" valor={huesped.email} />
        <Fila label="Teléfono" valor={huesped.telefono} />
        {huesped.notas && (
          <div className="rounded bg-amber-50 px-2 py-1 text-amber-800">
            {huesped.notas}
          </div>
        )}
      </dl>

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase text-slate-400">
          Historial de estadías
        </h3>
        {historialQ.isLoading && (
          <p className="text-sm text-slate-400">Cargando…</p>
        )}
        {historialQ.data && historialQ.data.length === 0 && (
          <p className="text-sm text-slate-400">Sin estadías registradas.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {historialQ.data?.map((h) => (
            <li key={h.id} className="flex justify-between py-1.5 text-sm">
              <span>
                <span className="font-medium text-slate-700">
                  {h.habitacion}
                </span>{" "}
                <span className="text-slate-400">
                  {h.checkin} → {h.checkout} · {noches(h.checkin, h.checkout)}n
                </span>
              </span>
              <span className="text-slate-500">
                {estadoLabel[h.estado] ?? h.estado} · $
                {Number(h.total).toLocaleString("es-AR")}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => setEditando(true)}
          className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Editar
        </button>
        <button
          disabled={eliminar.isPending}
          onClick={() => {
            if (confirm(`¿Eliminar a "${huesped.nombre}"?`)) {
              setError(null);
              eliminar.mutate();
            }
          }}
          className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
        >
          Eliminar
        </button>
      </div>
    </Modal>
  );
}

function Fila({ label, valor }: { label: string; valor: string | null }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-400">{label}</dt>
      <dd>{valor || "—"}</dd>
    </div>
  );
}
