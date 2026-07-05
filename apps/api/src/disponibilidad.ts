/**
 * Cálculo de disponibilidad de un profesional para una fecha dada.
 * Aritmética de rangos pura (sin acceso a DB): expandir ventanas recurrentes →
 * aplicar excepciones (agrega/bloquea) → restar turnos ocupados → trocear en
 * slots. Ver CLAUDE.md, sección "Cálculo de disponibilidad".
 *
 * Los horarios de ventanas/excepciones son locales (HH:MM); la conversión a
 * timestamptz real (con offset de zona horaria) es responsabilidad del caller
 * (la ruta de disponibilidad), no de este módulo.
 */

export interface VentanaRecurrenteInput {
  diaSemana: number; // 0=domingo .. 6=sábado
  horaInicio: string; // "HH:MM"
  horaFin: string; // "HH:MM"
  duracionTurno: number | null; // minutos; null → duracionFallback
  vigenciaDesde: string; // "YYYY-MM-DD"
  vigenciaHasta: string | null;
  activa: boolean;
}

export interface ExcepcionInput {
  tipo: "agrega" | "bloquea";
  horaInicio: string | null; // null = día completo
  horaFin: string | null;
}

export interface RangoOcupado {
  horaInicio: string; // "HH:MM", ya recortado al día consultado
  horaFin: string;
}

export interface Slot {
  horaInicio: string;
  horaFin: string;
}

interface Bloque {
  inicioMin: number;
  finMin: number;
  duracionMin: number;
}

const MIN_DIA = 24 * 60;

function minutosDesdeHHMM(hhmm: string): number {
  const partes = hhmm.split(":");
  return Number(partes[0] ?? 0) * 60 + Number(partes[1] ?? 0);
}

function hhmmDesdeMinutos(min: number): string {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Día de la semana (0=domingo) de una fecha "YYYY-MM-DD", sin desfasajes de zona horaria. */
export function diaSemanaDe(fecha: string): number {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay();
}

/** Resta el rango [desdeMin, hastaMin) de una lista de bloques, partiéndolos si hace falta. */
function restarRango(bloques: Bloque[], desdeMin: number, hastaMin: number): Bloque[] {
  const resultado: Bloque[] = [];
  for (const b of bloques) {
    const inicioSolapa = Math.max(b.inicioMin, desdeMin);
    const finSolapa = Math.min(b.finMin, hastaMin);
    if (inicioSolapa >= finSolapa) {
      // Sin solapamiento: el bloque queda intacto.
      resultado.push(b);
      continue;
    }
    if (b.inicioMin < inicioSolapa) {
      resultado.push({ inicioMin: b.inicioMin, finMin: inicioSolapa, duracionMin: b.duracionMin });
    }
    if (finSolapa < b.finMin) {
      resultado.push({ inicioMin: finSolapa, finMin: b.finMin, duracionMin: b.duracionMin });
    }
  }
  return resultado;
}

/** Ventanas recurrentes de la fecha + excepciones aplicadas, antes de restar turnos. */
function calcularBloquesVentana(
  fecha: string,
  ventanasRecurrentes: VentanaRecurrenteInput[],
  excepciones: ExcepcionInput[],
  duracionFallback: number,
): Bloque[] {
  const diaSemana = diaSemanaDe(fecha);

  let bloques: Bloque[] = ventanasRecurrentes
    .filter(
      (v) =>
        v.activa &&
        v.diaSemana === diaSemana &&
        v.vigenciaDesde <= fecha &&
        (v.vigenciaHasta === null || fecha <= v.vigenciaHasta),
    )
    .map((v) => ({
      inicioMin: minutosDesdeHHMM(v.horaInicio),
      finMin: minutosDesdeHHMM(v.horaFin),
      duracionMin: v.duracionTurno ?? duracionFallback,
    }));

  for (const ex of excepciones) {
    const desdeMin = ex.horaInicio ? minutosDesdeHHMM(ex.horaInicio) : 0;
    const hastaMin = ex.horaFin ? minutosDesdeHHMM(ex.horaFin) : MIN_DIA;
    if (ex.tipo === "bloquea") {
      bloques = restarRango(bloques, desdeMin, hastaMin);
    } else {
      bloques = [...bloques, { inicioMin: desdeMin, finMin: hastaMin, duracionMin: duracionFallback }];
    }
  }

  return bloques;
}

export function calcularDisponibilidad(params: {
  fecha: string;
  ventanasRecurrentes: VentanaRecurrenteInput[];
  excepciones: ExcepcionInput[]; // ya filtradas a `fecha`
  turnosOcupados: RangoOcupado[]; // ya filtrados a `fecha`
  duracionFallback: number; // minutos — para bloques "agrega" (sin duración propia)
}): Slot[] {
  const { fecha, ventanasRecurrentes, excepciones, turnosOcupados, duracionFallback } = params;

  let bloques = calcularBloquesVentana(fecha, ventanasRecurrentes, excepciones, duracionFallback);

  for (const ocupado of turnosOcupados) {
    bloques = restarRango(bloques, minutosDesdeHHMM(ocupado.horaInicio), minutosDesdeHHMM(ocupado.horaFin));
  }

  const slots: Slot[] = [];
  for (const b of bloques) {
    if (b.duracionMin <= 0) continue;
    for (let inicio = b.inicioMin; inicio + b.duracionMin <= b.finMin; inicio += b.duracionMin) {
      slots.push({ horaInicio: hhmmDesdeMinutos(inicio), horaFin: hhmmDesdeMinutos(inicio + b.duracionMin) });
    }
  }

  return slots.sort((a, b) => (a.horaInicio < b.horaInicio ? -1 : a.horaInicio > b.horaInicio ? 1 : 0));
}

/**
 * ¿El rango [horaInicio, horaFin) cae dentro de una ventana de trabajo vigente
 * (ya con excepciones aplicadas)? El EXCLUDE de la DB solo evita que dos turnos
 * se solapen; esto es la validación de negocio complementaria (ver CLAUDE.md,
 * "El constraint previene solapamiento, no contención").
 */
export function turnoDentroDeVentana(params: {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  ventanasRecurrentes: VentanaRecurrenteInput[];
  excepciones: ExcepcionInput[];
}): boolean {
  const bloques = calcularBloquesVentana(params.fecha, params.ventanasRecurrentes, params.excepciones, 0);
  const inicioMin = minutosDesdeHHMM(params.horaInicio);
  const finMin = minutosDesdeHHMM(params.horaFin);
  return bloques.some((b) => b.inicioMin <= inicioMin && finMin <= b.finMin);
}
