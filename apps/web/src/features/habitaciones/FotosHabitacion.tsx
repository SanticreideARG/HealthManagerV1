import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { HabitacionFoto } from "../../lib/api.js";

interface Props {
  habitacionId: number;
}

const MAX_FOTOS = 10;

export function FotosHabitacion({ habitacionId }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: fotos = [], isLoading } = useQuery({
    queryKey: ["habitacion.fotos", habitacionId],
    queryFn: () => api.habitacionFotos.list(habitacionId),
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["habitacion.fotos", habitacionId] });

  const eliminarMut = useMutation({
    mutationFn: (fotoId: number) => api.habitacionFotos.remove(habitacionId, fotoId),
    onSuccess: invalidar,
  });

  const reorderMut = useMutation({
    mutationFn: (ids: number[]) => api.habitacionFotos.reorder(habitacionId, ids),
    onSuccess: invalidar,
  });

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fotos.length >= MAX_FOTOS) {
      setError(`Máximo ${MAX_FOTOS} fotos por alojamiento.`);
      return;
    }
    setError(null);
    setSubiendo(true);
    try {
      await api.habitacionFotos.upload(habitacionId, file);
      invalidar();
    } catch {
      setError("No se pudo subir la foto. Intentá de nuevo.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function mover(foto: HabitacionFoto, dir: -1 | 1) {
    const sorted = [...fotos].sort((a, b) => a.orden - b.orden);
    const idx = sorted.findIndex((f) => f.id === foto.id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const tmp = sorted[idx];
    const nxt = sorted[newIdx];
    if (!tmp || !nxt) return;
    sorted[idx] = nxt;
    sorted[newIdx] = tmp;
    reorderMut.mutate(sorted.map((f) => f.id));
  }

  if (isLoading) return <p className="text-sm text-slate-400">Cargando fotos…</p>;

  const sorted = [...fotos].sort((a, b) => a.orden - b.orden);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {fotos.length}/{MAX_FOTOS} fotos
        </p>
        {fotos.length < MAX_FOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="text-sm px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50"
          >
            {subiendo ? "Subiendo…" : "+ Agregar foto"}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleArchivo}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500 italic">Sin fotos aún.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sorted.map((foto, idx) => (
            <div key={foto.id} className="relative group rounded-lg overflow-hidden border border-slate-700 aspect-video bg-slate-800">
              <img
                src={foto.url}
                alt={`Foto ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => mover(foto, -1)}
                    disabled={idx === 0 || reorderMut.isPending}
                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs disabled:opacity-40"
                    title="Mover izquierda"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(foto, 1)}
                    disabled={idx === sorted.length - 1 || reorderMut.isPending}
                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs disabled:opacity-40"
                    title="Mover derecha"
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => eliminarMut.mutate(foto.id)}
                  disabled={eliminarMut.isPending}
                  className="p-1 px-2 rounded bg-red-700 hover:bg-red-600 text-white text-xs"
                >
                  Eliminar
                </button>
              </div>
              {idx === 0 && (
                <span className="absolute top-1 left-1 bg-sky-700 text-white text-xs px-1.5 py-0.5 rounded">
                  Principal
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
