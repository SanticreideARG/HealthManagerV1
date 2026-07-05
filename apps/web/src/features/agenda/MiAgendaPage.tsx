import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import { AgendaPage } from "./AgendaPage.js";
import { VentanasModal } from "../profesionales/VentanasModal.js";

/** Agenda + ventanas propias, para el rol `profesional` (no ve el ABM completo). */
export function MiAgendaPage() {
  const miProfesionalQ = useQuery({ queryKey: ["mi-profesional"], queryFn: api.profesionales.me });
  const [ventanasAbiertas, setVentanasAbiertas] = useState(false);

  if (miProfesionalQ.isLoading) return <p className="text-sm text-slate-400">Cargando…</p>;

  const miProfesional = miProfesionalQ.data;
  if (!miProfesional) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
        Tu usuario no está vinculado a ningún profesional todavía. Pedile al equipo
        administrativo que te asocie desde "Profesionales".
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {miProfesional.nombre} — {miProfesional.especialidad}
        </p>
        <button
          onClick={() => setVentanasAbiertas(true)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Mis ventanas de trabajo
        </button>
      </div>

      <AgendaPage profesionalIdFijo={miProfesional.id} />

      {ventanasAbiertas && (
        <VentanasModal profesional={miProfesional} onClose={() => setVentanasAbiertas(false)} />
      )}
    </div>
  );
}
