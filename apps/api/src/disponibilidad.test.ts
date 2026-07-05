import { describe, it, expect } from "vitest";
import { calcularDisponibilidad, diaSemanaDe, turnoDentroDeVentana } from "./disponibilidad.js";
import type { VentanaRecurrenteInput } from "./disponibilidad.js";

// 2026-07-06 es lunes.
const LUNES = "2026-07-06";
const MARTES = "2026-07-07";

function ventanaLunes(overrides: Partial<VentanaRecurrenteInput> = {}): VentanaRecurrenteInput {
  return {
    diaSemana: 1,
    horaInicio: "09:00",
    horaFin: "11:00",
    duracionTurno: 30,
    vigenciaDesde: "2026-01-01",
    vigenciaHasta: null,
    activa: true,
    ...overrides,
  };
}

describe("diaSemanaDe", () => {
  it("no tiene desfasaje de zona horaria", () => {
    expect(diaSemanaDe(LUNES)).toBe(1);
    expect(diaSemanaDe(MARTES)).toBe(2);
  });
});

describe("calcularDisponibilidad", () => {
  it("trocea una ventana simple en slots de la duración configurada", () => {
    const slots = calcularDisponibilidad({
      fecha: LUNES,
      ventanasRecurrentes: [ventanaLunes()],
      excepciones: [],
      turnosOcupados: [],
      duracionFallback: 30,
    });
    expect(slots).toEqual([
      { horaInicio: "09:00", horaFin: "09:30" },
      { horaInicio: "09:30", horaFin: "10:00" },
      { horaInicio: "10:00", horaFin: "10:30" },
      { horaInicio: "10:30", horaFin: "11:00" },
    ]);
  });

  it("no ofrece nada si el día de la semana no coincide", () => {
    const slots = calcularDisponibilidad({
      fecha: MARTES,
      ventanasRecurrentes: [ventanaLunes()],
      excepciones: [],
      turnosOcupados: [],
      duracionFallback: 30,
    });
    expect(slots).toEqual([]);
  });

  it("respeta la vigencia de la ventana", () => {
    const slots = calcularDisponibilidad({
      fecha: LUNES,
      ventanasRecurrentes: [ventanaLunes({ vigenciaHasta: "2026-01-31" })],
      excepciones: [],
      turnosOcupados: [],
      duracionFallback: 30,
    });
    expect(slots).toEqual([]);
  });

  it("ignora ventanas inactivas", () => {
    const slots = calcularDisponibilidad({
      fecha: LUNES,
      ventanasRecurrentes: [ventanaLunes({ activa: false })],
      excepciones: [],
      turnosOcupados: [],
      duracionFallback: 30,
    });
    expect(slots).toEqual([]);
  });

  it("usa la duración de la ventana por sobre el fallback", () => {
    const slots = calcularDisponibilidad({
      fecha: LUNES,
      ventanasRecurrentes: [ventanaLunes({ horaFin: "10:00", duracionTurno: 20 })],
      excepciones: [],
      turnosOcupados: [],
      duracionFallback: 60,
    });
    expect(slots).toEqual([
      { horaInicio: "09:00", horaFin: "09:20" },
      { horaInicio: "09:20", horaFin: "09:40" },
      { horaInicio: "09:40", horaFin: "10:00" },
    ]);
  });

  it("una excepción 'bloquea' de día completo anula toda la ventana", () => {
    const slots = calcularDisponibilidad({
      fecha: LUNES,
      ventanasRecurrentes: [ventanaLunes()],
      excepciones: [{ tipo: "bloquea", horaInicio: null, horaFin: null }],
      turnosOcupados: [],
      duracionFallback: 30,
    });
    expect(slots).toEqual([]);
  });

  it("una excepción 'bloquea' parcial parte la ventana en dos", () => {
    const slots = calcularDisponibilidad({
      fecha: LUNES,
      ventanasRecurrentes: [ventanaLunes()],
      excepciones: [{ tipo: "bloquea", horaInicio: "09:30", horaFin: "10:00" }],
      turnosOcupados: [],
      duracionFallback: 30,
    });
    expect(slots).toEqual([
      { horaInicio: "09:00", horaFin: "09:30" },
      { horaInicio: "10:00", horaFin: "10:30" },
      { horaInicio: "10:30", horaFin: "11:00" },
    ]);
  });

  it("una excepción 'agrega' suma un bloque fuera de la ventana normal", () => {
    const slots = calcularDisponibilidad({
      fecha: LUNES,
      ventanasRecurrentes: [ventanaLunes({ horaFin: "09:30" })],
      excepciones: [{ tipo: "agrega", horaInicio: "16:00", horaFin: "17:00" }],
      turnosOcupados: [],
      duracionFallback: 30,
    });
    expect(slots).toEqual([
      { horaInicio: "09:00", horaFin: "09:30" },
      { horaInicio: "16:00", horaFin: "16:30" },
      { horaInicio: "16:30", horaFin: "17:00" },
    ]);
  });

  it("resta los turnos ya ocupados", () => {
    const slots = calcularDisponibilidad({
      fecha: LUNES,
      ventanasRecurrentes: [ventanaLunes()],
      excepciones: [],
      turnosOcupados: [{ horaInicio: "09:30", horaFin: "10:00" }],
      duracionFallback: 30,
    });
    expect(slots).toEqual([
      { horaInicio: "09:00", horaFin: "09:30" },
      { horaInicio: "10:00", horaFin: "10:30" },
      { horaInicio: "10:30", horaFin: "11:00" },
    ]);
  });

  it("descarta el resto de un bloque más chico que la duración configurada", () => {
    const slots = calcularDisponibilidad({
      fecha: LUNES,
      ventanasRecurrentes: [ventanaLunes({ horaFin: "09:50" })],
      excepciones: [],
      turnosOcupados: [],
      duracionFallback: 30,
    });
    // 09:00-09:30 entra, 09:30-09:50 (20min) no alcanza para otro slot de 30.
    expect(slots).toEqual([{ horaInicio: "09:00", horaFin: "09:30" }]);
  });

  it("combina varias ventanas del mismo día con duraciones distintas, ordenado", () => {
    const slots = calcularDisponibilidad({
      fecha: LUNES,
      ventanasRecurrentes: [
        ventanaLunes({ horaInicio: "14:00", horaFin: "15:00", duracionTurno: 60 }),
        ventanaLunes({ horaInicio: "09:00", horaFin: "09:30", duracionTurno: 30 }),
      ],
      excepciones: [],
      turnosOcupados: [],
      duracionFallback: 30,
    });
    expect(slots).toEqual([
      { horaInicio: "09:00", horaFin: "09:30" },
      { horaInicio: "14:00", horaFin: "15:00" },
    ]);
  });
});

