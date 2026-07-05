import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api.js";
import type { Paciente } from "../../lib/api.js";
import { Modal } from "../../components/Modal.js";

export function PacientesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const pacientesQ = useQuery({ queryKey: ["pacientes", q], queryFn: () => api.pacientes.list(q || undefined) });
  const [editando, setEditando] = useState<Paciente | "nuevo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eliminar = useMutation({
    mutationFn: (id: number) => api.pacientes.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pacientes"] }),
    onError: (e) => setError(e instanceof ApiError ? e.message : "No se pudo eliminar."),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o documento…"
          className="min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          onClick={() => setEditando("nuevo")}
          className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600"
        >
          + Paciente
        </button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {pacientesQ.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
      {pacientesQ.isError && <p className="text-sm text-rose-600">No se pudo cargar el listado.</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Obra social</th>
              <th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {pacientesQ.data?.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">{p.nombre}</td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{p.documento ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                  <div>{p.email ?? "—"}</div>
                  <div className="text-xs text-slate-400">{p.telefono ?? ""}</div>
                </td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                  {p.obraSocialNombre ?? <span className="text-xs italic text-slate-400">Particular</span>}
                </td>
                <td className="px-2 py-2.5 text-right">
                  <button
                    onClick={() => setEditando(p)}
                    className="mr-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Editar"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => {
                      setError(null);
                      if (confirm(`¿Eliminar a ${p.nombre}?`)) eliminar.mutate(p.id);
                    }}
                    className="text-slate-400 hover:text-rose-600"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {pacientesQ.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  {q ? "Sin resultados para esa búsqueda." : "Todavía no hay pacientes cargados."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editando && <PacienteModal paciente={editando === "nuevo" ? null : editando} onClose={() => setEditando(null)} />}
    </div>
  );
}

function PacienteModal({ paciente, onClose }: { paciente: Paciente | null; onClose: () => void }) {
  const qc = useQueryClient();
  const obrasSocialesQ = useQuery({ queryKey: ["obras-sociales"], queryFn: api.obrasSociales.list });

  const [nombre, setNombre] = useState(paciente?.nombre ?? "");
  const [documento, setDocumento] = useState(paciente?.documento ?? "");
  const [email, setEmail] = useState(paciente?.email ?? "");
  const [telefono, setTelefono] = useState(paciente?.telefono ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(paciente?.fechaNacimiento ?? "");
  const [obraSocialId, setObraSocialId] = useState<number | "">(paciente?.obraSocialId ?? "");
  const [nroAfiliado, setNroAfiliado] = useState(paciente?.nroAfiliado ?? "");
  const [notas, setNotas] = useState(paciente?.notas ?? "");
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: () => {
      const payload = {
        nombre,
        documento: documento || undefined,
        email: email || undefined,
        telefono: telefono || undefined,
        fechaNacimiento: fechaNacimiento || undefined,
        obraSocialId: obraSocialId === "" ? null : obraSocialId,
        nroAfiliado: nroAfiliado || undefined,
        notas: notas || undefined,
      };
      return paciente ? api.pacientes.update(paciente.id, payload) : api.pacientes.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pacientes"] });
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "No se pudo guardar."),
  });

  return (
    <Modal titulo={paciente ? "Editar paciente" : "Nuevo paciente"} onClose={onClose}>
      <div className="space-y-3">
        <Campo label="Nombre">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} placeholder="Nombre y apellido" />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Documento">
            <input value={documento} onChange={(e) => setDocumento(e.target.value)} className={input} placeholder="DNI" />
          </Campo>
          <Campo label="Fecha de nacimiento">
            <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} className={input} />
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </Campo>
          <Campo label="Teléfono">
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={input} />
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Obra social">
            <select
              value={obraSocialId}
              onChange={(e) => setObraSocialId(e.target.value ? Number(e.target.value) : "")}
              className={input}
            >
              <option value="">Particular</option>
              {obrasSocialesQ.data?.map((os) => (
                <option key={os.id} value={os.id}>{os.nombre}</option>
              ))}
            </select>
          </Campo>
          <Campo label="N° de afiliado">
            <input value={nroAfiliado} onChange={(e) => setNroAfiliado(e.target.value)} className={input} />
          </Campo>
        </div>
        <Campo label="Notas">
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} className={`${input} h-16 resize-none`} />
        </Campo>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          disabled={!nombre.trim() || guardar.isPending}
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
