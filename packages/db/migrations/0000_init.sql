-- ============================================================
-- Turnos Manager — esquema inicial (MVP v1.0)
-- ============================================================
-- Extensión necesaria para combinar igualdad (=) sobre profesional_id
-- con el operador de solapamiento (&&) de rangos en un mismo EXCLUDE.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------- Enums ----------
DO $$ BEGIN
  CREATE TYPE modo_confirmacion AS ENUM ('automatico', 'aprobacion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_excepcion_ventana AS ENUM ('agrega', 'bloquea');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE origen_turno AS ENUM ('online', 'administrativo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_turno AS ENUM (
    'solicitado', 'confirmado', 'en_sala', 'atendido', 'ausente', 'cancelado', 'bloqueo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Profesionales (recurso reservable + usuario opcional) ----------
-- auth_user_id nullable: recepción puede agendar a profesionales que no loguean.
CREATE TABLE IF NOT EXISTS profesionales (
  id                         SERIAL PRIMARY KEY,
  auth_user_id               TEXT REFERENCES auth_user(id) ON DELETE SET NULL,
  nombre                     VARCHAR(120) NOT NULL,
  especialidad               VARCHAR(120) NOT NULL,
  duracion_turno_default     INTEGER,               -- minutos; fallback a config_clinica
  modo_confirmacion_default  modo_confirmacion,      -- fallback a config_clinica
  ubicacion                  VARCHAR(200),           -- informativa (se muestra al reservar)
  color                      VARCHAR(20),            -- color de agenda
  activo                     BOOLEAN NOT NULL DEFAULT true,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Obras sociales ----------
CREATE TABLE IF NOT EXISTS obras_sociales (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  activa BOOLEAN NOT NULL DEFAULT true
);

-- M2M: qué obras sociales acepta cada profesional.
CREATE TABLE IF NOT EXISTS profesional_obras_sociales (
  profesional_id  INTEGER NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
  obra_social_id  INTEGER NOT NULL REFERENCES obras_sociales(id) ON DELETE CASCADE,
  PRIMARY KEY (profesional_id, obra_social_id)
);

-- ---------- Pacientes (era huéspedes) ----------
CREATE TABLE IF NOT EXISTS pacientes (
  id               SERIAL PRIMARY KEY,
  auth_user_id     TEXT REFERENCES auth_user(id) ON DELETE SET NULL,
  nombre           VARCHAR(120) NOT NULL,
  documento        VARCHAR(40),
  tipo_documento   VARCHAR(30),   -- DNI | Pasaporte | CE | Otro
  fecha_nacimiento DATE,
  email            VARCHAR(160),
  telefono         VARCHAR(40),
  obra_social_id   INTEGER REFERENCES obras_sociales(id),
  nro_afiliado     VARCHAR(60),
  notas            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Ventanas de trabajo ----------
-- Disponibilidad recurrente por día de semana (0=domingo .. 6=sábado).
CREATE TABLE IF NOT EXISTS ventanas_recurrentes (
  id                 SERIAL PRIMARY KEY,
  profesional_id     INTEGER NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
  dia_semana         INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio        TIME NOT NULL,
  hora_fin           TIME NOT NULL,
  duracion_turno     INTEGER,             -- minutos; nullable → fallback a profesional/config
  modo_confirmacion  modo_confirmacion,   -- nullable → fallback a profesional/config
  vigencia_desde     DATE NOT NULL DEFAULT CURRENT_DATE,
  vigencia_hasta     DATE,
  activa             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ventana_horario CHECK (hora_fin > hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_ventanas_recurrentes_profesional
  ON ventanas_recurrentes(profesional_id);

-- Altas/bloqueos puntuales por fecha (feriado, ausencia, agrega guardia, etc.)
CREATE TABLE IF NOT EXISTS ventanas_excepciones (
  id              SERIAL PRIMARY KEY,
  profesional_id  INTEGER NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL,
  tipo            tipo_excepcion_ventana NOT NULL,
  hora_inicio     TIME,   -- NULL = día completo
  hora_fin        TIME,
  motivo          VARCHAR(300),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ventanas_excepciones_profesional_fecha
  ON ventanas_excepciones(profesional_id, fecha);

-- ---------- Turnos (era reservas) ----------
CREATE TABLE IF NOT EXISTS turnos (
  id             SERIAL PRIMARY KEY,
  profesional_id INTEGER NOT NULL REFERENCES profesionales(id),
  paciente_id    INTEGER REFERENCES pacientes(id),  -- NULL para bloqueos de agenda
  inicio         TIMESTAMPTZ NOT NULL,
  fin            TIMESTAMPTZ NOT NULL,
  estado         estado_turno NOT NULL DEFAULT 'confirmado',
  es_sobreturno  BOOLEAN NOT NULL DEFAULT false,
  es_particular  BOOLEAN NOT NULL DEFAULT false,
  origen         origen_turno NOT NULL DEFAULT 'administrativo',
  notas          TEXT,
  confirmado_at  TIMESTAMPTZ,
  arribo_at      TIMESTAMPTZ,
  atendido_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_turno_rango CHECK (fin > inicio)
);

CREATE INDEX IF NOT EXISTS idx_turnos_profesional ON turnos(profesional_id, inicio);
CREATE INDEX IF NOT EXISTS idx_turnos_paciente ON turnos(paciente_id);

-- ============================================================
-- 🔒 ANTI-OVERBOOKING — la pieza clave
-- Dos turnos NO cancelados y NO sobreturno no pueden solapar horario para el
-- mismo profesional. El rango '[)' incluye el inicio y excluye el fin, así un
-- turno que termina 10:00 y otro que arranca 10:00 NO chocan.
-- Sobreturnos (es_sobreturno = true) quedan fuera del constraint a propósito:
-- solo profesional/administrativo pueden emitirlos (nunca el flujo online del
-- paciente), así el paciente jamás genera un solapamiento.
-- Bloqueos de agenda (estado 'bloqueo', sin paciente) participan del
-- constraint igual que un turno normal.
-- ============================================================
ALTER TABLE turnos
  ADD CONSTRAINT turnos_sin_solapamiento
  EXCLUDE USING gist (
    profesional_id WITH =,
    tstzrange(inicio, fin, '[)') WITH &&
  ) WHERE (estado <> 'cancelado' AND NOT es_sobreturno);

-- ---------- Configuración de la clínica ----------
CREATE TABLE IF NOT EXISTS config_clinica (
  id                         INTEGER PRIMARY KEY DEFAULT 1,
  nombre                     VARCHAR(120) NOT NULL DEFAULT 'Mi Clínica',
  razon_social               VARCHAR(160),
  cuit                       VARCHAR(20),
  direccion                  VARCHAR(200),
  cp                         VARCHAR(20),
  ciudad                     VARCHAR(120),
  provincia                  VARCHAR(120),
  pais                       VARCHAR(120),
  telefono                   VARCHAR(40),
  email                      VARCHAR(160),
  logo_url                   TEXT,
  duracion_default           INTEGER NOT NULL DEFAULT 30,
  modo_confirmacion_default  modo_confirmacion NOT NULL DEFAULT 'automatico',
  -- Landing page
  landing_tagline            VARCHAR(200),
  landing_subtitulo          VARCHAR(400),
  landing_cta_texto          VARCHAR(80),
  landing_cta_url            VARCHAR(200)
);

INSERT INTO config_clinica (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ---------- Better Auth (tablas auth_*) ----------
-- Roles: admin | profesional | administrativo | paciente (default paciente).
CREATE TABLE IF NOT EXISTS auth_user (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  image          TEXT,
  role           TEXT NOT NULL DEFAULT 'paciente',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_session (
  id          TEXT PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address  TEXT,
  user_agent  TEXT,
  user_id     TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_account (
  id                       TEXT PRIMARY KEY,
  account_id               TEXT NOT NULL,
  provider_id              TEXT NOT NULL,
  user_id                  TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  access_token             TEXT,
  refresh_token            TEXT,
  id_token                 TEXT,
  access_token_expires_at  TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope                    TEXT,
  password                 TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_verification (
  id          TEXT PRIMARY KEY,
  identifier  TEXT NOT NULL,
  value       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ---------- Landing pública (reciclado de Suites) ----------
CREATE TABLE IF NOT EXISTS landing_fotos (
  id         SERIAL PRIMARY KEY,
  url        TEXT NOT NULL,
  alt_texto  VARCHAR(200),
  orden      INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS landing_links (
  id     SERIAL PRIMARY KEY,
  label  VARCHAR(120) NOT NULL,
  url    VARCHAR(300) NOT NULL,
  orden  INTEGER NOT NULL DEFAULT 0,
  activa BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS landing_servicios (
  id          SERIAL PRIMARY KEY,
  titulo      VARCHAR(120) NOT NULL,
  descripcion TEXT,
  imagen_url  TEXT,
  orden       INTEGER NOT NULL DEFAULT 0,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS landing_contactos (
  id         SERIAL PRIMARY KEY,
  label      VARCHAR(120) NOT NULL,
  url        VARCHAR(300) NOT NULL,
  icono_url  TEXT,
  orden      INTEGER NOT NULL DEFAULT 0,
  activo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Audit log (con hash encadenado desde el día 1) ----------
CREATE TABLE IF NOT EXISTS audit_log (
  id            SERIAL PRIMARY KEY,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id       TEXT NOT NULL,
  user_name     TEXT NOT NULL,
  user_email    TEXT NOT NULL,
  accion        VARCHAR(20) NOT NULL,   -- 'crear' | 'editar' | 'eliminar'
  entidad       VARCHAR(40) NOT NULL,   -- 'turnos' | 'profesionales' | 'pacientes' | ...
  entidad_id    TEXT,
  entidad_label TEXT,
  diff          TEXT,   -- JSON stringificado — evita import jsonb en esbuild
  ip            TEXT,
  hash          TEXT,   -- sha256(hash_anterior + datos de la fila)
  hash_anterior TEXT    -- hash de la fila previa (cadena tamper-evident)
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user      ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entidad   ON audit_log (entidad);
CREATE INDEX IF NOT EXISTS idx_audit_accion    ON audit_log (accion);
CREATE INDEX IF NOT EXISTS idx_audit_search    ON audit_log
  USING gin(to_tsvector('spanish',
    coalesce(user_name,'') || ' ' ||
    coalesce(user_email,'') || ' ' ||
    coalesce(entidad_label,'') || ' ' ||
    coalesce(entidad,'')
  ));
