/**
 * Hero de la landing pública. Placeholder mínimo para Fase 0 — el rediseño
 * completo (paleta, tipografía, buscador por especialidad) es Fase 2, ver
 * docs/manual-diseno.md.
 */
export function HeroCarousel({ onOpenLogin }: { onOpenLogin: () => void }) {
  return (
    <section className="relative flex h-[60vh] min-h-[420px] items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-center">
      <div className="max-w-2xl px-6">
        <span className="mb-4 inline-block rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-white/80 ring-1 ring-white/20 backdrop-blur-sm">
          Bienvenido
        </span>
        <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
          Reservá tu turno
        </h1>
        <p className="mb-7 text-base leading-relaxed text-white/70 sm:text-lg">
          Encontrá al profesional adecuado y reservá en pocos pasos.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="#profesionales"
            className="rounded-lg bg-[#0058be] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#2170e4] active:scale-[0.98]"
          >
            Ver profesionales
          </a>
          <button
            onClick={onOpenLogin}
            className="rounded-lg border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    </section>
  );
}
