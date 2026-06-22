import { handle } from "hono/vercel";
import app from "../src/app.js";

/** Entry de función serverless para Vercel. Todas las rutas se reescriben
 * a /api (ver vercel.json) y Hono enruta internamente por el path original. */
export const config = { runtime: "nodejs" };

export default handle(app);
