import {
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  varchar,
  integer,
  date,
  time,
  timestamp,
  text,
  boolean,
  index,
} from "drizzle-orm/pg-core";

/**
 * Schema Drizzle: tipado de queries en la API.
 *
 * OJO: la restricción anti-overbooking (EXCLUDE USING gist) NO se puede
 * expresar en el DSL de Drizzle. Vive en migrations/0000_init.sql y es la
 * fuente de verdad del DDL. Mantené ambos en sync.
 */

export const modoConfirmacionEnum = pgEnum("modo_confirmacion", [
  "automatico",
  "aprobacion",
]);

export const tipoExcepcionVentanaEnum = pgEnum("tipo_excepcion_ventana", [
  "agrega",
  "bloquea",
]);

export const origenTurnoEnum = pgEnum("origen_turno", ["online", "administrativo"]);

export const estadoTurnoEnum = pgEnum("estado_turno", [
  "solicitado",
  "confirmado",
  "en_sala",
  "atendido",
  "ausente",
  "cancelado",
  "bloqueo",
]);

// ---------- Better Auth (tablas auth_*; nombres de propiedad = campos de Better Auth) ----------
export const authUser = pgTable("auth_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("paciente"), // admin | profesional | administrativo | paciente
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authSession = pgTable("auth_session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
});

export const authAccount = pgTable("auth_account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authVerification = pgTable("auth_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------- Profesionales (recurso reservable + usuario opcional) ----------
export const profesionales = pgTable("profesionales", {
  id: serial("id").primaryKey(),
  authUserId: text("auth_user_id").references(() => authUser.id, { onDelete: "set null" }),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  especialidad: varchar("especialidad", { length: 120 }).notNull(),
  duracionTurnoDefault: integer("duracion_turno_default"), // minutos; fallback a config
  modoConfirmacionDefault: modoConfirmacionEnum("modo_confirmacion_default"),
  ubicacion: varchar("ubicacion", { length: 200 }),
  color: varchar("color", { length: 20 }),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Obras sociales ----------
export const obrasSociales = pgTable("obras_sociales", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 120 }).notNull().unique(),
  activa: boolean("activa").notNull().default(true),
});

export const profesionalObrasSociales = pgTable(
  "profesional_obras_sociales",
  {
    profesionalId: integer("profesional_id")
      .notNull()
      .references(() => profesionales.id, { onDelete: "cascade" }),
    obraSocialId: integer("obra_social_id")
      .notNull()
      .references(() => obrasSociales.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.profesionalId, t.obraSocialId] })],
);

