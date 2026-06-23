import { getRequestListener } from "@hono/node-server";
import app from "./app.js";

/**
 * Handler Node (req, res) para la función serverless de Vercel (Build Output
 * API). El build (scripts/build-vercel.mjs) lo bundlea con esbuild en
 * .vercel/output/functions/api.func/index.js, autocontenido.
 */
export default getRequestListener(app.fetch);
