import { useState } from "react";
import { signIn, signUp } from "../../lib/auth.js";

/** Pantalla de acceso al panel (email/password). Permite iniciar sesión o,
 *  con el toggle, crear una cuenta. */
export function LoginPage() {
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const enviar = async () => {
    setError(null);
    setCargando(true);
    try {
      const res =
        modo === "login"
          ? await signIn.email({ email, password })
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

  const input = "mt-1 w-full rounded border border-slate-300 px-3 py-2";

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">Suites Manager</h1>
        <p className="mb-4 text-sm text-slate-400">
          {modo === "login" ? "Ingresá a tu cuenta" : "Creá una cuenta"}
        </p>

        {modo === "registro" && (
          <label className="block text-sm">
            Nombre
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={input}
              autoComplete="name"
            />
          </label>
        )}
        <label className="mt-2 block text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
            autoComplete="email"
          />
        </label>
        <label className="mt-2 block text-sm">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
            className={input}
            autoComplete={modo === "login" ? "current-password" : "new-password"}
          />
        </label>

        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

        <button
          disabled={cargando || !email || !password}
          onClick={enviar}
          className="mt-4 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {cargando
            ? "Procesando…"
            : modo === "login"
              ? "Ingresar"
              : "Crear cuenta"}
        </button>

        <button
          onClick={() => {
            setModo(modo === "login" ? "registro" : "login");
            setError(null);
          }}
          className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-700"
        >
          {modo === "login"
            ? "¿No tenés cuenta? Registrate"
            : "Ya tengo cuenta — ingresar"}
        </button>
      </div>
    </div>
  );
}