// ---------- Pacientes (era huéspedes) ----------
export const pacientes = pgTable("pacientes", {
  id: serial("id").primaryKey(),
  authUserId: text("auth_user_id").references(() => authUser.id, { onDelete: "set null" }),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  documento: varchar("documento", { length: 40 }),
  tipoDocumento: varchar("tipo_documento", { length: 30 }), // DNI | Pasaporte | CE | Otro
  fechaNacimiento: date("fecha_nacimiento"),
  email: varchar("email", { length: 160 }),
  telefono: varchar("telefono", { length: 40 }),
  obraSocialId: integer("obra_social_id").references(() => obrasSociales.id),
  nroAfiliado: varchar("nro_afiliado", { length: 60 }),
  notas: text("notas"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Ventanas de trabajo ----------
export const ventanasRecurrentes = pgTable(
  "ventanas_recurrentes",
  {
    id: serial("id").primaryKey(),
    profesionalId: integer("profesional_id")
      .notNull()
      .references(() => profesionales.id, { onDelete: "cascade" }),
    diaSemana: integer("dia_semana").notNull(), // 0=domingo .. 6=sábado
    horaInicio: time("hora_inicio").notNull(),
    horaFin: time("hora_fin").notNull(),
    duracionTurno: integer("duracion_turno"), // minutos; nullable → fallback
    modoConfirmacion: modoConfirmacionEnum("modo_confirmacion"), // nullable → fallback
    vigenciaDesde: date("vigencia_desde").notNull(),
    vigenciaHasta: date("vigencia_hasta"),
    activa: boolean("activa").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_ventanas_recurrentes_profesional").on(t.profesionalId)],
);

export const ventanasExcepciones = pgTable(
  "ventanas_excepciones",
  {
    id: serial("id").primaryKey(),
    profesionalId: integer("profesional_id")
      .notNull()
      .references(() => profesionales.id, { onDelete: "cascade" }),
    fecha: date("fecha").notNull(),
    tipo: tipoExcepcionVentanaEnum("tipo").notNull(),
    horaInicio: time("hora_inicio"), // NULL = día completo
    horaFin: time("hora_fin"),
    motivo: varchar("motivo", { length: 300 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_ventanas_excepciones_profesional_fecha").on(t.profesionalId, t.fecha)],
);

// ---------- Turnos (era reservas) ----------
export const turnos = pgTable(
  "turnos",
  {
    id: serial("id").primaryKey(),
    profesionalId: integer("profesional_id")
      .notNull()
      .references(() => profesionales.id),
    // NULL para bloqueos de agenda (estado 'bloqueo').
    pacienteId: integer("paciente_id").references(() => pacientes.id),
    inicio: timestamp("inicio", { withTimezone: true }).notNull(),
    fin: timestamp("fin", { withTimezone: true }).notNull(),
    estado: estadoTurnoEnum("estado").notNull().default("confirmado"),
    esSobreturno: boolean("es_sobreturno").notNull().default(false),
    esParticular: boolean("es_particular").notNull().default(false),
    origen: origenTurnoEnum("origen").notNull().default("administrativo"),
    notas: text("notas"),
    confirmadoAt: timestamp("confirmado_at", { withTimezone: true }),
    arriboAt: timestamp("arribo_at", { withTimezone: true }),
    atendidoAt: timestamp("atendido_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_turnos_profesional").on(t.profesionalId, t.inicio),
    index("idx_turnos_paciente").on(t.pacienteId),
  ],
);

// ---------- Configuración de la clínica ----------
export const configClinica = pgTable("config_clinica", {
  id: integer("id").primaryKey().default(1),
  nombre: varchar("nombre", { length: 120 }).notNull().default("Mi Clínica"),
  razonSocial: varchar("razon_social", { length: 160 }),
  cuit: varchar("cuit", { length: 20 }),
  direccion: varchar("direccion", { length: 200 }),
  cp: varchar("cp", { length: 20 }),
  ciudad: varchar("ciudad", { length: 120 }),
  provincia: varchar("provincia", { length: 120 }),
  pais: varchar("pais", { length: 120 }),
  telefono: varchar("telefono", { length: 40 }),
  email: varchar("email", { length: 160 }),
  logoUrl: text("logo_url"),
  duracionDefault: integer("duracion_default").notNull().default(30),
  modoConfirmacionDefault: modoConfirmacionEnum("modo_confirmacion_default")
    .notNull()
    .default("automatico"),
  // Landing page
  landingTagline: varchar("landing_tagline", { length: 200 }),
  landingSubtitulo: varchar("landing_subtitulo", { length: 400 }),
  landingCtaTexto: varchar("landing_cta_texto", { length: 80 }),
  landingCtaUrl: varchar("landing_cta_url", { length: 200 }),
});

// ---------- Landing pública (reciclado de Suites) ----------
export const landingFotos = pgTable("landing_fotos", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  altTexto: varchar("alt_texto", { length: 200 }),
  orden: integer("orden").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const landingLinks = pgTable("landing_links", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 120 }).notNull(),
  url: varchar("url", { length: 300 }).notNull(),
  orden: integer("orden").notNull().default(0),
  activa: boolean("activa").notNull().default(true),
});

export const landingServicios = pgTable("landing_servicios", {
  id: serial("id").primaryKey(),
  titulo: varchar("titulo", { length: 120 }).notNull(),
  descripcion: text("descripcion"),
  imagenUrl: text("imagen_url"),
  orden: integer("orden").notNull().default(0),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const landingContactos = pgTable("landing_contactos", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 120 }).notNull(),
  url: varchar("url", { length: 300 }).notNull(),
  iconoUrl: text("icono_url"),
  orden: integer("orden").notNull().default(0),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Audit Log ----------
export const auditLog = pgTable("audit_log", {
  id:           serial("id").primaryKey(),
  timestamp:    timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  userId:       text("user_id").notNull(),
  userName:     text("user_name").notNull(),
  userEmail:    text("user_email").notNull(),
  accion:       varchar("accion", { length: 20 }).notNull(),
  entidad:      varchar("entidad", { length: 40 }).notNull(),
  entidadId:    text("entidad_id"),
  entidadLabel: text("entidad_label"),
  diff:         text("diff"),  // JSON stringificado — evita import jsonb en esbuild
  ip:           text("ip"),
  hash:         text("hash"),           // sha256(hashAnterior + datos de la fila)
  hashAnterior: text("hash_anterior"),  // hash de la fila previa (cadena tamper-evident)
});

export type Profesional = typeof profesionales.$inferSelect;
export type ObraSocial = typeof obrasSociales.$inferSelect;
export type ProfesionalObraSocial = typeof profesionalObrasSociales.$inferSelect;
export type Paciente = typeof pacientes.$inferSelect;
export type VentanaRecurrente = typeof ventanasRecurrentes.$inferSelect;
export type VentanaExcepcion = typeof ventanasExcepciones.$inferSelect;
export type Turno = typeof turnos.$inferSelect;
export type ConfigClinica = typeof configClinica.$inferSelect;
export type LandingFoto = typeof landingFotos.$inferSelect;
export type LandingLink = typeof landingLinks.$inferSelect;
export type LandingServicio = typeof landingServicios.$inferSelect;
export type LandingContacto = typeof landingContactos.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
