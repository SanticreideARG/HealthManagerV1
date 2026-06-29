import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { TareaHousekeeping, TipoTareaHK, PrioridadHK, EstadoHK } from "../../lib/types.js";
import type { TareaHousekeepingCreate } from "@suites/shared";

// ── Constantes de presentación ────────────────────────────────────────────────
const TIPO_CFG: Record<TipoTareaHK, { label: string; emoji: string; color: string }> = {
  limpieza:     { label: "Limpieza",     emoji: "🧹", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  mantenimiento:{ label: "Mantenimiento",emoji: "🔧", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  inspeccion:   { label: "Inspección",   emoji: "🔍", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
};

const PRIO_CFG: Record<PrioridadHK, { label: string; color: string }> = {
  baja:    { label: "Baja",    color: "text-slate-400" },
  normal:  { label: "Normal",  color: "text-slate-500" },
  alta:    { label: "Alta",    color: "text-amber-600 dark:text-amber-400" },
  urgente: { label: "Urgente", color: "text-rose-600 dark:text-rose-400 font-semibold" },
};

const ESTADO_CFG: Record<EstadoHK, { label: string; chip: string }> = {
  pendiente:  { label: "Pendiente",  chip: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
  en_proceso: { label: "En proceso", chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  completado: { label: "Completado", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  cancelado:  { label: "Cancelado",  chip: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
};

const hoy = new Date().toISOString().slice(0, 10);
function addDays(d: string, n: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}
function fmtFecha(s: string) {
  return new Date(s + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

// ── Filtros de fecha ──────────────────────────────────────────────────────────
type Rango = "hoy" | "semana" | "todo";
function rangoFechas(r: Rango): { desde?: string; hasta?: string } {
  if (r === "hoy")   return { desde: hoy, hasta: addDays(hoy, 1) };
  if (r === "semana") return { desde: hoy, hasta: addDays(hoy, 7) };
  return {};
}

// ── Componente principal ──────────────────────────────────────────────────────
export function HousekeepingPage() {
  const qc = useQueryClient();
  const [rango, setRango] = useState<Rango>("hoy");
  const [filtroEstado, setFiltroEstado] = useState<EstadoHK | "">("");
  const [modalOpen, setModalOpen] = useState(false);

  const { data: tareas = [], isLoading } = useQuery({
    queryKey: ["housekeeping", rango, filtroEstado],
    queryFn: () =>
      api.housekeeping.list({
        ...rangoFechas(rango),
        ...(filtroEstado ? { estado: filtroEstado } : {}),
      }),
  });

  const { data: habitaciones = [] } = useQuery({
    queryKey: ["habitaciones"],
    queryFn: api.habitaciones.list,
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: EstadoHK }) =>
      api.housekeeping.update(id, { estado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["housekeeping"] }),
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => api.housekeeping.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["housekeeping"] }),
  });

  // KPIs (sobre todas las tareas de hoy sin filtrar)
  const { data: kpiData = [] } = useQuery({
    queryKey: ["housekeeping-kpi"],
    queryFn: () => api.housekeeping.list({ desde: hoy, hasta: addDays(hoy, 1) }),
  });
  const kpi = {
    pendientes: kpiData.filter(t => t.estado === "pendiente").length,
    enProceso:  kpiData.filter(t => t.estado === "en_proceso").length,
    completadas: kpiData.filter(t => t.estado === "completado").length,
  };

  // Agrupar por fecha
  const grupos = tareas.reduce<Record<string, TareaHousekeeping[]>>((acc, t) => {
    (acc[t.fechaProgramada] ??= []).push(t);
    return acc;
  }, {});

  const RANGOS: { id: Rango; label: string }[] = [
    { id: "hoy",    label: "Hoy" },
    { id: "semana", label: "Esta semana" },
    { id: "todo",   label: "Todas" },
  ];

  const ESTADOS: { id: EstadoHK | ""; label: string }[] = [
    { id: "",           label: "Todos" },
    { id: "pendiente",  label: "Pendientes" },
    { id: "en_proceso", label: "En proceso" },
    { id: "completado", label: "Completadas" },
    { id: "cancelado",  label: "Canceladas" },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Pendientes hoy" value={kpi.pendientes} color="text-amber-600 dark:text-amber-400" />
        <KpiCard label="En proceso"     value={kpi.enProceso}  color="text-sky-600 dark:text-sky-400" />
        <KpiCard label="Completadas hoy" value={kpi.completadas} color="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Rango */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {RANGOS.map(r => (
            <button
              key={r.id}
              onClick={() => setRango(r.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                rango === r.id
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Estado + nueva tarea */}
        <div className="flex items-center gap-2">
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value as EstadoHK | "")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-slate-600"
          >
            + Nueva tarea
          </button>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : tareas.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
          Sin tareas para el período seleccionado.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grupos)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([fecha, items]) => (
              <div key={fecha}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {fecha === hoy ? `Hoy · ${fmtFecha(fecha)}` : fmtFecha(fecha)}
                </h3>
                <div className="space-y-2">
                  {items.map(t => (
                    <TareaCard
                      key={t.id}
                      tarea={t}
                      onCambiarEstado={(estado) => cambiarEstado.mutate({ id: t.id, estado })}
                      onEliminar={() => {
                        if (confirm("¿Eliminar esta tarea?")) eliminar.mutate(t.id);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {modalOpen && (
        <NuevaTareaModal
          habitaciones={habitaciones}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["housekeeping"] });
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card rounded-xl p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ── Tarea card ────────────────────────────────────────────────────────────────
function TareaCard({
  tarea, onCambiarEstado, onEliminar,
}: {
  tarea: TareaHousekeeping;
  onCambiarEstado: (e: EstadoHK) => void;
  onEliminar: () => void;
}) {
  const tipo  = TIPO_CFG[tarea.tipo];
  const prio  = PRIO_CFG[tarea.prioridad];
  const est   = ESTADO_CFG[tarea.estado];
  const activa = tarea.estado !== "completado" && tarea.estado !== "cancelado";

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/40">
      <span className="mt-0.5 text-xl">{tipo.emoji}</span>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tipo.color}`}>
            {tipo.label}
          </span>
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
            {tarea.habitacionNombre ?? `Hab. #${tarea.habitacionId}`}
          </span>
          <span className={`text-xs ${prio.color}`}>▲ {prio.label}</span>
          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${est.chip}`}>
            {est.label}
          </span>
        </div>

        {tarea.descripcion && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">{tarea.descripcion}</p>
        )}
        {tarea.notas && (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">{tarea.notas}</p>
        )}
        {tarea.asignadoA && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            👤 {tarea.asignadoA}
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex flex-col gap-1 shrink-0">
        {tarea.estado === "pendiente" && (
          <button
            onClick={() => onCambiarEstado("en_proceso")}
            className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
          >
            Iniciar
          </button>
        )}
        {tarea.estado === "en_proceso" && (
          <button
            onClick={() => onCambiarEstado("completado")}
            className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
          >
            Completar
          </button>
        )}
        {activa && (
          <button
            onClick={() => onCambiarEstado("cancelado")}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
        )}
        <button
          onClick={onEliminar}
          className="rounded-lg px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Modal nueva tarea ─────────────────────────────────────────────────────────
function NuevaTareaModal({
  habitaciones, onClose, onCreated,
}: {
  habitaciones: { id: number; nombre: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<Partial<TareaHousekeepingCreate>>({
    tipo: "limpieza",
    prioridad: "normal",
    fechaProgramada: hoy,
  });
  const [err, setErr] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: () => {
      if (!form.habitacionId || !form.fechaProgramada) throw new Error("Completá los campos requeridos");
      return api.housekeeping.create(form as TareaHousekeepingCreate);
    },
    onSuccess: onCreated,
    onError: (e: Error) => setErr(e.message),
  });

  const field = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-5 text-lg font-bold text-slate-800 dark:text-slate-100">Nueva tarea</h2>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
            Habitación *
            <select
              value={form.habitacionId ?? ""}
              onChange={e => setForm(f => ({ ...f, habitacionId: Number(e.target.value) || undefined }))}
              className={field}
            >
              <option value="">Seleccioná…</option>
              {habitaciones.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              Tipo
              <select
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoTareaHK }))}
                className={field}
              >
                <option value="limpieza">🧹 Limpieza</option>
                <option value="mantenimiento">🔧 Mantenimiento</option>
                <option value="inspeccion">🔍 Inspección</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              Prioridad
              <select
                value={form.prioridad}
                onChange={e => setForm(f => ({ ...f, prioridad: e.target.value as PrioridadHK }))}
                className={field}
              >
                <option value="baja">Baja</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
            Fecha programada *
            <input
              type="date"
              value={form.fechaProgramada}
              onChange={e => setForm(f => ({ ...f, fechaProgramada: e.target.value }))}
              className={field}
            />
          </label>

          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
            Descripción
            <input
              type="text"
              value={form.descripcion ?? ""}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value || undefined }))}
              placeholder="Ej: Cambio de toallas y sábanas"
              className={field}
            />
          </label>

          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
            Asignado a
            <input
              type="text"
              value={form.asignadoA ?? ""}
              onChange={e => setForm(f => ({ ...f, asignadoA: e.target.value || undefined }))}
              placeholder="Nombre del encargado"
              className={field}
            />
          </label>

          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
            Notas
            <textarea
              rows={2}
              value={form.notas ?? ""}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value || undefined }))}
              className={field}
            />
          </label>
        </div>

        {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost btn-sm">Cancelar</button>
          <button
            disabled={crear.isPending}
            onClick={() => crear.mutate()}
            className="btn btn-primary btn-sm"
          >
            {crear.isPending ? "Guardando…" : "Crear tarea"}
          </button>
        </div>
      </div>
    </div>
  );
}
