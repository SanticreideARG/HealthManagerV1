CREATE TABLE audit_log (
  id          SERIAL PRIMARY KEY,
  timestamp   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id     TEXT NOT NULL,
  user_name   TEXT NOT NULL,
  user_email  TEXT NOT NULL,
  accion      VARCHAR(20) NOT NULL,   -- 'crear' | 'editar' | 'eliminar'
  entidad     VARCHAR(40) NOT NULL,   -- 'reservas' | 'pagos' | 'huespedes' | ...
  entidad_id  TEXT,
  entidad_label TEXT,
  diff        JSONB,
  ip          TEXT
);

CREATE INDEX idx_audit_timestamp ON audit_log (timestamp DESC);
CREATE INDEX idx_audit_user      ON audit_log (user_id);
CREATE INDEX idx_audit_entidad   ON audit_log (entidad);
CREATE INDEX idx_audit_accion    ON audit_log (accion);
CREATE INDEX idx_audit_search    ON audit_log
  USING gin(to_tsvector('spanish',
    coalesce(user_name,'') || ' ' ||
    coalesce(user_email,'') || ' ' ||
    coalesce(entidad_label,'') || ' ' ||
    coalesce(entidad,'')
  ));
