import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, authClient } from "../../lib/auth.js";
import logo from "../../assets/suites-man-logo.png";

const fieldCls =
  "field dark:border-white/10 dark:bg-[#1a2b42] dark:text-white dark:placeholder-white/30";
const labelCls =
  "mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-[#0058be]";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function GoogleBtn() {
  return (
    <button
      type="button"
      onClick={() =>
        authClient.signIn.social({
          provider: "google",
          callbackURL: window.location.origin + "/panel",
        })
      }
      className="mt-3 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/80 dark:hover:bg-white/[0.08]"
    >
      <svg width={18} height={18} viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continuar con Google
    </button>
  );
}

function Separador() {
  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
      <span className="text-xs text-slate-400">o</span>
      <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

export function LoginModal({ onClose }: { onClose: () => void }) {
  const [modo, setModo] = useState<"login" | "registro">("login");
  const navigate = useNavigate();

  const cambiarModo = (m: "login" | "registro") => setModo(m);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-white/[0.08] dark:bg-[#0f1e30]">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white/70"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="mb-6 text-center">
          <img src={logo} alt="" className="mx-auto mb-4 rounded-2xl" style={{ width: 275, height: 275 }} />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {modo === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-white/50">
            {modo === "login"
              ? "Accedé a tu cuenta para gestionar reservas"
              : "Completá tus datos para registrarte"}
          </p>
        </div>

        {modo === "login" ? (
          <FormLogin onClose={onClose} navigate={navigate} onRegistro={() => cambiarModo("registro")} />
        ) : (
          <FormRegistro onClose={onClose} onLogin={() => cambiarModo("login")} />
        )}
      </div>
    </div>
  );
}

function FormLogin({
  onClose,
  navigate,
  onRegistro,
}: {
  onClose: () => void;
  navigate: ReturnType<typeof useNavigate>;
  onRegistro: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError("Email o contraseña incorrectos.");
        return;
      }
      const role = (result.data?.user as { role?: string } | undefined)?.role;
      if (role === "admin" || role === "gestor") {
        navigate("/panel");
      } else {
        onClose();
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com" className={fieldCls}
          />
        </div>

        <div>
          <label className={labelCls}>Contraseña</label>
          <div className="relative">
            <input
              type={mostrarPass ? "text" : "password"}
              autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" className={`${fieldCls} pr-10`}
            />
            <button type="button" tabIndex={-1}
              onClick={() => setMostrarPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:text-white/40 dark:hover:text-white/70"
            >
              <EyeIcon open={mostrarPass} />
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-[#0058be] py-3 text-sm font-bold text-white transition hover:bg-[#2170e4] disabled:opacity-50"
        >
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      <Separador />
      <GoogleBtn />

      <div className="mt-4 flex items-center justify-between text-sm">
        <button onClick={onClose}
          className="text-slate-400 transition hover:text-slate-600 dark:text-white/30 dark:hover:text-white/60"
        >
          Continuar como invitado
        </button>
        <button onClick={onRegistro}
          className="font-medium text-[#0058be] transition hover:text-[#2170e4] dark:text-blue-400 dark:hover:text-blue-300"
        >
          Crear cuenta
        </button>
      </div>
    </>
  );
}

function FormRegistro({
  onClose,
  onLogin,
}: {
  onClose: () => void;
  onLogin: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await authClient.signUp.email({ name: nombre, email, password });
      if (result.error) {
        setError(result.error.message ?? "No se pudo crear la cuenta.");
        return;
      }
      setOk(true);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  if (ok) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-900/30">
          ✓
        </div>
        <p className="font-semibold text-slate-800 dark:text-white">¡Cuenta creada!</p>
        <p className="text-sm text-slate-500 dark:text-white/50">
          Ya podés iniciar sesión con tu email y contraseña.
        </p>
        <button onClick={onLogin}
          className="w-full rounded-lg bg-[#0058be] py-3 text-sm font-bold text-white transition hover:bg-[#2170e4]"
        >
          Iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>Nombre completo</label>
          <input
            type="text" autoComplete="name" required
            value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre" className={fieldCls}
          />
        </div>

        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com" className={fieldCls}
          />
        </div>

        <div>
          <label className={labelCls}>Contraseña</label>
          <div className="relative">
            <input
              type={mostrarPass ? "text" : "password"}
              autoComplete="new-password" required minLength={8}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres" className={`${fieldCls} pr-10`}
            />
            <button type="button" tabIndex={-1}
              onClick={() => setMostrarPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:text-white/40 dark:hover:text-white/70"
            >
              <EyeIcon open={mostrarPass} />
            </button>
          </div>
        </div>

        <div>
          <label className={labelCls}>Confirmar contraseña</label>
          <input
            type={mostrarPass ? "text" : "password"}
            autoComplete="new-password" required
            value={confirmar} onChange={(e) => setConfirmar(e.target.value)}
            placeholder="Repetí la contraseña" className={fieldCls}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-[#0058be] py-3 text-sm font-bold text-white transition hover:bg-[#2170e4] disabled:opacity-50"
        >
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      <Separador />
      <GoogleBtn />

      <div className="mt-4 text-center text-sm">
        <span className="text-slate-400 dark:text-white/30">¿Ya tenés cuenta? </span>
        <button onClick={onLogin}
          className="font-medium text-[#0058be] transition hover:text-[#2170e4] dark:text-blue-400 dark:hover:text-blue-300"
        >
          Iniciar sesión
        </button>
      </div>
    </>
  );
}
