import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api.js";
import type { Huesped } from "../../lib/api.js";
import { addDays } from "../../lib/fechas.js";
import { Modal } from "../habitaciones/NuevaHabitacion.js";

interface Props {
  habitacionId: number;
  fechaInicial: string;
  onClose: () => void;
}

type Tipo = "reserva" | "mantenimiento";

export function NuevaReserva({ habitacionId, fechaInicial, onClose }: Props) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<Tipo>("reserva");
  const [busqueda, setBusqueda] = useState("");
  const [huespedSel, setHuespedSel] = useState<Huesped | null>(null);
  const [motivo, setMotivo] = useState("");
  const [checkin, setCheckin] = useState(fechaInicial);
  const [checkout, setCheckout] = useState(addDays(fechaInicial, 1));
  const [error, setError] = useState<string | null>(null);

  const huespedesQ = useQuery({
    queryKey: ["huespedes"],
    queryFn: api.huespedes.list,
    enabled: tipo === "reserva",
  });

  const term = busqueda.trim().toLowerCase();
  const matches =
    term && !huespedSel
      ? (huespedesQ.data ?? [])
          .filter((h) => h.nombre.toLowerCase().includes(term))
          .slice(0, 6)
      : [];

  const crear = useMutation({
    mutationFn: () => {
      if (tipo === "mantenimiento") {
        return api.reservas.mantenimiento({
          habitacionId,
          checkin,
          checkout,
          motivo: motivo || undefined,
        });
      }
      return api.reservas.create({
        habitacionId,
        checkin,
        checkout,
        ...(huespedSel
          ? { huespedId: huespedSel.id }
          : { huesped: { nombre: busqueda.trim() } }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservas"] });
      qc.invalidateQueries({ queryKey: ["huespedes"] });
      onClose();
    },
    onError: (err) => {
      setError(
        err instanceof ApiError && err.esOverbooking
          ? "⚠️ Esas fechas ya están ocupadas en esta habitación."
          : "No se pudo guardar.",
      );
    },
  });

  const cotizacionQ = useQuery({
    queryKey: ["cotizar", habitacionId, checkin, checkout],
    queryFn: () => api.reservas.cotizar(habitacionId, checkin, checkout),
    enabled: tipo === "reserva" && checkout > checkin,
  });

  const input = "mt-1 w-full rounded border border-slate-300 px-2 py-1.5";
  const faltaHuesped = tipo === "reserva" && !huespedSel && !busqueda.trim();

  return (
    <Modal
      titulo={tipo === "reserva" ? "Nueva reserva" : "Bloqueo de mantenimiento"}
      onClose={onClose}
    >
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        <TipoBtn activo={tipo === "reserva"} onClick={() => setTipo("reserva")}>
          Reserva
        </TipoBtn>
        <TipoBtn
          activo={tipo === "mantenimiento"}
          onClick={() => setTipo("mantenimiento")}
        >
          🔧 Mantenimiento
        </TipoBtn>
      </div>

      {tipo === "reserva" ? (
        <div className="text-sm">
          <span className="text-slate-600">Huésped</span>
          {huespedSel ? (
            <div className="mt-1 flex items-center justify-between rounded border border-emerald-300 bg-emerald-50 px-2 py-1.5">
              <span>
                <span className="font-medium text-slate-800">
                  {huespedSel.nombre}
                </span>
                {huespedSel.documento && (
                  <span className="text-slate-400"> · {huespedSel.documento}</span>
                )}
                <span className="ml-2 text-xs text-emerald-700">existente</span>
              </span>
              <button
                onClick={() => {
                  setHuespedSel(null);
                  setBusqueda("");
                }}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                cambiar
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className={input}
                placeholder="Buscar o escribir nombre nuevo…"
              />
              {matches.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  {matches.map((h) => (
                    <li key={h.id}>
                      <button
                        onClick={() => {
                          setHuespedSel(h);
                          setBusqueda(h.nombre);
                        }}
                        className="block w-full px-3 py-1.5 text-left hover:bg-sky-50"
                      >
                        <span className="font-medium text-slate-800">
                          {h.nombre}
                        </span>
                        {(h.documento || h.email) && (
                          <span className="text-xs text-slate-400">
                            {" "}
                            · {h.documento || h.email}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {term && matches.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  Sin coincidencias — se creará un huésped nuevo.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <label className="block text-sm">
          Motivo (opcional)
          <input
            autoFocus
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={input}
            placeholder="Ej. pintura, plomería…"
          />
        </label>
      )}

      <div className="flex gap-3">
        <label className="block flex-1 text-sm">
          {tipo === "reserva" ? "Check-in" : "Desde"}
          <input
            type="date"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            className={input}
          />
        </label>
        <label className="block flex-1 text-sm">
          {tipo === "reserva" ? "Check-out" : "Hasta"}
          <input
            type="date"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            className={input}
          />
        </label>
      </div>

      {tipo === "reserva" && cotizacionQ.data && checkout > checkin && (
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-500">
            {cotizacionQ.data.noches} noche(s) · tarifas dinámicas
          </span>
          <span className="text-base font-bold text-slate-800">
            ${cotizacionQ.data.total.toLocaleString("es-AR")}
          </span>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        disabled={faltaHuesped || checkout <= checkin || crear.isPending}
        onClick={() => {
          setError(null);
          crear.mutate();
        }}
        className="mt-2 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {crear.isPending
          ? "Guardando…"
          : tipo === "reserva"
            ? "Reservar"
            : "Bloquear"}
      </button>
    </Modal>
  );
}

function TipoBtn({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
        activo ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
      }`}
    >
      {children}
    </button>
  );
}
