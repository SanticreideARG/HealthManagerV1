import { useState } from "react";

interface Props {
  onSearch: (checkin: string, checkout: string, huespedes: number) => void;
}

export function BookingPanel({ onSearch }: Props) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [huespedes, setHuespedes] = useState(2);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(checkin, checkout, huespedes);
  }

  return (
    <div
      id="buscar"
      className="sticky top-24 rounded-xl border border-slate-200 bg-white p-6 shadow-md dark:border-white/[0.08] dark:bg-white/[0.03]"
    >
      <h2 className="mb-5 text-lg font-bold text-slate-800 dark:text-white">
        Reserva tu Suite
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-[#0058be]">
            Check-in
          </label>
          <input
            type="date"
            min={hoy}
            value={checkin}
            onChange={(e) => {
              setCheckin(e.target.value);
              if (checkout && e.target.value >= checkout) setCheckout("");
            }}
            className="field dark:border-white/10 dark:bg-[#1a2b42] dark:text-white dark:[color-scheme:dark]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-[#0058be]">
            Check-out
          </label>
          <input
            type="date"
            min={checkin || hoy}
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            className="field dark:border-white/10 dark:bg-[#1a2b42] dark:text-white dark:[color-scheme:dark]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-[#0058be]">
            Huéspedes
          </label>
          <select
            value={huespedes}
            onChange={(e) => setHuespedes(Number(e.target.value))}
            className="field dark:border-white/10 dark:bg-[#1a2b42] dark:text-white"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "persona" : "personas"}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-[#0058be] py-3 text-sm font-bold text-white transition hover:bg-[#2170e4] active:scale-[0.98]"
        >
          Buscar alojamientos
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-400 dark:text-white/30">
        Sin cargo por consulta · Confirmación inmediata
      </p>
    </div>
  );
}
