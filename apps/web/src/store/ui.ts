import { create } from "zustand";

/** Estado de UI puro (no de servidor). El estado de servidor vive en React Query. */
interface UiState {
  tema: "light" | "dark";
  toggleTema: () => void;
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
  tema: temaInicial(),
  toggleTema: () =>
    set((s) => {
      const tema = s.tema === "dark" ? "light" : "dark";
      localStorage.setItem("tema", tema);
      document.documentElement.classList.toggle("dark", tema === "dark");
      return { tema };
    }),
}));
