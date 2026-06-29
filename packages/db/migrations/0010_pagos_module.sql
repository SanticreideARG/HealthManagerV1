-- Módulo de facturación: impuestos, catálogo de métodos de pago y ampliación de pagos.

-- Impuestos configurables (IVA, tasa municipal, etc.)
CREATE TABLE impuestos (
  id       SERIAL PRIMARY KEY,
  nombre   VARCHAR(120) NOT NULL,
  tipo     VARCHAR(20)  NOT NULL CHECK (tipo IN ('porcentaje', 'monto_fijo')),
  valor    NUMERIC(8,4) NOT NULL,
  aplica_a VARCHAR(30)  NOT NULL DEFAULT 'todo',  -- 'todo' | 'habitacion' | 'cargo'
  activo   BOOLEAN      NOT NULL DEFAULT true,
  orden    SMALLINT     NOT NULL DEFAULT 0
);

-- Catálogo de métodos de pago (efectivo, tarjeta, QR, etc.)
CREATE TABLE metodos_pago (
  id          SERIAL PRIMARY KEY,
  tipo        VARCHAR(30)  NOT NULL,   -- 'efectivo' | 'transferencia' | 'tarjeta' | 'qr' | 'billetera'
  nombre      VARCHAR(120) NOT NULL,
  banco       VARCHAR(80),
  cuotas      SMALLINT     NOT NULL DEFAULT 1,
  recargo_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  proveedor   VARCHAR(80),
  activo      BOOLEAN      NOT NULL DEFAULT true
);

-- Ampliar tabla de pagos con referencia al catálogo y campos extra
ALTER TABLE pagos
  ALTER COLUMN metodo DROP NOT NULL,
  ADD COLUMN metodo_id    INTEGER REFERENCES metodos_pago(id),
  ADD COLUMN monto_base   NUMERIC(12,2),
  ADD COLUMN monto_extras NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN referencia   VARCHAR(200),
  ADD COLUMN notas        TEXT;

-- Métodos de pago por defecto (siempre presentes)
INSERT INTO metodos_pago (tipo, nombre, activo) VALUES
  ('efectivo',      'Efectivo',              true),
  ('transferencia', 'Transferencia bancaria', true);
