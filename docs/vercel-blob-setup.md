# Vercel Blob — Setup y pasos de integración

Contexto: usaremos Vercel Blob para almacenar imágenes (logo del alojamiento y
fotos por unidad). La URL se guarda en la DB; el binario vive en Blob.

---

## 1. Activar Blob en Vercel

1. Ir a **vercel.com → tu proyecto API** (el que deployea `apps/api`).
2. Pestaña **Storage → Connect Store → Blob**.
3. Crear un store (ej. `turnos-manager-blob`). Vercel agrega automáticamente
   la variable `BLOB_READ_WRITE_TOKEN` al proyecto.
4. En **Settings → Environment Variables**, copiar `BLOB_READ_WRITE_TOKEN` y
   agregarla también al proyecto **web** (si el upload se hace desde el cliente
   vía token público — ver opción B más abajo).

---

## 2. Instalar el SDK

```bash
pnpm --filter api add @vercel/blob
```

Si el upload se hace desde el cliente (opción B):
```bash
pnpm --filter web add @vercel/blob
```

---

## 3. Variables de entorno locales

Agregar a `apps/api/.env`:
```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxx
```

En producción, Vercel la inyecta automáticamente tras conectar el store.

---

## 4. Estrategia de upload — dos opciones

### Opción A: Upload server-side (recomendada para logo)

El cliente envía el archivo a la API → la API lo sube a Blob → devuelve la URL.

**Endpoint a crear:** `PUT /config/logo` (admin only)
- Recibe `multipart/form-data` con campo `file`.
- Sube a Blob con `put("logos/...", stream, { access: "public" })`.
- Guarda la URL en `config.logoUrl` y la devuelve.

```ts
import { put } from "@vercel/blob";

// En el handler Hono:
const form = await c.req.formData();
const file = form.get("file") as File;
const { url } = await put(`logos/${Date.now()}-${file.name}`, file.stream(), {
  access: "public",
  contentType: file.type,
});
await db.update(config).set({ logoUrl: url }).where(eq(config.id, 1));
return c.json({ url });
```

### Opción B: Upload client-side con token público (recomendada para fotos)

Más rápido (evita pasar el binario por la API). El cliente sube directamente
a Blob con un **client token** generado por la API.

**Endpoint a crear:** `POST /upload/token` (admin only)
- La API genera un token de upload temporal con `generateClientTokenFromReadWriteToken`.
- El cliente usa `@vercel/blob` en React para subir directamente.

```ts
// API: genera el token
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
const clientToken = await generateClientTokenFromReadWriteToken({
  token: process.env.BLOB_READ_WRITE_TOKEN!,
  pathname: `fotos/${habitacionId}/`,
  onUploadCompleted: { callbackUrl: `${process.env.API_URL}/upload/callback` },
});
return c.json({ clientToken });

// Web: usa el token para subir
import { upload } from "@vercel/blob/client";
const { url } = await upload(file.name, file, {
  access: "public",
  handleUploadUrl: "/upload/token",
});
```

---

## 5. Optimización en el cliente antes de subir

Antes de enviar cualquier imagen, comprimir/redimensionar en el browser:

```ts
async function optimizarImagen(file: File, maxPx = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((res) =>
    canvas.toBlob((b) => res(b!), "image/webp", 0.85),
  );
}
```

Formatos aceptados: JPG y WebP. Máximo 10 fotos por unidad.

---

## 6. Schema DB — columnas a agregar

### Migration 0008_fotos_alojamiento.sql (pendiente)

```sql
-- Fotos por habitación (máx. 10 por unidad)
CREATE TABLE habitacion_fotos (
  id             SERIAL PRIMARY KEY,
  habitacion_id  INTEGER NOT NULL REFERENCES habitaciones(id) ON DELETE CASCADE,
  url            TEXT NOT NULL,         -- URL pública de Vercel Blob
  orden          SMALLINT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_habitacion_fotos ON habitacion_fotos (habitacion_id, orden);
```

`config.logo_url` ya existe (columna TEXT nullable). Solo hay que implementar
el upload; no requiere migración adicional.

---

## 7. Endpoints API a crear (pendiente)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `PUT` | `/config/logo` | Subir/reemplazar logo del alojamiento |
| `GET` | `/habitaciones/:id/fotos` | Listar fotos de una unidad |
| `POST` | `/habitaciones/:id/fotos` | Subir foto (máx. 10) |
| `DELETE` | `/habitaciones/:id/fotos/:fotoId` | Eliminar foto |
| `PATCH` | `/habitaciones/:id/fotos/orden` | Reordenar fotos |

---

## 8. Notas adicionales

- **Límites Vercel Blob (plan hobby):** 500 MB de almacenamiento, 100 GB de
  transferencia/mes. Suficiente para un alojamiento pequeño.
- **Nombres de archivo:** usar `Date.now()` o `crypto.randomUUID()` como
  prefijo para evitar colisiones y cachés obsoletos.
- **Limpieza de blobs huérfanos:** al reemplazar una foto, borrar la anterior
  con `del(url)` del SDK para no acumular archivos.
- **Acceso público:** todas las URLs son públicas (`access: "public"`). No hay
  contenido sensible en imágenes de habitaciones.
- **Vercel en local:** el SDK necesita `BLOB_READ_WRITE_TOKEN` en `.env` para
  funcionar en desarrollo. Sin él, lanzar un error claro al usuario.
