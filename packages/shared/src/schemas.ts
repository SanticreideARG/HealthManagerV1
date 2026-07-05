import { z } from "zod";

/**
 * Esquemas compartidos entre la API (Hono) y el front (React).
 * Una sola fuente de verdad para validación y tipos.
 */

// ---------- Enums ----------
export const modoConfirmacion = z.enum(["automatico", "aprobacion"]);
export type ModoConfirmacion = z.infer<typeof modoConfirmacion>;

export const tipoExcepcionVentana = z.enum(["agrega", "bloquea"]);
export type TipoExcepcionVentana = z.infer<typeof tipoExcepcionVentana>;

export const origenTurno = z.enum(["online", "administrativo"]);
export type OrigenTurno = z.infer<typeof origenTurno>;

export const estadoTurno = z.enum([
  "solicitado",
  "confirmado",
  "en_sala",
  "atendido",
  "ausente",
  "cancelado",
  "bloqueo",
]);
export type EstadoTurno = z.infer<typeof estadoTurno>;

export const rolUsuario = z.enum(["admin", "profesional", "administrativo", "paciente"]);
export type RolUsuario = z.infer<typeof rolUsuario>;

export const duracionTurnoPreset = z.enum(["20", "30", "40", "60"]);

// Fecha en formato ISO YYYY-MM-DD
const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado YYYY-MM-DD");

// Hora en formato HH:MM (24hs)
const horaHHMM = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato esperado HH:MM");

// ---------- Profesionales ----------
export const profesionalCreate = z.object({
  nombre: z.string().min(1).max(120),
  especialidad: z.string().min(1).max(120),
  duracionTurnoDefault: z.number().int().positive().nullable().optional(),
  modoConfirmacionDefault: modoConfirmacion.nullable().optional(),
  ubicacion: z.string().max(200).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  activo: z.boolean().default(true),
  obraSocialIds: z.array(z.number().int().positive()).optional(),
});
export type ProfesionalCreate = z.infer<typeof profesionalCreate>;

export const profesionalUpdate = profesionalCreate.partial();
export type ProfesionalUpdate = z.infer<typeof profesionalUpdate>;

// ---------- Obras sociales ----------
export const obraSocialCreate = z.object({
  nombre: z.string().min(1).max(120),
  activa: z.boolean().default(true),
});
export type ObraSocialCreate = z.infer<typeof obraSocialCreate>;

export const obraSocialUpdate = obraSocialCreate.partial();
export type ObraSocialUpdate = z.infer<typeof obraSocialUpdate>;

// ---------- Pacientes (era huéspedes) ----------
export const pacienteCreate = z.object({
  nombre: z.string().min(1).max(120),
  documento: z.string().max(40).optional(),
  tipoDocumento: z.string().max(30).optional(), // DNI | Pasaporte | CE | Otro
  fechaNacimiento: fechaISO.optional(),
  email: z.string().email().optional(),
  telefono: z.string().max(40).optional(),
  obraSocialId: z.number().int().positive().nullable().optional(),
  nroAfiliado: z.string().max(60).optional(),
  notas: z.string().max(500).optional(),
});
export type PacienteCreate = z.infer<typeof pacienteCreate>;

export const pacienteUpdate = pacienteCreate.partial();
export type PacienteUpdate = z.infer<typeof pacienteUpdate>;

// ---------- Ventanas de trabajo ----------
export const ventanaRecurrenteCreate = z
  .object({
    profesionalId: z.number().int().positive(),
    diaSemana: z.number().int().min(0).max(6),
    horaInicio: horaHHMM,
    horaFin: horaHHMM,
    duracionTurno: z.number().int().positive().nullable().optional(),
    modoConfirmacion: modoConfirmacion.nullable().optional(),
    vigenciaDesde: fechaISO.optional(),
    vigenciaHasta: fechaISO.nullable().optional(),
    activa: z.boolean().default(true),
  })
  .refine((v) => v.horaFin > v.horaInicio, {
    message: "La hora de fin debe ser posterior a la de inicio",
    path: ["horaFin"],
  });
export type VentanaRecurrenteCreate = z.infer<typeof ventanaRecurrenteCreate>;

export const ventanaRecurrenteUpdate = z.object({
  diaSemana: z.number().int().min(0).max(6).optional(),
  horaInicio: horaHHMM.optional(),
  horaFin: horaHHMM.optional(),
  duracionTurno: z.number().int().positive().nullable().optional(),
  modoConfirmacion: modoConfirmacion.nullable().optional(),
  vigenciaDesde: fechaISO.optional(),
  vigenciaHasta: fechaISO.nullable().optional(),
  activa: z.boolean().optional(),
});
export type VentanaRecurrenteUpdate = z.infer<typeof ventanaRecurrenteUpdate>;

export const ventanaExcepcionCreate = z.object({
  profesionalId: z.number().int().positive(),
  fecha: fechaISO,
  tipo: tipoExcepcionVentana,
  horaInicio: horaHHMM.nullable().optional(), // null = día completo
  horaFin: horaHHMM.nullable().optional(),
  motivo: z.string().max(300).optional(),
});
export type VentanaExcepcionCreate = z.infer<typeof ventanaExcepcionCreate>;

