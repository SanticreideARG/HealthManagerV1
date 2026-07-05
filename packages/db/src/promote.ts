import { sql } from "./index.js";

/**
 * Asigna un rol a un usuario por email.
 * Uso: pnpm db:promote <email> <admin|profesional|administrativo|paciente>
 */
const email = process.argv[2];
const role = process.argv[3];

const ROLES = ["admin", "profesional", "administrativo", "paciente"];
if (!email || !ROLES.includes(role ?? "")) {
  console.error(`Uso: pnpm db:promote <email> <${ROLES.join("|")}>`);
  process.exit(1);
}

const rows = (await sql`
  UPDATE auth_user SET role = ${role} WHERE email = ${email} RETURNING email, role
`) as { email: string; role: string }[];

const fila = rows[0];
if (!fila) {
  console.error(`No se encontró el usuario ${email}`);
  process.exit(1);
}
console.log(`OK: ${fila.email} → ${fila.role}`);
process.exit(0);
