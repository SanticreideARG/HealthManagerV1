-- Fase A de la ficha de huésped: datos de identidad con mayor valor operativo y legal
ALTER TABLE huespedes
  ADD COLUMN tipo_documento   VARCHAR(30),  -- DNI | Pasaporte | CE | Otro
  ADD COLUMN nacionalidad     VARCHAR(80),
  ADD COLUMN fecha_nacimiento DATE;