describe("turnoDentroDeVentana", () => {
  it("acepta un rango contenido en la ventana", () => {
    expect(
      turnoDentroDeVentana({
        fecha: LUNES,
        horaInicio: "09:15",
        horaFin: "09:45",
        ventanasRecurrentes: [ventanaLunes()],
        excepciones: [],
      }),
    ).toBe(true);
  });

  it("rechaza un rango que se pasa del fin de la ventana", () => {
    expect(
      turnoDentroDeVentana({
        fecha: LUNES,
        horaInicio: "10:45",
        horaFin: "11:15",
        ventanasRecurrentes: [ventanaLunes()],
        excepciones: [],
      }),
    ).toBe(false);
  });

  it("rechaza un rango dentro de un bloqueo puntual", () => {
    expect(
      turnoDentroDeVentana({
        fecha: LUNES,
        horaInicio: "09:30",
        horaFin: "10:00",
        ventanasRecurrentes: [ventanaLunes()],
        excepciones: [{ tipo: "bloquea", horaInicio: "09:00", horaFin: "11:00" }],
      }),
    ).toBe(false);
  });

  it("acepta un rango dentro de un bloque 'agrega' fuera de la ventana normal", () => {
    expect(
      turnoDentroDeVentana({
        fecha: LUNES,
        horaInicio: "16:00",
        horaFin: "16:30",
        ventanasRecurrentes: [ventanaLunes()],
        excepciones: [{ tipo: "agrega", horaInicio: "16:00", horaFin: "17:00" }],
      }),
    ).toBe(true);
  });
});