// ---------- Turnos (era reservas) ----------
export const turnoCreate = z
  .object({
    profesionalId: z.number().int().positive(),
    // Paciente existente (pacienteId) O datos para crear uno nuevo (paciente).
    pacienteId: z.number().int().positive().optional(),
    paciente: pacienteCreate.optional(),
    inicio: z.string().datetime({ offset: true }),
    fin: z.string().datetime({ offset: true }),
    esSobreturno: z.boolean().default(false),
    esParticular: z.boolean().default(false),
    origen: origenTurno.default("administrativo"),
    notas: z.string().max(500).optional(),
  })
  .refine((t) => t.fin > t.inicio, {
    message: "El fin debe ser posterior al inicio",
    path: ["fin"],
  })
  .refine((t) => t.pacienteId != null || t.paciente != null || t.origen === "administrativo", {
    message: "Falta el paciente (existente o nuevo)",
    path: ["paciente"],
  });
export type TurnoCreate = z.infer<typeof turnoCreate>;

export const turnoUpdate = z.object({
  inicio: z.string().datetime({ offset: true }).optional(),
  fin: z.string().datetime({ offset: true }).optional(),
  estado: estadoTurno.optional(),
  notas: z.string().max(500).optional(),
});
export type TurnoUpdate = z.infer<typeof turnoUpdate>;

// Bloqueo de agenda: un "turno" sin paciente (estado 'bloqueo').
export const bloqueoCreate = z
  .object({
    profesionalId: z.number().int().positive(),
    inicio: z.string().datetime({ offset: true }),
    fin: z.string().datetime({ offset: true }),
    motivo: z.string().max(500).optional(), // se guarda en notas
  })
  .refine((b) => b.fin > b.inicio, {
    message: "El fin debe ser posterior al inicio",
    path: ["fin"],
  });
export type BloqueoCreate = z.infer<typeof bloqueoCreate>;

// ---------- Configuración de la clínica ----------
export const configClinicaUpdate = z.object({
  nombre: z.string().min(1).max(120).optional(),
  razonSocial: z.string().max(160).nullable().optional(),
  cuit: z.string().max(20).nullable().optional(),
  direccion: z.string().max(200).nullable().optional(),
  cp: z.string().max(20).nullable().optional(),
  ciudad: z.string().max(120).nullable().optional(),
  provincia: z.string().max(120).nullable().optional(),
  pais: z.string().max(120).nullable().optional(),
  telefono: z.string().max(40).nullable().optional(),
  email: z.string().max(160).nullable().optional(),
  logoUrl: z.string().max(1000).nullable().optional(),
  duracionDefault: z.number().int().positive().optional(),
  modoConfirmacionDefault: modoConfirmacion.optional(),
});
export type ConfigClinicaUpdate = z.infer<typeof configClinicaUpdate>;

// ---------- Landing Manager ----------
export const landingConfigUpdate = z.object({
  landingTagline: z.string().max(200).nullable().optional(),
  landingSubtitulo: z.string().max(400).nullable().optional(),
  landingCtaTexto: z.string().max(80).nullable().optional(),
  landingCtaUrl: z.string().max(200).nullable().optional(),
});
export type LandingConfigUpdate = z.infer<typeof landingConfigUpdate>;

export const landingLinkCreate = z.object({
  label: z.string().min(1).max(120),
  url: z.string().min(1).max(300),
  activa: z.boolean().optional(),
});
export type LandingLinkCreate = z.infer<typeof landingLinkCreate>;

export const landingLinkUpdate = z.object({
  label: z.string().min(1).max(120).optional(),
  url: z.string().min(1).max(300).optional(),
  activa: z.boolean().optional(),
});
export type LandingLinkUpdate = z.infer<typeof landingLinkUpdate>;

export const landingLinksOrden = z.object({ ids: z.array(z.number()) });
export type LandingLinksOrden = z.infer<typeof landingLinksOrden>;

// ---------- Landing Servicios ----------
export const landingServicioCreate = z.object({
  titulo: z.string().min(1).max(120),
  descripcion: z.string().max(2000).optional(),
  imagenUrl: z.string().url().optional().or(z.literal("")),
  orden: z.number().int().default(0),
  activo: z.boolean().default(true),
});
export type LandingServicioCreate = z.infer<typeof landingServicioCreate>;
export const landingServicioUpdate = landingServicioCreate.partial();
export type LandingServicioUpdate = z.infer<typeof landingServicioUpdate>;

// ---------- Landing Contactos ----------
export const landingContactoCreate = z.object({
  label: z.string().min(1).max(120),
  url: z.string().min(1).max(300),
  iconoUrl: z.string().url().optional().or(z.literal("")),
  orden: z.number().int().default(0),
  activo: z.boolean().default(true),
});
export type LandingContactoCreate = z.infer<typeof landingContactoCreate>;
export const landingContactoUpdate = landingContactoCreate.partial();
export type LandingContactoUpdate = z.infer<typeof landingContactoUpdate>;
