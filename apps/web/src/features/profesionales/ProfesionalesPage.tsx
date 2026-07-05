import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api.js";
import type { Profesional } from "../../lib/api.js";
import { Modal } from "../../components/Modal.js";
import { VentanasModal } from "./VentanasModal.js";

const DURACIONES = [20, 30, 40, 60];
const MODOS = [
  { value: "", label: "Heredar de configuración" },
  { value: "automatico", label: "Automático" },
  { value: "aprobacion", label: "A aprobación" },
] as const;

export function ProfesionalesPage() {
  const qc = useQueryClient();
  const profesionalesQ = useQuery({ queryKey: ["profesionales"], queryFn: api.profesionales.list });
  const [editando, setEditando] = useState<Profesional | "nuevo" | null>(null);
  const [ventanasDe, setVentanasDe] = useState<Profesional | null>(null);

  const desactivar = useMutation({
    mutationFn: (id: number) => api.profesionales.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profesionales"] }),
  });
  const reactivar = useMutation({
    mutationFn: (id: number) => api.profesionales.update(id, { activo: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profesionales"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Cada profesional gestiona sus propias ventanas de trabajo. Desactivar no borra el
          historial: solo lo saca de la agenda y la landing.
        </p>
        <button
          onClick={() => setEditando("nuevo")}
          className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600"
        >
          + Profesional
        </button>
      </div>

      {profesionalesQ.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
      {profesionalesQ.isError && <p className="text-sm text-rose-600">No se pudo cargar el listado.</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {profesionalesQ.data?.map((p) => (
          <div
            key={p.id}
            className={`rounded-xl border p-4 ${
              p.activo
                ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                : "border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-800/50"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-slate-800 dark:text-slate-100">{p.nombre}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{p.especialidad}</p>
              </div>
              <span
                className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: p.color ?? "#94a3b8" }}
                title="Color de agenda"
              />
            </div>

            {p.ubicacion && <p className="mt-1 text-xs text-slate-400">📍 {p.ubicacion}</p>}

            {p.obrasSociales.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {p.obrasSociales.map((os) => (
                  <span
                    key={os.id}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {os.nombre}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => setVentanasDe(p)}
                className="rounded-lg border border-slate-300 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Ventanas
              </button>
              <button
                onClick={() => setEditando(p)}
                className="rounded-lg border border-slate-300 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Editar
              </button>
              {p.activo ? (
                <button
                  onClick={() => confirm(`¿Desactivar a ${p.nombre}?`) && desactivar.mutate(p.id)}
                  className="rounded-lg border border-rose-200 px-2.5 py-1 font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/40"
                >
                  Desactivar
                </button>
              ) : (
                <button
                  onClick={() => reactivar.mutate(p.id)}
                  className="rounded-lg border border-emerald-200 px-2.5 py-1 font-medium text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/40"
                >
                  Reactivar
                </button>
              )}
            </div>
          </div>
        ))}
        {profesionalesQ.data?.length === 0 && (
          <p className="col-span-full text-sm text-slate-400">Todavía no hay profesionales cargados.</p>
        )}
      </div>

      {editando && (
        <ProfesionalModal
          profesional={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
        />
      )}
      {ventanasDe && <VentanasModal profesional={ventanasDe} onClose={() => setVentanasDe(null)} />}
    </div>
  );
}

function ProfesionalModal({
  profesional,
  onClose,
}: {
  profesional: Profesional | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const obrasSocialesQ = useQuery({ queryKey: ["obras-sociales"], queryFn: api.obrasSociales.list });

  const [nombre, setNombre] = useState(profesional?.nombre ?? "");
  const [especialidad, setEspecialidad] = useState(profesional?.especialidad ?? "");
  const [ubicacion, setUbicacion] = useState(profesional?.ubicacion ?? "");
  const [color, setColor] = useState(profesional?.color ?? "#0E5A6B");
  const [duracion, setDuracion] = useState<number | "">(profesional?.duracionTurnoDefault ?? "");
  const [modo, setModo] = useState<"" | "automatico" | "aprobacion">(
    profesional?.modoConfirmacionDefault ?? "",
  );
  const [obraSocialIds, setObraSocialIds] = useState<number[]>(
    profesional?.obrasSociales.map((os) => os.id) ?? [],
  );
  const [nuevaObraSocial, setNuevaObraSocial] = useState("");
  const [error, setError] = useState<string | null>(null);

  const crearObraSocial = useMutation({
    mutationFn: (nombreOs: string) => api.obrasSociales.create({ nombre: nombreOs, activa: true }),
    onSuccess: (os) => {
      qc.invalidateQueries({ queryKey: ["obras-sociales"] });
      setObraSocialIds((ids) => [...ids, os.id]);
      setNuevaObraSocial("");
    },
  });

  const guardar = useMutation({
    mutationFn: () => {
      const payload = {
        nombre,
        especialidad,
        activo: profesional?.activo ?? true,
        ubicacion: ubicacion || null,
        color: color || null,
        duracionTurnoDefault: duracion === "" ? null : duracion,
        modoConfirmacionDefault: modo === "" ? null : modo,
        obraSocialIds,
      };
      return profesional
        ? api.profesionales.update(profesional.id, payload)
        : api.profesionales.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profesionales"] });
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "No se pudo guardar."),
  });

  function toggleObraSocial(id: number) {
    setObraSocialIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  return (
    <Modal titulo={profesional ? "Editar profesional" : "Nuevo profesional"} onClose={onClose}>
      <div className="space-y-3">
        <Campo label="Nombre">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} placeholder="Dra. Nombre Apellido" />
        </Campo>
        <Campo label="Especialidad">
          <input value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} className={input} placeholder="Cardiología" />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Ubicación">
            <input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className={input} placeholder="Sede Centro" />
          </Campo>
          <Campo label="Color de agenda">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className={`${input} h-9 p-1`} />
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Duración de turno">
            <select
              value={duracion}
              onChange={(e) => setDuracion(e.target.value ? Number(e.target.value) : "")}
              className={input}
            >
              <option value="">Heredar de configuración</option>
              {DURACIONES.map((d) => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </Campo>
          <Campo label="Modo de confirmación">
            <select value={modo ?? ""} onChange={(e) => setModo(e.target.value as typeof modo)} className={input}>
              {MODOS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </Campo>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Obras sociales aceptadas
          </span>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
            {obrasSocialesQ.data?.map((os) => (
              <label key={os.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={obraSocialIds.includes(os.id)}
                  onChange={() => toggleObraSocial(os.id)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {os.nombre}
              </label>
            ))}
            {obrasSocialesQ.data?.length === 0 && (
              <p className="text-xs text-slate-400">Sin obras sociales cargadas todavía.</p>
            )}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={nuevaObraSocial}
              onChange={(e) => setNuevaObraSocial(e.target.value)}
              placeholder="Agregar obra social…"
              className={`${input} flex-1`}
            />
            <button
              type="button"
              disabled={!nuevaObraSocial.trim() || crearObraSocial.isPending}
              onClick={() => crearObraSocial.mutate(nuevaObraSocial.trim())}
              className="rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300"
            >
              +
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          disabled={!nombre.trim() || !especialidad.trim() || guardar.isPending}
          onClick={() => guardar.mutate()}
          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
        >
          {guardar.isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </Modal>
  );
}

const input =
  "mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}
