import { useState, useEffect, useCallback } from "react";
import img1 from "../../assets/example1.jpg";
import img2 from "../../assets/example2.jpg";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – nombre con espacio, Vite lo resuelve correctamente
import img3 from "../../assets/example 3.jpg";

const SLIDES = [
  {
    img: img1 as string,
    chip: "Bienvenido",
    title: "Experiencia de\nLujo Definida",
    subtitle:
      "Gestión inteligente para las propiedades más exclusivas del mundo.",
    cta: "Ver alojamientos",
    ctaHref: "#alojamientos",
  },
  {
    img: img2 as string,
    chip: "Confort premium",
    title: "Confort en\nla Gran Ciudad",
    subtitle:
      "Suites ejecutivas con vistas panorámicas y servicios de primera clase.",
    cta: "Buscar disponibilidad",
    ctaHref: "#alojamientos",
  },
  {
    img: img3,
    chip: "Exclusividad",
    title: "Refugios\nExclusivos",
    subtitle:
      "Privacidad absoluta y diseño de vanguardia en cada detalle.",
    cta: "Conocé los alojamientos",
    ctaHref: "#alojamientos",
  },
];

export function HeroCarousel({ onOpenLogin }: { onOpenLogin: () => void }) {
  const [idx, setIdx] = useState(0);

  const next = useCallback(
    () => setIdx((i) => (i + 1) % SLIDES.length),
    [],
  );
  const prev = () => setIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    const t = setInterval(next, 5500);
    return () => clearInterval(t);
  }, [next]);

  const slide = SLIDES[idx]!;

  return (
    <section className="group relative h-[70vh] min-h-[520px] overflow-hidden">
      {/* Imagen de fondo */}
      {SLIDES.map((s, i) => (
        <img
          key={i}
          src={s.img}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover brightness-75 transition-opacity duration-700 ${
            i === idx ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/* Gradient overlay — refuerza legibilidad del texto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />

      {/* Contenido — posicionado abajo-izquierda como el mockup */}
      <div className="absolute bottom-20 left-8 z-10 max-w-2xl md:left-14 lg:left-16">
        <span className="mb-4 inline-block rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-white/80 ring-1 ring-white/20 backdrop-blur-sm">
          {slide.chip}
        </span>
        <h1 className="mb-4 whitespace-pre-line text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
          {slide.title}
        </h1>
        <p className="mb-7 max-w-md text-base leading-relaxed text-blue-100/80 sm:text-lg">
          {slide.subtitle}
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={slide.ctaHref}
            className="rounded-lg bg-[#0058be] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#2170e4] active:scale-[0.98]"
          >
            {slide.cta}
          </a>
          <button
            onClick={onOpenLogin}
            className="rounded-lg border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Iniciar sesión
          </button>
        </div>
      </div>

      {/* Controles prev / next — visibles al hover */}
      <button
        onClick={prev}
        aria-label="Anterior"
        className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white opacity-0 backdrop-blur-md transition hover:bg-white/20 group-hover:opacity-100"
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        onClick={next}
        aria-label="Siguiente"
        className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white opacity-0 backdrop-blur-md transition hover:bg-white/20 group-hover:opacity-100"
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Dots */}
      <div className="absolute bottom-7 left-8 flex gap-2 md:left-14 lg:left-16">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === idx ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
