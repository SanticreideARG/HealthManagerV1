import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { TurnoDelDia } from "../../lib/api.js";
import { ESTADO_INFO, horaArDe } from "../../lib/turnoDisplay.js";

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

async function exportarExcel(fecha: string, filas: TurnoDelDia[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Lista del día");
  ws.columns = [
    { header: "Hora", key: "hora", width: 14 },
    { header: "Profesional", key: "profesional", width: 28 },
    { header: "Especialidad", key: "especialidad", width: 20 },
    { header: "Paciente", key: "paciente", width: 28 },
    { header: "Documento", key: "documento", width: 14 },
    { header: "Teléfono", key: "telefono", width: 18 },
    { header: "Obra social", key: "obraSocial", width: 18 },
    { header: "Estado", key: "estado", width: 14 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const t of filas) {
    ws.addRow({
      hora: `${horaArDe(t.inicio)}–${horaArDe(t.fin)}`,
      profesional: t.profesionalNombre,
      especialidad: t.especialidad,
      paciente: t.estado === "bloqueo" ? (t.notas ?? "Bloqueo") : (t.pacienteNombre ?? "—"),
      documento: t.documento ?? "",
      telefono: t.telefono ?? "",
      obraSocial: t.esParticular ? "Particular" : (t.obraSocialNombre ?? ""),
      estado: ESTADO_INFO[t.estado].label,
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lista-del-dia-${fecha}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ListaDelDiaPage() {
  const [fecha, setFecha] = useState(hoyISO());
  const listaQ = useQuery({ queryKey: ["lista-dia", fecha], queryFn: () => api.turnos.listaDelDia(fecha) });
  const [exportando, setExportando] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          onClick={() => setFecha(hoyISO())}
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Hoy
        </button>
        <button
          disabled={exportando || !listaQ.data || listaQ.data.length === 0}
          onClick={async () => {
            setExportando(true);
            try {
              await exportarExcel(fecha, listaQ.data ?? []);
            } finally {
              setExportando(false);
            }
          }}
          className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {exportando ? "Exportando…" : "⬇ Excel"}
        </button>
      </div>

      {listaQ.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
      {listaQ.isError && <p className="text-sm text-rose-600">No se pudo cargar la lista.</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="px-4 py-3">Hora</th>
              <th className="px-4 py-3">Profesional</th>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Obra social</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {listaQ.data?.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">
                  {horaArDe(t.inicio)}–{horaArDe(t.fin)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-slate-800 dark:text-slate-100">{t.profesionalNombre}</div>
                  <div className="text-xs text-slate-400">{t.especialidad}</div>
                </td>
                <td className="px-4 py-2.5">
                  {t.estado === "bloqueo" ? (
                    <span className="text-slate-400">{t.notas ?? "Bloqueo"}</span>
                  ) : (
                    <>
                      <div className="text-slate-700 dark:text-slate-200">{t.pacienteNombre ?? "—"}</div>
                      {(t.documento || t.telefono) && (
                        <div className="text-xs text-slate-400">
                          {[t.documento, t.telefono].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                  {t.estado === "bloqueo" ? "—" : t.esParticular ? "Particular" : (t.obraSocialNombre ?? "—")}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_INFO[t.estado].className}`}>
                    {ESTADO_INFO[t.estado].label}
                  </span>
                </td>
              </tr>
            ))}
            {listaQ.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Sin turnos para esta fecha.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
