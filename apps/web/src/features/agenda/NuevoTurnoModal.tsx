import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api.js";
import type { Paciente } from "../../lib/api.js";
import { Modal } from "../../components/Modal.js";

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

/**
 * Alta de turno. Si `slot` viene definido, el horario queda fijo (se tomó de
 * la disponibilidad calculada). Si es null, es un sobreturno: horario libre,
 * a propósito fuera de la ventana de trabajo normal.
 */
export function NuevoTurnoModal({
  profesionalId,
  fecha,
  slot,
  onClose,
  onCreated,
}: {
  profesionalId: number;
  fecha: string;
  slot: { horaInicio: string; horaFin: string } | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const esSobreturno = slot === null;
  const [horaInicio, setHoraInicio] = useState(slot?.horaInicio ?? "09:00");
  const [horaFin, setHoraFin] = useState(slot?.horaFin ?? "09:30");

  const [modoPaciente, setModoPaciente] = useState<"buscar" | "nuevo">("buscar");
  const [q, setQ] = useState("");
  const [pacienteId, setPacienteId] = useState<number | null>(null);
  const [pacienteSel, setPacienteSel] = useState<Paciente | null>(null);

  const [nombreNuevo, setNombreNuevo] = useState("");
  const [documentoNuevo, setDocumentoNuevo] = useState("");
  const [telefonoNuevo, setTelefonoNuevo] = useState("");

  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pacientesQ = useQuery({
    queryKey: ["pacientes-buscar", q],
    queryFn: () => api.pacientes.list(q || undefined),
    enabled: modoPaciente === "buscar" && q.length > 0,
  });

  const qc = useQueryClient();
  const crear = useMutation({
    mutationFn: () => {
      const inicio = `${fecha}T${horaInicio}:00-03:00`;
      const fin = `${fecha}T${horaFin}:00-03:00`;
      return api.turnos.create({
        profesionalId,
        inicio,
        fin,
        esSobreturno,
        esParticular: false,
        origen: "administrativo",
        notas: notas || undefined,
        ...(modoPaciente === "buscar"
          ? { pacienteId: pacienteId ?? undefined }
          : { paciente: { nombre: nombreNuevo, documento: documentoNuevo || undefined, telefono: telefonoNuevo || undefined } }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["turnos"] });
      qc.invalidateQueries({ queryKey: ["disponibilidad"] });
      onCreated();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "No se pudo crear el turno."),
  });

  const pacienteListo = modoPaciente === "buscar" ? pacienteId != null : nombreNuevo.trim().length > 0;
  const horarioValido = horaFin > horaInicio;

  return (
    <Modal titulo={esSobreturno ? "Nuevo sobreturno" : "Nuevo turno"} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          {fecha} — {esSobreturno ? "sobreturno (fuera de la grilla normal)" : "horario tomado de la disponibilidad"}
        </p>

        {esSobreturno ? (
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Desde">
              <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={input} />
            </Campo>
            <Campo label="Hasta">
              <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className={input} />
            </Campo>
          </div>
        ) : (
          <p className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium tabular-nums text-slate-700 dark:border-slate-700 dark:text-slate-200">
            {horaInicio} – {horaFin}
          </p>
        )}
        {esSobreturno && !horarioValido && <p className="text-xs text-rose-600">El fin debe ser posterior al inicio.</p>}

        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
          <button
            onClick={() => setModoPaciente("buscar")}
            className={`flex-1 rounded px-2 py-1.5 font-medium transition-colors ${
              modoPaciente === "buscar"
                ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Paciente existente
          </button>
          <button
            onClick={() => setModoPaciente("nuevo")}
            className={`flex-1 rounded px-2 py-1.5 font-medium transition-colors ${
              modoPaciente === "nuevo"
                ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Paciente nuevo
          </button>
        </div>

        {modoPaciente === "buscar" ? (
          <div>
            <input
              value={pacienteSel ? pacienteSel.nombre : q}
              onChange={(e) => {
                setPacienteSel(null);
                setPacienteId(null);
                setQ(e.target.value);
              }}
              placeholder="Buscar por nombre o documento…"
              className={input}
            />
            {!pacienteSel && q.length > 0 && (
              <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                {pacientesQ.data?.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPacienteSel(p);
                      setPacienteId(p.id);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {p.nombre} {p.documento && <span className="text-xs text-slate-400">({p.documento})</span>}
                  </button>
                ))}
                {pacientesQ.data?.length === 0 && (
                  <p className="px-3 py-1.5 text-sm text-slate-400">Sin resultados.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Campo label="Nombre">
              <input value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} className={input} />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Documento">
                <input value={documentoNuevo} onChange={(e) => setDocumentoNuevo(e.target.value)} className={input} />
              </Campo>
              <Campo label="Teléfono">
                <input value={telefonoNuevo} onChange={(e) => setTelefonoNuevo(e.target.value)} className={input} />
              </Campo>
            </div>
          </div>
        )}

        <Campo label="Notas">
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} className={`${input} h-16 resize-none`} />
        </Campo>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          disabled={!pacienteListo || !horarioValido || crear.isPending}
          onClick={() => {
            setError(null);
            crear.mutate();
          }}
          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
        >
          {crear.isPending ? "Guardando…" : esSobreturno ? "Crear sobreturno" : "Confirmar turno"}
        </button>
      </div>
    </Modal>
  );
}
