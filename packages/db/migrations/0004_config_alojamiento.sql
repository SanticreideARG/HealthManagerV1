-- Configuración del alojamiento (fila única id=1). Reemplaza los datos
-- hardcodeados del comprobante y habilita futura facturación.
CREATE TABLE IF NOT EXISTS config (
  id           INTEGER PRIMARY KEY DEFAULT 1,
  nombre       VARCHAR(120) NOT NULL DEFAULT 'Mi Alojamiento',
  razon_social VARCHAR(160),
  cuit         VARCHAR(20),
  direccion    VARCHAR(200),
  cp           VARCHAR(20),
  ciudad       VARCHAR(120),
  provincia    VARCHAR(120),
  pais         VARCHAR(120),
  telefono     VARCHAR(40),
  email        VARCHAR(160),
  logo_url     TEXT,
  CONSTRAINT config_single CHECK (id = 1)
);

INSERT INTO config (id, nombre, razon_social, cuit, direccion, telefono, email, pais)
VALUES (1, 'Suites Manager', 'Mi Alojamiento S.R.L.', '30-00000000-0',
        'Av. Siempreviva 742', '+54 9 11 0000-0000', 'reservas@mialojamiento.com',
        'Argentina')
ON CONFLICT (id) DO NOTHING;
