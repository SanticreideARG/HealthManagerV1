import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { Impuesto, MetodoPago } from "../../lib/api.js";

const TIPO_ICONO: Record<string, string> = {
  efectivo: "💵",
  transferencia: "🏦",
  tarjeta: "💳",
  qr: "📱",
  billetera: "👜",
};

const TIPO_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  qr: "QR / Billetera digital",
  billetera: "Billetera virtual",
};

type Section = "impuestos" | "metodos";

export function FacturacionAdmin() {
  const [section, setSection] = useState<Section>("metodos");

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 w-fit dark:bg-slate-800">
        {(["metodos", "impuestos"] as Section[]).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
              section === s
                ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {s === "metodos" ? "Métodos de pago" : "Impuestos y tasas"}
          </button>
        ))}
      </div>

      {section === "metodos" && <MetodosPagoSection />}
      {section === "impuestos" && <ImpuestosSection />}
    </div>
  );
}

// ── Métodos de pago ──────────────────────────────────────────────────────────

function MetodosPagoSection() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["metodos-pago"], queryFn: api.metodosPago.list });
  const [form, setForm] = useState<Partial<MetodoPago> | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalida = () => qc.invalidateQueries({ queryKey: ["metodos-pago"] });

  const guardar = useMutation({
    mutationFn: () => {
      if (!form) throw new Error();
      const payload = {
        tipo: (form.tipo ?? "efectivo") as MetodoPago["tipo"],
        nombre: form.nombre ?? "",
        banco: form.banco ?? null,
        cuotas: form.cuotas ?? 1,
        recargoPct: Number(form.recargoPct ?? 0),
        proveedor: form.proveedor ?? null,
        activo: form.activo ?? true,
      };
      return editId != null
        ? api.metodosPago.update(editId, payload)
        : api.metodosPago.create(payload);
    },
    onSuccess: () => { invalida(); cerrar(); },
    onError: () => setError("No se pudo guardar."),
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => api.metodosPago.remove(id),
    onSuccess: invalida,
  });

  function abrir(m?: MetodoPago) {
    setError(null);
    setEditId(m?.id ?? null);
    setForm(m ? { ...m } : { tipo: "efectivo", nombre: "", banco: null, cuotas: 1, recargoPct: "0", proveedor: null, activo: true });
  }

  function cerrar() { setForm(null); setEditId(null); setError(null); }

  const metodos = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-800 dark:text-slate-100">Métodos de pago</h3>
          <p className="text-xs text-slate-400 mt-0.5">Efectivo, transferencia, tarjetas, QR, billeteras digitales.</p>
        </div>
        <button
          onClick={() => abrir()}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600"
        >
          + Agregar
        </button>
      </div>

      {q.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}

      {metodos.length > 0 && (
        <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Método</th>
                <th className="px-4 py-2.5">Banco / Proveedor</th>
                <th className="px-4 py-2.5 text-right">Cuotas</th>
                <th className="px-4 py-2.5 text-right">Recargo %</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {metodos.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-2.5">
                    <span className="mr-1.5">{TIPO_ICONO[m.tipo] ?? "💰"}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{m.nombre}</span>
                    <span className="ml-1.5 text-xs text-slate-400">{TIPO_LABELS[m.tipo]}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{m.banco ?? m.proveedor ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{m.cuotas}×</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {Number(m.recargoPct) > 0 ? `+${Number(m.recargoPct).toFixed(2)}%` : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.activo ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                      {m.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => abrir(m)} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Editar</button>
                      <button
                        onClick={() => eliminar.mutate(m.id)}
                        disabled={eliminar.isPending}
                        className="text-xs text-rose-400 hover:text-rose-600 disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {metodos.length === 0 && !q.isLoading && (
        <p className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 py-8 text-center text-sm text-slate-400">
          Sin métodos de pago. Agregá al menos uno.
        </p>
      )}

      {form && (
        <MetodoPagoModal
          form={form}
          editId={editId}
          error={error}
          pending={guardar.isPending}
          onChange={(f) => setForm(f)}
          onGuardar={() => { setError(null); guardar.mutate(); }}
          onCerrar={cerrar}
        />
      )}
    </div>
  );
}

function MetodoPagoModal({
  form, editId, error, pending, onChange, onGuardar, onCerrar,
}: {
  form: Partial<MetodoPago>;
  editId: number | null;
  error: string | null;
  pending: boolean;
  onChange: (f: Partial<MetodoPago>) => void;
  onGuardar: () => void;
  onCerrar: () => void;
}) {
  const set = (k: keyof MetodoPago, v: unknown) => onChange({ ...form, [k]: v });
  const tipo = form.tipo ?? "efectivo";
  const esTarjetaOQR = tipo === "tarjeta" || tipo === "qr" || tipo === "billetera";
  const esTarjeta = tipo === "tarjeta";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
          {editId != null ? "Editar método de pago" : "Nuevo método de pago"}
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm col-span-2">
            <span className="text-slate-600 dark:text-slate-300">Tipo</span>
            <select
              value={tipo}
              onChange={(e) => set("tipo", e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {Object.entries(TIPO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{TIPO_ICONO[k]} {v}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm col-span-2">
            <span className="text-slate-600 dark:text-slate-300">Nombre visible</span>
            <input
              value={form.nombre ?? ""}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="ej: Tarjeta de crédito Visa"
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          {(esTarjetaOQR || tipo === "transferencia") && (
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                {tipo === "transferencia" ? "Banco" : tipo === "qr" || tipo === "billetera" ? "Proveedor" : "Banco emisor"}
              </span>
              <input
                value={tipo === "qr" || tipo === "billetera" ? (form.proveedor ?? "") : (form.banco ?? "")}
                onChange={(e) => {
                  if (tipo === "qr" || tipo === "billetera") set("proveedor", e.target.value || null);
                  else set("banco", e.target.value || null);
                }}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          )}

          {esTarjeta && (
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Cuotas máx.</span>
              <input
                type="number" min={1} max={48}
                value={form.cuotas ?? 1}
                onChange={(e) => set("cuotas", Number(e.target.value))}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          )}

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Recargo %</span>
            <input
              type="number" min={0} max={100} step={0.01}
              value={form.recargoPct ?? "0"}
              onChange={(e) => set("recargoPct", e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="flex items-center gap-2 text-sm col-span-2">
            <input
              type="checkbox"
              checked={form.activo ?? true}
              onChange={(e) => set("activo", e.target.checked)}
              className="rounded"
            />
            <span className="text-slate-600 dark:text-slate-300">Activo (disponible al cobrar)</span>
          </label>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex gap-2">
          <button
            disabled={pending || !form.nombre?.trim()}
            onClick={onGuardar}
            className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <button
            onClick={onCerrar}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Impuestos ────────────────────────────────────────────────────────────────

function ImpuestosSection() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["impuestos"], queryFn: api.impuestos.list });
  const [form, setForm] = useState<Partial<Impuesto> | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalida = () => qc.invalidateQueries({ queryKey: ["impuestos"] });

  const guardar = useMutation({
    mutationFn: () => {
      if (!form) throw new Error();
      const payload = {
        nombre: form.nombre ?? "",
        tipo: (form.tipo ?? "porcentaje") as Impuesto["tipo"],
        valor: Number(form.valor ?? 0),
        aplicaA: (form.aplicaA ?? "todo") as Impuesto["aplicaA"],
        activo: form.activo ?? true,
        orden: form.orden ?? 0,
      };
      return editId != null
        ? api.impuestos.update(editId, payload)
        : api.impuestos.create(payload);
    },
    onSuccess: () => { invalida(); cerrar(); },
    onError: () => setError("No se pudo guardar."),
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => api.impuestos.remove(id),
    onSuccess: invalida,
  });

  function abrir(imp?: Impuesto) {
    setError(null);
    setEditId(imp?.id ?? null);
    setForm(imp ? { ...imp } : { nombre: "", tipo: "porcentaje", valor: "0", aplicaA: "todo", activo: true, orden: 0 });
  }

  function cerrar() { setForm(null); setEditId(null); setError(null); }

  const lista = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-800 dark:text-slate-100">Impuestos y tasas</h3>
          <p className="text-xs text-slate-400 mt-0.5">IVA, tasa municipal, tasas turísticas, etc. Informativo por ahora.</p>
        </div>
        <button
          onClick={() => abrir()}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600"
        >
          + Agregar
        </button>
      </div>

      {q.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}

      {lista.length > 0 && (
        <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-[500px] text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Nombre</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5 text-right">Valor</th>
                <th className="px-4 py-2.5">Aplica a</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {lista.map((imp) => (
                <tr key={imp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">{imp.nombre}</td>
                  <td className="px-4 py-2.5 text-slate-500">{imp.tipo === "porcentaje" ? "%" : "$ fijo"}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">
                    {imp.tipo === "porcentaje"
                      ? `${Number(imp.valor).toFixed(2)}%`
                      : `$${Number(imp.valor).toLocaleString("es-AR")}`}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 capitalize">{imp.aplicaA}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${imp.activo ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                      {imp.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => abrir(imp)} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Editar</button>
                      <button
                        onClick={() => eliminar.mutate(imp.id)}
                        disabled={eliminar.isPending}
                        className="text-xs text-rose-400 hover:text-rose-600 disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lista.length === 0 && !q.isLoading && (
        <p className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 py-8 text-center text-sm text-slate-400">
          Sin impuestos configurados.
        </p>
      )}

      {form && (
        <ImpuestoModal
          form={form}
          editId={editId}
          error={error}
          pending={guardar.isPending}
          onChange={setForm}
          onGuardar={() => { setError(null); guardar.mutate(); }}
          onCerrar={cerrar}
        />
      )}
    </div>
  );
}

function ImpuestoModal({
  form, editId, error, pending, onChange, onGuardar, onCerrar,
}: {
  form: Partial<Impuesto>;
  editId: number | null;
  error: string | null;
  pending: boolean;
  onChange: (f: Partial<Impuesto>) => void;
  onGuardar: () => void;
  onCerrar: () => void;
}) {
  const set = (k: keyof Impuesto, v: unknown) => onChange({ ...form, [k]: v });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
          {editId != null ? "Editar impuesto" : "Nuevo impuesto"}
        </h3>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Nombre</span>
            <input
              value={form.nombre ?? ""}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="ej: IVA, Tasa municipal"
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Tipo</span>
              <select
                value={form.tipo ?? "porcentaje"}
                onChange={(e) => set("tipo", e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto_fijo">Monto fijo ($)</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                Valor {form.tipo === "monto_fijo" ? "($)" : "(%)"}
              </span>
              <input
                type="number" min={0} step={0.01}
                value={form.valor ?? "0"}
                onChange={(e) => set("valor", e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Aplica a</span>
            <select
              value={form.aplicaA ?? "todo"}
              onChange={(e) => set("aplicaA", e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="todo">Todo (alojamiento + cargos)</option>
              <option value="habitacion">Solo alojamiento</option>
              <option value="cargo">Solo cargos extra</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activo ?? true}
              onChange={(e) => set("activo", e.target.checked)}
              className="rounded"
            />
            <span className="text-slate-600 dark:text-slate-300">Activo</span>
          </label>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex gap-2">
          <button
            disabled={pending || !form.nombre?.trim()}
            onClick={onGuardar}
            className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <button
            onClick={onCerrar}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
