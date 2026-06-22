import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app.js";

/** Servidor Node para desarrollo local (`pnpm dev`). En Vercel se usa
 * api/index.ts con el adaptador serverless, no este archivo. */
const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API escuchando en http://localhost:${info.port}`);
});
