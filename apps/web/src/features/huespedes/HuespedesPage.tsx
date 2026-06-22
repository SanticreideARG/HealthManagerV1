import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { Huesped } from "../../lib/api.js";
import { HuespedForm } from "./HuespedForm.js";
import { HuespedDetalle } from "./HuespedDetalle.js";

export function HuespedesPage() {
  const huespedesQ = useQuery({
    queryKey: ["huespedes"],
    queryFn: api.huespedes.list,
  });
  const [creando, setCreando] = useState(false);
  const [sel, setSel] = useState<Huesped | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const filtrados = (huespedesQ.data ?? []).filter((h) =>
    h.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar huésped…"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button
          onClick={() => setCreando(true)}
          className="ml-auto rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Huésped
        </button>
      </div>

      {huespedesQ.isLoading && (
        <p className="text-sm text-slate-400">Cargando…</p>
      )}
      {huespedesQ.isError && (
        <p className="text-sm text-rose-600">
          No se pudo conectar con la API. ¿Está corriendo en :3001?
        </p>
      )}

      {huespedesQ.data && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 font-semibold">Nombre</th>
                <th className="px-4 py-2 font-semibold">Documento</th>
                <th className="px-4 py-2 font-semibold">Contacto</th>
                <th className="px-4 py-2 font-semibold">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((h) => (
                <tr
                  key={h.id}
                  onClick={() => setSel(h)}
                  className="cursor-pointer hover:bg-sky-50"
                >
                  <td className="px-4 py-2 font-medium text-slate-800">
                    {h.nombre}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {h.documento || "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {h.email || h.telefono || "—"}
                  </td>
                  <td className="max-w-[16rem] truncate px-4 py-2 text-slate-400">
                    {h.notas || "—"}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    {busqueda
                      ? "Sin resultados."
                      : "No hay huéspedes todavía."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {creando && <HuespedForm onClose={() => setCreando(false)} />}
      {sel && <HuespedDetalle huesped={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
