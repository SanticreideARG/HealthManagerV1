import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";

const TIPO_LABEL: Record<string, string> = {
  bool: "Sí / No",
  texto: "Texto",
  numero: "Número",
};

export function AmenidadesHabitacion({ habitacionId }: { habitacionId: number }) {
  const qc = useQueryClient();

  const catalogoQ = useQuery({
    queryKey: ["amenidades"],
    queryFn: api.amenidades.list,
  });

  const asignadasQ = useQuery({
    queryKey: ["habitacion-amenidades", habitacionId],
    queryFn: () => api.habitacionAmenidades.get(habitacionId),
  });

  // estado local: amenidadId -> { activa, valor }
  const [local, setLocal] = useState<Record<number, { activa: boolean; valor: string }>>({});
  const [inicializado, setInicializado] = useState(false);

  if (!inicializado && asignadasQ.data && catalogoQ.data) {
    const init: Record<number, { activa: boolean; valor: string }> = {};
    for (const a of catalogoQ.data) {
      const asig = asignadasQ.data.find((x) => x.amenidadId === a.id);
      init[a.id] = { activa: !!asig, valor: asig?.valor ?? "" };
    }
    setLocal(init);
    setInicializado(true);
  }

  const guardar = useMutation({
    mutationFn: () => {
      const data = Object.entries(local)
        .filter(([, v]) => v.activa)
        .map(([id, v]) => {
          const amenId = Number(id);
          const cat = catalogoQ.data?.find((a) => a.id === amenId);
          return {
            amenidadId: amenId,
            valor: cat?.tipo === "bool" ? null : (v.valor.trim() || null),
          };
        });
      return api.habitacionAmenidades.set(habitacionId, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habitacion-amenidades", habitacionId] });
    },
  });

  if (catalogoQ.isLoading || asignadasQ.isLoading) {
    return <p className="text-sm text-slate-400">Cargando características…</p>;
  }

  if (!catalogoQ.data?.length) {
    return (
      <p className="text-sm text-slate-400">
        No hay características definidas en el catálogo.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {catalogoQ.data.map((a) => {
          const estado = local[a.id] ?? { activa: false, valor: "" };
          return (
            <div key={a.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                id={`amen-${a.id}`}
                checked={estado.activa}
                onChange={(e) =>
                  setLocal((s) => ({
                    ...s,
                    [a.id]: { activa: e.target.checked, valor: s[a.id]?.valor ?? "" },
                  }))
                }
                className="mt-0.5"
              />
              <label htmlFor={`amen-${a.id}`} className="flex flex-1 flex-wrap items-center gap-2 text-sm">
                <span>
                  {a.icono && <span className="mr-1">{a.icono}</span>}
                  {a.nombre}
                  <span className="ml-1.5 text-xs text-slate-400">
                    ({TIPO_LABEL[a.tipo]})
                  </span>
                </span>
                {estado.activa && a.tipo !== "bool" && (
                  <input
                    type={a.tipo === "numero" ? "number" : "text"}
                    min={a.tipo === "numero" ? 0 : undefined}
                    value={estado.valor}
                    onChange={(e) =>
                      setLocal((s) => ({
                        ...s,
                        [a.id]: { activa: s[a.id]?.activa ?? true, valor: e.target.value },
                      }))
                    }
                    placeholder={a.tipo === "numero" ? "0" : "Descripción…"}
                    className="w-40 rounded border border-slate-300 px-2 py-0.5 text-sm"
                  />
                )}
              </label>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          disabled={guardar.isPending}
          onClick={() => guardar.mutate()}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-50"
        >
          {guardar.isPending ? "Guardando…" : "Guardar características"}
        </button>
        {guardar.isSuccess && (
          <span className="text-xs text-emerald-600">✓ Guardado</span>
        )}
      </div>
    </div>
  );
}
