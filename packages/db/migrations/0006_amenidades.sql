-- Catálogo de características reutilizables por alojamiento
CREATE TYPE tipo_amenidad AS ENUM ('bool', 'texto', 'numero');

CREATE TABLE amenidades (
  id      SERIAL PRIMARY KEY,
  nombre  VARCHAR(120) NOT NULL,
  tipo    tipo_amenidad NOT NULL DEFAULT 'bool',
  icono   VARCHAR(10)           -- emoji o símbolo corto (opcional)
);

-- Asignación catálogo × habitación.
-- valor = NULL para booleanas (presencia = true); texto o número como string.
CREATE TABLE habitacion_amenidades (
  habitacion_id  INTEGER NOT NULL REFERENCES habitaciones(id) ON DELETE CASCADE,
  amenidad_id    INTEGER NOT NULL REFERENCES amenidades(id)   ON DELETE CASCADE,
  valor          TEXT,
  PRIMARY KEY (habitacion_id, amenidad_id)
);
