import { db, profesionales, obrasSociales, profesionalObrasSociales, ventanasRecurrentes } from "./index.js";

/** Carga profesionales, obras sociales y ventanas de ejemplo para probar la agenda. */
async function main() {
  const existentes = await db.select().from(profesionales);
  if (existentes.length > 0) {
    console.log(`Ya hay ${existentes.length} profesionales, no hago seed.`);
    process.exit(0);
  }

  const os = await db
    .insert(obrasSociales)
    .values([
      { nombre: "OSDE" },
      { nombre: "Swiss Medical" },
      { nombre: "IOMA" },
      { nombre: "PAMI" },
    ])
    .returning();

  const profs = await db
    .insert(profesionales)
    .values([
      { nombre: "Dra. Ana López", especialidad: "Clínica médica", duracionTurnoDefault: 20 },
      { nombre: "Dr. Martín Pérez", especialidad: "Cardiología", duracionTurnoDefault: 30 },
      { nombre: "Lic. Sofía Ruiz", especialidad: "Psicología", duracionTurnoDefault: 40 },
      { nombre: "Dr. Lucas Medina", especialidad: "Pediatría", duracionTurnoDefault: 20 },
      { nombre: "Dra. Valentina Torres", especialidad: "Traumatología", duracionTurnoDefault: 30 },
    ])
    .returning();

  for (const p of profs) {
    await db.insert(profesionalObrasSociales).values(
      os.slice(0, 2).map((o) => ({ profesionalId: p.id, obraSocialId: o.id })),
    );
  }

  // Lunes a viernes, 9 a 13hs, para cada profesional.
  const ventanas = profs.flatMap((p) =>
    [1, 2, 3, 4, 5].map((diaSemana) => ({
      profesionalId: p.id,
      diaSemana,
      horaInicio: "09:00",
      horaFin: "13:00",
      vigenciaDesde: new Date().toISOString().slice(0, 10),
    })),
  );
  await db.insert(ventanasRecurrentes).values(ventanas);

  console.log(`Seed listo: ${profs.length} profesionales, ${os.length} obras sociales, ${ventanas.length} ventanas.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
