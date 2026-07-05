import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api.js";

const roles = ["admin", "profesional", "administrativo", "paciente"] as const;

export function UsuariosAdmin() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["usuarios"], queryFn: api.usuarios.list });
  const [error, setError] = useState<string | null>(null);

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.usuarios.setRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "No se pudo cambiar el rol."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.usuarios.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "No se pudo eliminar."),
  });

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-slate-800">Usuarios</h2>
      <p className="mb-3 text-sm text-slate-400">
        Gestioná el acceso al sistema. No podés cambiar tu propio rol ni eliminarte.
      </p>

      {error && <p className="mb-2 text-sm text-rose-600">{error}</p>}
      {q.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}

      {q.data && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 font-semibold">Nombre</th>
                <th className="px-4 py-2 font-semibold">Email</th>
                <th className="px-4 py-2 font-semibold">Rol</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {q.data.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 font-medium text-slate-800">
                    {u.name}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{u.email}</td>
                  <td className="px-4 py-2">
                    <select
                      value={u.role}
                      onChange={(e) => {
                        setError(null);
                        setRole.mutate({ id: u.id, role: e.target.value });
                      }}
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar a ${u.email}?`)) {
                          setError(null);
                          remove.mutate(u.id);
                        }
                      }}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {q.data.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Sin usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
