-- Fotos por habitación almacenadas en Vercel Blob (máx. 10 por unidad)
CREATE TABLE habitacion_fotos (
  id             SERIAL PRIMARY KEY,
  habitacion_id  INTEGER NOT NULL REFERENCES habitaciones(id) ON DELETE CASCADE,
  url            TEXT NOT NULL,
  orden          SMALLINT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_habitacion_fotos ON habitacion_fotos (habitacion_id, orden);
