import logo from "../../assets/suites-man-logo.png";

const LINKS = [
  "Inicio",
  "Alojamientos",
  "Servicios",
  "Términos de uso",
  "Privacidad",
  "Contacto",
];

export function LandingFooter() {
  return (
    <footer
      id="contacto"
      className="border-t border-slate-200 bg-white dark:border-white/[0.06] dark:bg-[#0b1520]"
    >
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="h-8 w-8 rounded-xl" />
            <span className="font-bold text-slate-800 dark:text-white">
              Suites Manager
            </span>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-7 gap-y-2">
            {LINKS.map((label) => (
              <a
                key={label}
                href="#"
                className="text-sm text-slate-500 transition hover:text-slate-800 dark:text-white/40 dark:hover:text-white/80"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400 dark:border-white/[0.04] dark:text-white/25">
          © {new Date().getFullYear()} Suites Manager. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
