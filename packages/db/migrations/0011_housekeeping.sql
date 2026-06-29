-- Módulo Housekeeping: tareas de limpieza, mantenimiento e inspección por habitación.
-- Se generan automáticamente al hacer checkout (limpieza pendiente del próximo día).

CREATE TABLE tareas_housekeeping (
  id            SERIAL PRIMARY KEY,
  habitacion_id INTEGER NOT NULL REFERENCES habitaciones(id),
  reserva_id    INTEGER REFERENCES reservas(id),
  tipo          VARCHAR(30)  NOT NULL DEFAULT 'limpieza'
                  CHECK (tipo IN ('limpieza', 'mantenimiento', 'inspeccion')),
  descripcion   TEXT,
  prioridad     VARCHAR(20)  NOT NULL DEFAULT 'normal'
                  CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
  estado        VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'en_proceso', 'completado', 'cancelado')),
  fecha_programada DATE NOT NULL,
  asignado_a    VARCHAR(120),
  notas         TEXT,
  completado_at TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hk_habitacion ON tareas_housekeeping (habitacion_id, fecha_programada);
CREATE INDEX idx_hk_estado     ON tareas_housekeeping (estado, fecha_programada);
