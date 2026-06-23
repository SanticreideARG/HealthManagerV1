import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import { addDays } from "../../lib/fechas.js";

/** Tablero bajo el calendario: llegadas y salidas de hoy/mañana. */
export function ProximosPanel() {
  const hoy = new Date().toISOString().slice(0, 10);
  const manana = addDays(hoy, 1);

  const habitacionesQ = useQuery({
    queryKey: ["habitaciones"],
    queryFn: api.habitaciones.list,
  });
  const proximosQ = useQuery({
    queryKey: ["proximos", hoy],
    queryFn: () => api.reservas.list(hoy, addDays(hoy, 2)),
  });

  const nombreHab = (id: number) =>
    habitacionesQ.data?.find((h) => h.id === id)?.nombre ?? "—";
  const cuando = (f: string) => (f === hoy ? "Hoy" : "Mañana");
  const rows = proximosQ.data ?? [];
  const checkins = rows.filter(
    (r) => r.estado === "reservada" && (r.checkin === hoy || r.checkin === manana),
  );
  const checkouts = rows.filter(
    (r) =>
      r.estado === "ocupada" && (r.checkout === hoy || r.checkout === manana),
  );

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card titulo="🛬 Check-ins próximos">
        {checkins.length === 0 ? (
          <Vacio>Sin llegadas hoy/mañana</Vacio>
        ) : (
          checkins.map((r) => (
            <Item
              key={r.id}
              principal={r.huesped ?? "—"}
              secundario={nombreHab(r.habitacionId)}
              cuando={cuando(r.checkin)}
              color="emerald"
            />
          ))
        )}
      </Card>

      <Card titulo="🛫 Check-outs próximos">
        {checkouts.length === 0 ? (
          <Vacio>Sin salidas hoy/mañana</Vacio>
        ) : (
          checkouts.map((r) => (
            <Item
              key={r.id}
              principal={r.huesped ?? "—"}
              secundario={nombreHab(r.habitacionId)}
              cuando={cuando(r.checkout)}
              color="amber"
            />
          ))
        )}
      </Card>

      <Card titulo="🌤️ Clima">
        <Vacio>
          Próximamente — requiere configurar la ubicación del alojamiento.
        </Vacio>
      </Card>
    </div>
  );
}

function Card({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{titulo}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400">{children}</p>;
}

function Item({
  principal,
  secundario,
  cuando,
  color,
}: {
  principal: string;
  secundario: string;
  cuando: string;
  color: "emerald" | "amber";
}) {
  const badge =
    color === "emerald"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700";
  return (
    <div className="flex items-center justify-between text-sm">
      <span>
        <span className="font-medium text-slate-800">{principal}</span>
        <span className="text-slate-400"> · {secundario}</span>
      </span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
        {cuando}
      </span>
    </div>
  );
}
