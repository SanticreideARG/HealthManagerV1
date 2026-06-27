import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { Amenidad } from "../../lib/api.js";
import { Modal } from "../habitaciones/NuevaHabitacion.js";

const TIPO_LABEL: Record<string, string> = {
  bool: "Booleana",
  texto: "Texto",
  numero: "Número",
};

const TIPO_COLOR: Record<string, string> = {
  bool: "bg-sky-100 text-sky-700",
  texto: "bg-violet-100 text-violet-700",
  numero: "bg-amber-100 text-amber-700",
};

export function AmenidadesAdmin() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["amenidades"], queryFn: api.amenidades.list });
  const [editando, setEditando] = useState<Amenidad | null | "nueva">(null);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Catálogo de características
          </h2>
          <p className="text-sm text-slate-400">
            Definí las características y asignalas por alojamiento al editarlo.
          </p>
        </div>
        <button
          onClick={() => setEditando("nueva")}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Característica
        </button>
      </div>

      {q.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}

      {q.data && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 font-semibold">Icono</th>
                <th className="px-4 py-2 font-semibold">Nombre</th>
                <th className="px-4 py-2 font-semibold">Tipo</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {q.data.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-lg">{a.icono ?? "—"}</td>
                  <td className="px-4 py-2 font-medium text-slate-800">{a.nombre}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIPO_COLOR[a.tipo]}`}
                    >
                      {TIPO_LABEL[a.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setEditando(a)}
                      className="mr-2 text-xs text-slate-400 hover:text-slate-700"
                    >
                      Editar
                    </button>
                    <EliminarBtn amenidad={a} onDone={() => qc.invalidateQueries({ queryKey: ["amenidades"] })} />
                  </td>
                </tr>
              ))}
              {q.data.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Sin características. Creá la primera.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editando !== null && (
        <AmenidadForm
          amenidad={editando === "nueva" ? undefined : editando}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function EliminarBtn({
  amenidad,
  onDone,
}: {
  amenidad: Amenidad;
  onDone: () => void;
}) {
  const eliminar = useMutation({
    mutationFn: () => api.amenidades.remove(amenidad.id),
    onSuccess: onDone,
  });
  return (
    <button
      disabled={eliminar.isPending}
      onClick={() => {
        if (confirm(`¿Eliminar "${amenidad.nombre}"? Se quitará de todos los alojamientos.`))
          eliminar.mutate();
      }}
      className="text-xs text-rose-400 hover:text-rose-600 disabled:opacity-50"
    >
      Eliminar
    </button>
  );
}

function AmenidadForm({
  amenidad,
  onClose,
}: {
  amenidad?: Amenidad;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState(amenidad?.nombre ?? "");
  const [tipo, setTipo] = useState<"bool" | "texto" | "numero">(amenidad?.tipo ?? "bool");
  const [icono, setIcono] = useState(amenidad?.icono ?? "");
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: () =>
      amenidad
        ? api.amenidades.update(amenidad.id, { nombre, tipo, icono: icono.trim() || undefined })
        : api.amenidades.create({ nombre, tipo, icono: icono.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["amenidades"] });
      onClose();
    },
    onError: () => setError("No se pudo guardar."),
  });

  return (
    <Modal
      titulo={amenidad ? `Editar · ${amenidad.nombre}` : "Nueva característica"}
      onClose={onClose}
    >
      <label className="block text-sm">
        Nombre
        <input
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          placeholder="Televisor"
        />
      </label>

      <label className="block text-sm">
        Tipo
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as typeof tipo)}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
        >
          <option value="bool">Booleana (Sí / No)</option>
          <option value="texto">Texto (ej. disposición de camas)</option>
          <option value="numero">Número (ej. m²)</option>
        </select>
      </label>

      <label className="block text-sm">
        Icono <span className="text-slate-400">(emoji, opcional)</span>
        <input
          value={icono}
          onChange={(e) => setIcono(e.target.value)}
          className="mt-1 w-20 rounded border border-slate-300 px-2 py-1.5 text-center text-lg"
          placeholder="📺"
          maxLength={2}
        />
      </label>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        disabled={!nombre || guardar.isPending}
        onClick={() => { setError(null); guardar.mutate(); }}
        className="mt-2 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {guardar.isPending ? "Guardando…" : amenidad ? "Guardar" : "Crear"}
      </button>
    </Modal>
  );
}
