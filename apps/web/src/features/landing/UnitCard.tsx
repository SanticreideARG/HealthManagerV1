import type { PublicHabitacion } from "../../lib/types.js";

const TIPO_STYLE: Record<string, { gradient: string; emoji: string }> = {
  Cabaña: {
    gradient: "from-stone-700 via-stone-800 to-stone-900",
    emoji: "🏕️",
  },
  Suite: {
    gradient: "from-blue-700 via-blue-800 to-slate-900",
    emoji: "🛎️",
  },
  Standard: {
    gradient: "from-slate-600 via-slate-700 to-slate-800",
    emoji: "🛏️",
  },
};

const DEFAULT_STYLE = { gradient: "from-slate-600 to-slate-800", emoji: "🏨" };

function fmtPrecio(str: string) {
  const n = Number(str);
  if (Number.isNaN(n)) return str;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export function UnitCard({
  unit,
  onReservar,
}: {
  unit: PublicHabitacion;
  onReservar: (id: number) => void;
}) {
  const style = TIPO_STYLE[unit.tipo] ?? DEFAULT_STYLE;

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-[#0058be] dark:hover:bg-white/[0.05]">
      {/* Imagen placeholder */}
      <div
        className={`flex h-44 items-center justify-center bg-gradient-to-br ${style.gradient}`}
      >
        <span className="select-none text-5xl">{style.emoji}</span>
      </div>

      <div className="p-5">
        <span className="mb-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest text-slate-600 dark:bg-white/[0.06] dark:text-white/60">
          {unit.tipo}
        </span>

        <h3 className="mb-2 text-base font-bold text-slate-800 dark:text-white">
          {unit.nombre}
        </h3>

        <div className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 dark:text-white/50">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>
            Hasta {unit.capacidad}{" "}
            {unit.capacidad === 1 ? "persona" : "personas"}
          </span>
        </div>

        <div className="mb-4 flex items-baseline gap-1">
          <span className="text-xl font-bold text-slate-900 dark:text-white">
            {fmtPrecio(unit.tarifaBase)}
          </span>
          <span className="text-sm text-slate-400 dark:text-white/40">
            / noche
          </span>
        </div>

        <button
          onClick={() => onReservar(unit.id)}
          className="w-full rounded-lg bg-[#0058be] py-2.5 text-sm font-semibold text-white transition hover:bg-[#2170e4] active:scale-[0.98]"
        >
          Consultar disponibilidad
        </button>
      </div>
    </article>
  );
}
