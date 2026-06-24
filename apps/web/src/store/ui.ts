import { create } from "zustand";

/** Estado de UI puro (no de servidor). El estado de servidor vive en React Query. */
interface UiState {
  // ancla del planner: primer día visible (YYYY-MM-DD)
  fechaAncla: string;
  diasVisibles: number;
  setFechaAncla: (f: string) => void;
  setDiasVisibles: (n: number) => void;
  avanzar: (dias: number) => void;
  verMes: () => void; // ancla = 1° del mes actual, diasVisibles = días del mes
  verQuincena: () => void; // 14 días desde hoy
  tema: "light" | "dark";
  toggleTema: () => void;
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Lee el tema guardado (o el del sistema) y aplica la clase en <html>. */
function temaInicial(): "light" | "dark" {
  const guardado =
    typeof localStorage !== "undefined" ? localStorage.getItem("tema") : null;
  const tema: "light" | "dark" =
    guardado === "dark" || guardado === "light"
      ? guardado
      : typeof window !== "undefined" &&
          window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", tema === "dark");
  }
  return tema;
}

export const useUi = create<UiState>((set) => ({
  fechaAncla: hoyISO(),
  diasVisibles: 14,
  setFechaAncla: (fechaAncla) => set({ fechaAncla }),
  setDiasVisibles: (diasVisibles) => set({ diasVisibles }),
  avanzar: (dias) =>
    set((s) => {
      const d = new Date(s.fechaAncla + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + dias);
      return { fechaAncla: d.toISOString().slice(0, 10) };
    }),
  verMes: () =>
    set((s) => {
      const d = new Date(s.fechaAncla + "T00:00:00Z");
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const dias = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      return {
        fechaAncla: `${y}-${String(m + 1).padStart(2, "0")}-01`,
        diasVisibles: dias,
      };
    }),
  verQuincena: () => set({ fechaAncla: hoyISO(), diasVisibles: 14 }),
  tema: temaInicial(),
  toggleTema: () =>
    set((s) => {
      const tema = s.tema === "dark" ? "light" : "dark";
      localStorage.setItem("tema", tema);
      document.documentElement.classList.toggle("dark", tema === "dark");
      return { tema };
    }),
}));
