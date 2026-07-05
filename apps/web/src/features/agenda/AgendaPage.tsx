import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { Turno, DisponibilidadSlot } from "../../lib/api.js";
import { ESTADO_INFO, horaArDe } from "../../lib/turnoDisplay.js";
import { NuevoTurnoModal } from "./NuevoTurnoModal.js";
import { BloqueoModal } from "./BloqueoModal.js";

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * `profesionalIdFijo` la usa la vista propia del rol `profesional` (ver
 * MiAgendaPage.tsx): oculta el selector y evita pedir el listado completo de
 * profesionales, al que ese rol no tiene acceso (GET /profesionales es staff).
 */
export function AgendaPage({ profesionalIdFijo }: { profesionalIdFijo?: number } = {}) {
  const qc = useQueryClient();
  const profesionalesQ = useQuery({
    queryKey: ["profesionales"],
    queryFn: api.profesionales.list,
    enabled: profesionalIdFijo == null,
  });
  const activos = profesionalesQ.data?.filter((p) => p.activo) ?? [];

  const [profesionalIdSel, setProfesionalIdSel] = useState<number | null>(null);
  const [fecha, setFecha] = useState(hoyISO());
  const [nuevoSlot, setNuevoSlot] = useState<DisponibilidadSlot | "sobreturno" | null>(null);
  const [bloqueoAbierto, setBloqueoAbierto] = useState(false);

  const pid = profesionalIdFijo ?? profesionalIdSel ?? activos[0]?.id ?? null;

  const disponibilidadQ = useQuery({
    queryKey: ["disponibilidad", pid, fecha],
    queryFn: () => api.turnos.disponibilidad(pid!, fecha),
    enabled: pid != null,
  });

  const turnosQ = useQuery({
    queryKey: ["turnos", pid, fecha],
    queryFn: () => {
      const desde = new Date(`${fecha}T00:00:00-03:00`);
      const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000);
      return api.turnos.list(pid!, desde.toISOString(), hasta.toISOString());
    },
    enabled: pid != null,
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["turnos", pid, fecha] });
    qc.invalidateQueries({ queryKey: ["disponibilidad", pid, fecha] });
  };
  const confirmar = useMutation({ mutationFn: (id: number) => api.turnos.confirmar(id), onSuccess: invalidar });
  const arribo = useMutation({ mutationFn: (id: number) => api.turnos.arribo(id), onSuccess: invalidar });
  const atendido = useMutation({ mutationFn: (id: number) => api.turnos.atendido(id), onSuccess: invalidar });
  const ausente = useMutation({ mutationFn: (id: number) => api.turnos.ausente(id), onSuccess: invalidar });
  const cancelar = useMutation({ mutationFn: (id: number) => api.turnos.cancelar(id), onSuccess: invalidar });

  if (profesionalIdFijo == null) {
    if (profesionalesQ.isLoading) return <p className="text-sm text-slate-400">Cargando…</p>;
    if (activos.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
          No hay profesionales activos. Cargá al menos uno en "Profesionales" para ver la agenda.
        </div>
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {profesionalIdFijo == null && (
          <select
            value={pid ?? ""}
            onChange={(e) => setProfesionalIdSel(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {activos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre} — {p.especialidad}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1">
          <button onClick={() => setFecha(addDaysISO(fecha, -1))} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
            ← Anterior
          </button>
          <button onClick={() => setFecha(hoyISO())} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
            Hoy
          </button>
          <button onClick={() => setFecha(addDaysISO(fecha, 1))} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
            Siguiente →
          </button>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
        </div>

        <div className="ml-auto flex gap-2">
          <button onClick={() => setNuevoSlot("sobreturno")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
            + Sobreturno
          </button>
          <button onClick={() => setBloqueoAbierto(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
            + Bloqueo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Turnos del día</h2>
          {turnosQ.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
          {turnosQ.data?.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
              Sin turnos para esta fecha.
            </p>
          )}
          <div className="space-y-2">
            {turnosQ.data?.map((t) => (
              <TurnoRow
                key={t.id}
                turno={t}
                onConfirmar={() => confirmar.mutate(t.id)}
                onArribo={() => arribo.mutate(t.id)}
                onAtendido={() => atendido.mutate(t.id)}
                onAusente={() => ausente.mutate(t.id)}
                onCancelar={() => {
                  if (confirm("¿Cancelar este turno?")) cancelar.mutate(t.id);
                }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Horarios disponibles</h2>
          {disponibilidadQ.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
          <div className="flex flex-wrap gap-2">
            {disponibilidadQ.data?.slots.map((s) => (
              <button
                key={s.horaInicio}
                onClick={() => setNuevoSlot(s)}
                className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium tabular-nums text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
              >
                {s.horaInicio}
              </button>
            ))}
            {disponibilidadQ.data?.slots.length === 0 && (
              <p className="text-sm text-slate-400">Sin horarios libres para esta fecha.</p>
            )}
          </div>
        </div>
      </div>

      {nuevoSlot && pid != null && (
        <NuevoTurnoModal
          profesionalId={pid}
          fecha={fecha}
          slot={nuevoSlot === "sobreturno" ? null : nuevoSlot}
          onClose={() => setNuevoSlot(null)}
          onCreated={() => setNuevoSlot(null)}
        />
      )}
      {bloqueoAbierto && pid != null && (
        <BloqueoModal
          profesionalId={pid}
          fecha={fecha}
          onClose={() => setBloqueoAbierto(false)}
          onCreated={() => setBloqueoAbierto(false)}
        />
      )}
    </div>
  );
}

function AccionBtn({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-2 py-1 text-xs font-medium ${
        danger
          ? "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40"
          : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function TurnoRow({
  turno: t,
  onConfirmar,
  onArribo,
  onAtendido,
  onAusente,
  onCancelar,
}: {
  turno: Turno;
  onConfirmar: () => void;
  onArribo: () => void;
  onAtendido: () => void;
  onAusente: () => void;
  onCancelar: () => void;
}) {
  const activo = t.estado === "solicitado" || t.estado === "confirmado" || t.estado === "en_sala";
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        t.estado === "bloqueo"
          ? "border-dashed border-slate-300 dark:border-slate-600"
          : "border-slate-200 dark:border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium tabular-nums text-slate-800 dark:text-slate-100">
          {horaArDe(t.inicio)}–{horaArDe(t.fin)}
          {t.esSobreturno && (
            <span className="ml-2 rounded-full border border-dashed border-slate-300 px-1.5 py-0.5 text-[10px] font-normal text-slate-500 dark:border-slate-600">
              Sobreturno
            </span>
          )}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_INFO[t.estado].className}`}>
          {ESTADO_INFO[t.estado].label}
        </span>
      </div>

      {t.estado === "bloqueo" ? (
        <p className="mt-0.5 text-slate-400">{t.notas ?? "Bloqueo de agenda"}</p>
      ) : (
        <>
          <p className="mt-0.5 text-slate-600 dark:text-slate-300">
            {t.paciente ?? "—"}
            {t.esParticular && <span className="ml-1 text-xs text-slate-400">(particular)</span>}
          </p>
          {t.notas && <p className="mt-0.5 text-xs text-slate-400">{t.notas}</p>}
        </>
      )}

      {t.estado !== "bloqueo" && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {t.estado === "solicitado" && <AccionBtn onClick={onConfirmar}>Confirmar</AccionBtn>}
          {t.estado === "confirmado" && <AccionBtn onClick={onArribo}>Marcar arribo</AccionBtn>}
          {t.estado === "en_sala" && <AccionBtn onClick={onAtendido}>Marcar atendido</AccionBtn>}
          {activo && <AccionBtn danger onClick={onAusente}>Ausente</AccionBtn>}
          {t.estado !== "cancelado" && t.estado !== "atendido" && (
            <AccionBtn danger onClick={onCancelar}>Cancelar</AccionBtn>
          )}
        </div>
      )}
      {t.estado === "bloqueo" && (
        <div className="mt-1.5">
          <AccionBtn danger onClick={onCancelar}>Eliminar bloqueo</AccionBtn>
        </div>
      )}
    </div>
  );
}
