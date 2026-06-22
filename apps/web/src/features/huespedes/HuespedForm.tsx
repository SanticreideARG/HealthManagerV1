import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { Huesped } from "../../lib/api.js";
import { Modal } from "../habitaciones/NuevaHabitacion.js";

/** Alta o edición de un huésped. Si recibe `huesped`, edita; si no, crea. */
export function HuespedForm({
  huesped,
  onClose,
}: {
  huesped?: Huesped;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState(huesped?.nombre ?? "");
  const [documento, setDocumento] = useState(huesped?.documento ?? "");
  const [email, setEmail] = useState(huesped?.email ?? "");
  const [telefono, setTelefono] = useState(huesped?.telefono ?? "");
  const [notas, setNotas] = useState(huesped?.notas ?? "");
  const [error, setError] = useState<string | null>(null);

  const payload = () => ({
    nombre,
    documento: documento || undefined,
    email: email || undefined,
    telefono: telefono || undefined,
    notas: notas || undefined,
  });

  const guardar = useMutation({
    mutationFn: () =>
      huesped
        ? api.huespedes.update(huesped.id, payload())
        : api.huespedes.create(payload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["huespedes"] });
      onClose();
    },
    onError: () => setError("No se pudo guardar. Revisá el email."),
  });

  return (
    <Modal titulo={huesped ? "Editar huésped" : "Nuevo huésped"} onClose={onClose}>
      <label className="block text-sm">
        Nombre *
        <input
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          placeholder="Nombre y apellido"
        />
      </label>
      <div className="flex gap-3">
        <label className="block flex-1 text-sm">
          Documento
          <input
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block flex-1 text-sm">
          Teléfono
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
      </div>
      <label className="block text-sm">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
        />
      </label>
      <label className="block text-sm">
        Preferencias / notas
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          placeholder="Alergias, pedidos especiales, etc."
        />
      </label>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        disabled={!nombre || guardar.isPending}
        onClick={() => {
          setError(null);
          guardar.mutate();
        }}
        className="mt-2 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {guardar.isPending ? "Guardando…" : "Guardar"}
      </button>
    </Modal>
  );
}
