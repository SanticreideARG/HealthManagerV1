import { useState } from "react";
import { signIn, signUp } from "../../lib/auth.js";
import logo from "../../assets/suites-man-logo.png";

/** Pantalla de acceso al panel (email/password). Permite iniciar sesión o,
 *  con el toggle, crear una cuenta. */
export function LoginPage() {
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recordar, setRecordar] = useState(true);
  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const enviar = async () => {
    setError(null);
    setCargando(true);
    try {
      const res =
        modo === "login"
          ? await signIn.email({ email, password, rememberMe: recordar })
          : await signUp.email({ email, password, name: nombre });
      if (res.error) {
        setError(res.error.message ?? "No se pudo autenticar.");
      }
      // En éxito, useSession se refresca y App muestra el panel.
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card overflow-hidden p-8 sm:p-9">
          {/* Marca */}
          <div className="mb-7 flex flex-col items-center text-center">
            <img
              src={logo}
              alt="Turnos Manager"
              className="mb-4 h-48 w-48 rounded-2xl"
            />
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              Turnos Manager
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Gestión de turnos para clínicas y consultorios
            </p>
          </div>

          {modo === "registro" && (
            <Campo
              label="Nombre"
              icon={iconUser}
              value={nombre}
              onChange={setNombre}
              autoComplete="name"
              placeholder="Tu nombre"
            />
          )}

          <Campo
            label="Email"
            type="email"
            icon={iconMail}
            value={email}
            onChange={setEmail}
            autoComplete="email"
            placeholder="usuario@clinica.com"
          />

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                {iconLock}
              </span>
              <input
                type={verPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviar()}
                className="field pl-10 pr-10"
                placeholder="••••••••••"
                autoComplete={
                  modo === "login" ? "current-password" : "new-password"
                }
              />
              <button
                type="button"
                onClick={() => setVerPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title={verPass ? "Ocultar" : "Mostrar"}
              >
                {verPass ? iconEyeOff : iconEye}
              </button>
            </div>
          </div>

          {modo === "login" && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-slate-500">
                <input
                  type="checkbox"
                  checked={recordar}
                  onChange={(e) => setRecordar(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-slate-700"
                />
                Recordarme
              </label>
              <button
                type="button"
                onClick={() =>
                  setError("Contactá al administrador para recuperar el acceso.")
                }
                className="font-medium text-slate-400 hover:text-slate-600"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}

          <button
            disabled={cargando || !email || !password}
            onClick={enviar}
            className="btn btn-primary mt-5 w-full py-2.5"
          >
            {cargando ? (
              "Procesando…"
            ) : modo === "login" ? (
              <>
                {iconLogin} Ingresar
              </>
            ) : (
              "Crear cuenta"
            )}
          </button>

          <div className="mt-6 border-t border-slate-200 pt-4 text-center text-sm text-slate-400">
            {modo === "login" ? "¿No tenés cuenta? " : "¿Ya tenés cuenta? "}
            <button
              onClick={() => {
                setModo(modo === "login" ? "registro" : "login");
                setError(null);
              }}
              className="font-semibold text-slate-700 hover:text-slate-900"
            >
              {modo === "login" ? "Crear una cuenta" : "Iniciar sesión"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Campo de texto con label e ícono a la izquierda. */
function Campo({
  label,
  icon,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div className="mt-4">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field pl-10"
          autoComplete={autoComplete}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

/* Íconos inline (sin dependencias). */
const iconMail = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 5L2 7" />
  </svg>
);
const iconLock = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const iconUser = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const iconEye = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const iconEyeOff = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);
const iconLogin = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" x2="3" y1="12" y2="12" />
  </svg>
);
