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
  const alojadosQ = useQuery({
    queryKey: ["huespedes.alojados"],
    queryFn: api.huespedes.alojados,
  });

  const [creando, setCreando] = useState(false);
  const [sel, setSel] = useState<Huesped | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const filtrados = (huespedesQ.data ?? []).filter((h) =>
    h.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  function abrirDesdeAlojado(id: number) {
    const h = huespedesQ.data?.find((x) => x.id === id);
    if (h) setSel(h);
  }

  return (
    <div className="space-y-8">
      {/* ── Alojados ahora ── */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Alojados ahora
        </h3>

        {alojadosQ.isLoading && (
          <p className="text-sm text-slate-400">Cargando…</p>
        )}

        {alojadosQ.data && alojadosQ.data.length === 0 && (
          <p className="text-sm text-slate-400">Sin check-ins activos en este momento.</p>
        )}

        {alojadosQ.data && alojadosQ.data.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alojadosQ.data.map((a) => (
              <button
                key={a.reservaId}
                onClick={() => abrirDesdeAlojado(a.id)}
                className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:hover:border-emerald-600"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-sm font-bold text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200">
                  {a.nombre[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                    {a.nombre}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {a.habitacion} · desde {a.checkin}
                  </p>
                  {(a.email || a.telefono) && (
                    <p className="truncate text-xs text-slate-400">
                      {a.email ?? a.telefono}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Historial de clientes ── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Historial de clientes
          </h3>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar…"
            className="ml-auto w-full max-w-xs rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            onClick={() => setCreando(true)}
            className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
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
                      {h.tipoDocumento && h.documento
                        ? `${h.tipoDocumento} ${h.documento}`
                        : (h.documento || "—")}
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
                      {busqueda ? "Sin resultados." : "No hay huéspedes todavía."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {creando && <HuespedForm onClose={() => setCreando(false)} />}
      {sel && <HuespedDetalle huesped={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
