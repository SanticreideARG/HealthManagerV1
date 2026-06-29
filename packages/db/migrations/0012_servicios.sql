CREATE TABLE servicios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT,
  precio NUMERIC(12,2) NOT NULL DEFAULT 0,
  unidad VARCHAR(40) NOT NULL DEFAULT 'unidad',
  categoria VARCHAR(60),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO servicios (nombre, precio, unidad, categoria) VALUES
  ('Desayuno continental', 1500.00, 'persona', 'comida'),
  ('Almuerzo', 2500.00, 'persona', 'comida'),
  ('Cena', 3000.00, 'persona', 'comida'),
  ('Transfer aeropuerto', 8000.00, 'unidad', 'transporte'),
  ('Lavandería', 1200.00, 'kg', 'lavanderia'),
  ('Late check-out (por hora)', 2000.00, 'hora', 'alojamiento');

CREATE TABLE consumos (
  id SERIAL PRIMARY KEY,
  reserva_id INTEGER NOT NULL REFERENCES reservas(id),
  servicio_id INTEGER REFERENCES servicios(id),
  descripcion VARCHAR(200) NOT NULL,
  cantidad NUMERIC(8,2) NOT NULL DEFAULT 1,
  precio_unit NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notas TEXT
);

CREATE INDEX idx_consumos_reserva ON consumos(reserva_id);
