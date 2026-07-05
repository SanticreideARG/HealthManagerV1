import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import { NavBar } from "./NavBar.js";
import { HeroCarousel } from "./HeroCarousel.js";
import { LoginModal } from "./LoginModal.js";
import { ServiciosModal } from "./ServiciosModal.js";
import { ContactoModal } from "./ContactoModal.js";
import { LandingFooter } from "./LandingFooter.js";

/**
 * Landing pública. El buscador por especialidad/profesional (héroe según
 * docs/manual-diseno.md) y la reserva self-service son Fase 2 — acá va un
 * listado simple de profesionales activos.
 */
export function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [serviciosOpen, setServiciosOpen] = useState(false);
  const [contactoOpen, setContactoOpen] = useState(false);

  const { data: profesionales, isLoading, isError } = useQuery({
    queryKey: ["public.profesionales"],
    queryFn: api.public.profesionales,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return (
    <div className="min-h-screen bg-[#f8f9ff] font-[Inter,sans-serif] text-slate-800 dark:bg-[#0b1c30] dark:text-[#f8f9ff]">
      <NavBar
        onOpenLogin={() => setLoginOpen(true)}
        onOpenServicios={() => setServiciosOpen(true)}
        onOpenContacto={() => setContactoOpen(true)}
      />

      <HeroCarousel onOpenLogin={() => setLoginOpen(true)} />

      <section id="profesionales" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <span className="mb-3 inline-block rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:bg-white/[0.06] dark:text-white/50">
            Nuestros profesionales
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Encontrá al profesional adecuado
          </h2>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-white/[0.04]" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="font-medium text-slate-700 dark:text-white/70">
              No se pudo cargar el listado de profesionales.
            </p>
          </div>
        ) : !profesionales || profesionales.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-slate-500 dark:text-white/50">Próximamente disponibles.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {profesionales.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.03]"
              >
                <h3 className="font-semibold text-slate-800 dark:text-white">{p.nombre}</h3>
                <p className="text-sm text-slate-500 dark:text-white/50">{p.especialidad}</p>
                {p.ubicacion && (
                  <p className="mt-1 text-xs text-slate-400 dark:text-white/30">📍 {p.ubicacion}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <LandingFooter />

      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
      {serviciosOpen && <ServiciosModal onClose={() => setServiciosOpen(false)} />}
      {contactoOpen && <ContactoModal onClose={() => setContactoOpen(false)} />}
    </div>
  );
}
