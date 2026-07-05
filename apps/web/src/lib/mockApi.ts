import type {
  ApiClient,
  PublicProfesional,
  Config,
  Usuario,
  LandingConfig,
  LandingFoto,
  LandingLink,
  LandingServicio,
  LandingContacto,
  AuditLogPage,
  AuditVerifyResult,
  Profesional,
  ObraSocial,
  VentanaRecurrente,
  VentanaExcepcion,
  Paciente,
} from "./types.js";

/** Datos en memoria para `pnpm dev:mock` (VITE_MOCK=1), sin base de datos. */

let config: Config = {
  id: 1,
  nombre: "Clínica Demo",
  razonSocial: null,
  cuit: null,
  direccion: null,
  cp: null,
  ciudad: null,
  provincia: null,
  pais: null,
  telefono: null,
  email: null,
  logoUrl: null,
  duracionDefault: 30,
  modoConfirmacionDefault: "automatico",
  landingTagline: "Reservá tu turno",
  landingSubtitulo: "Encontrá al profesional adecuado y reservá en pocos pasos.",
  landingCtaTexto: "Ver profesionales",
  landingCtaUrl: "#profesionales",
};

let obrasSocialesCat: ObraSocial[] = [
  { id: 1, nombre: "OSDE", activa: true },
  { id: 2, nombre: "Swiss Medical", activa: true },
  { id: 3, nombre: "IOMA", activa: true },
  { id: 4, nombre: "PAMI", activa: true },
];

let profesionales: Profesional[] = [
  {
    id: 1, authUserId: null, nombre: "Dra. Ana López", especialidad: "Clínica médica",
    duracionTurnoDefault: 20, modoConfirmacionDefault: null, ubicacion: "Sede Centro",
    color: "#0E5A6B", activo: true, createdAt: new Date().toISOString(),
    obrasSociales: [{ id: 1, nombre: "OSDE" }, { id: 2, nombre: "Swiss Medical" }],
  },
  {
    id: 2, authUserId: null, nombre: "Dr. Martín Pérez", especialidad: "Cardiología",
    duracionTurnoDefault: 30, modoConfirmacionDefault: null, ubicacion: "Sede Centro",
    color: "#2E8C79", activo: true, createdAt: new Date().toISOString(),
    obrasSociales: [{ id: 1, nombre: "OSDE" }],
  },
  {
    id: 3, authUserId: null, nombre: "Lic. Sofía Ruiz", especialidad: "Psicología",
    duracionTurnoDefault: 40, modoConfirmacionDefault: "aprobacion", ubicacion: null,
    color: "#B8482A", activo: true, createdAt: new Date().toISOString(),
    obrasSociales: [],
  },
];

let ventanasRecurrentes: VentanaRecurrente[] = [1, 2, 3].flatMap((profesionalId) =>
  [1, 2, 3, 4, 5].map((diaSemana) => ({
    id: profesionalId * 10 + diaSemana,
    profesionalId,
    diaSemana,
    horaInicio: "09:00",
    horaFin: "13:00",
    duracionTurno: null,
    modoConfirmacion: null,
    vigenciaDesde: new Date().toISOString().slice(0, 10),
    vigenciaHasta: null,
    activa: true,
    createdAt: new Date().toISOString(),
  })),
);

let ventanasExcepciones: VentanaExcepcion[] = [];

let pacientes: Paciente[] = [
  {
    id: 1, nombre: "Juan Gómez", documento: "30111222", tipoDocumento: "DNI",
    fechaNacimiento: "1985-03-14", email: "juan.gomez@example.com", telefono: "+54 9 11 5555-0001",
    obraSocialId: 1, obraSocialNombre: "OSDE", nroAfiliado: "12345678", notas: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2, nombre: "María Fernández", documento: "28999888", tipoDocumento: "DNI",
    fechaNacimiento: "1990-07-22", email: null, telefono: "+54 9 11 5555-0002",
    obraSocialId: null, obraSocialNombre: null, nroAfiliado: null, notas: "Prefiere turnos por la tarde.",
    createdAt: new Date().toISOString(),
  },
];

let usuarios: Usuario[] = [
  { id: "u1", name: "Admin Demo", email: "admin@demo.com", role: "admin", createdAt: new Date().toISOString() },
];

let landingFotos: LandingFoto[] = [];
let landingLinks: LandingLink[] = [];
let landingServicios: LandingServicio[] = [];
let landingContactos: LandingContacto[] = [];

let nextId = 100;

export const mockApi: ApiClient = {
  public: {
    profesionales: async (): Promise<PublicProfesional[]> =>
      profesionales
        .filter((p) => p.activo)
        .map((p) => ({ id: p.id, nombre: p.nombre, especialidad: p.especialidad, ubicacion: p.ubicacion, color: p.color })),
  },
  profesionales: {
    list: async () => profesionales,
    create: async (data) => {
      const { obraSocialIds, ...rest } = data;
      const nuevo: Profesional = {
        id: nextId++,
        authUserId: null,
        duracionTurnoDefault: null,
        modoConfirmacionDefault: null,
        ubicacion: null,
        color: null,
        createdAt: new Date().toISOString(),
        obrasSociales: obrasSocialesCat.filter((os) => obraSocialIds?.includes(os.id)),
        ...rest,
      };
      profesionales = [...profesionales, nuevo];
      return nuevo;
    },
    update: async (id, data) => {
      const { obraSocialIds, ...rest } = data;
      profesionales = profesionales.map((p) =>
        p.id === id
          ? {
              ...p,
              ...rest,
              obrasSociales:
                obraSocialIds !== undefined
                  ? obrasSocialesCat.filter((os) => obraSocialIds.includes(os.id))
                  : p.obrasSociales,
            }
          : p,
      );
      return profesionales.find((p) => p.id === id)!;
    },
    remove: async (id) => {
      profesionales = profesionales.map((p) => (p.id === id ? { ...p, activo: false } : p));
      return { ok: true };
    },
    ventanas: {
      list: async (profesionalId) => ({
        recurrentes: ventanasRecurrentes.filter((v) => v.profesionalId === profesionalId),
        excepciones: ventanasExcepciones.filter((v) => v.profesionalId === profesionalId),
      }),
      createRecurrente: async (_profesionalId, data) => {
        const nueva: VentanaRecurrente = {
          id: nextId++,
          vigenciaHasta: null,
          duracionTurno: null,
          modoConfirmacion: null,
          createdAt: new Date().toISOString(),
          vigenciaDesde: new Date().toISOString().slice(0, 10),
          ...data,
        };
        ventanasRecurrentes = [...ventanasRecurrentes, nueva];
        return nueva;
      },
      updateRecurrente: async (_profesionalId, ventanaId, data) => {
        ventanasRecurrentes = ventanasRecurrentes.map((v) => (v.id === ventanaId ? { ...v, ...data } : v));
        return ventanasRecurrentes.find((v) => v.id === ventanaId)!;
      },
      removeRecurrente: async (_profesionalId, ventanaId) => {
        ventanasRecurrentes = ventanasRecurrentes.filter((v) => v.id !== ventanaId);
        return { ok: true };
      },
      createExcepcion: async (_profesionalId, data) => {
        const nueva: VentanaExcepcion = {
          id: nextId++,
          horaInicio: null,
          horaFin: null,
          motivo: null,
          createdAt: new Date().toISOString(),
          ...data,
        };
        ventanasExcepciones = [...ventanasExcepciones, nueva];
        return nueva;
      },
      removeExcepcion: async (_profesionalId, excepcionId) => {
        ventanasExcepciones = ventanasExcepciones.filter((v) => v.id !== excepcionId);
        return { ok: true };
      },
    },
  },
  obrasSociales: {
    list: async () => obrasSocialesCat,
    create: async (data) => {
      const nueva: ObraSocial = { id: nextId++, ...data };
      obrasSocialesCat = [...obrasSocialesCat, nueva];
      return nueva;
    },
    update: async (id, data) => {
      obrasSocialesCat = obrasSocialesCat.map((os) => (os.id === id ? { ...os, ...data } : os));
      return obrasSocialesCat.find((os) => os.id === id)!;
    },
    remove: async (id) => {
      obrasSocialesCat = obrasSocialesCat.filter((os) => os.id !== id);
      return { ok: true };
    },
  },
  pacientes: {
    list: async (q) => {
      if (!q) return pacientes;
      const qLower = q.toLowerCase();
      return pacientes.filter(
        (p) => p.nombre.toLowerCase().includes(qLower) || p.documento?.toLowerCase().includes(qLower),
      );
    },
    create: async (data) => {
      const obraSocial = obrasSocialesCat.find((os) => os.id === data.obraSocialId);
      const nuevo: Paciente = {
        id: nextId++,
        documento: null,
        tipoDocumento: null,
        fechaNacimiento: null,
        email: null,
        telefono: null,
        obraSocialId: null,
        nroAfiliado: null,
        notas: null,
        createdAt: new Date().toISOString(),
        ...data,
        obraSocialNombre: obraSocial?.nombre ?? null,
      };
      pacientes = [...pacientes, nuevo];
      return nuevo;
    },
    update: async (id, data) => {
      const obraSocial =
        data.obraSocialId !== undefined ? obrasSocialesCat.find((os) => os.id === data.obraSocialId) : undefined;
      pacientes = pacientes.map((p) =>
        p.id === id
          ? { ...p, ...data, obraSocialNombre: obraSocial ? obraSocial.nombre : data.obraSocialId === null ? null : p.obraSocialNombre }
          : p,
      );
      return pacientes.find((p) => p.id === id)!;
    },
    remove: async (id) => {
      pacientes = pacientes.filter((p) => p.id !== id);
      return { ok: true };
    },
  },
  config: {
    get: async () => config,
    update: async (data) => {
      config = { ...config, ...data };
      return config;
    },
    uploadLogo: async () => ({ url: config.logoUrl ?? "", config }),
  },
  landingManager: {
    getConfig: async () => ({
      landingTagline: config.landingTagline,
      landingSubtitulo: config.landingSubtitulo,
      landingCtaTexto: config.landingCtaTexto,
      landingCtaUrl: config.landingCtaUrl,
    }),
    updateConfig: async (data) => {
      config = { ...config, ...data };
      return {
        landingTagline: config.landingTagline,
        landingSubtitulo: config.landingSubtitulo,
        landingCtaTexto: config.landingCtaTexto,
        landingCtaUrl: config.landingCtaUrl,
      };
    },
    listFotos: async () => landingFotos,
    uploadFoto: async (file, altTexto) => {
      const foto: LandingFoto = {
        id: nextId++,
        url: URL.createObjectURL(file),
        altTexto: altTexto ?? null,
        orden: landingFotos.length,
        createdAt: new Date().toISOString(),
      };
      landingFotos = [...landingFotos, foto];
      return foto;
    },
    removeFoto: async (id) => {
      landingFotos = landingFotos.filter((f) => f.id !== id);
      return { ok: true };
    },
    reorderFotos: async (ids) => {
      landingFotos = ids
        .map((id, i) => {
          const f = landingFotos.find((x) => x.id === id);
          return f ? { ...f, orden: i } : null;
        })
        .filter((f): f is LandingFoto => f !== null);
      return landingFotos;
    },
    listLinks: async () => landingLinks,
    createLink: async (data) => {
      const link: LandingLink = { id: nextId++, activa: true, orden: landingLinks.length, ...data };
      landingLinks = [...landingLinks, link];
      return link;
    },
    updateLink: async (id, data) => {
      landingLinks = landingLinks.map((l) => (l.id === id ? { ...l, ...data } : l));
      return landingLinks.find((l) => l.id === id)!;
    },
    removeLink: async (id) => {
      landingLinks = landingLinks.filter((l) => l.id !== id);
      return { ok: true };
    },
    reorderLinks: async (ids) => {
      landingLinks = ids
        .map((id, i) => {
          const l = landingLinks.find((x) => x.id === id);
          return l ? { ...l, orden: i } : null;
        })
        .filter((l): l is LandingLink => l !== null);
      return landingLinks;
    },
  },
  usuarios: {
    list: async () => usuarios,
    setRole: async (id, role) => {
      usuarios = usuarios.map((u) => (u.id === id ? { ...u, role: role as Usuario["role"] } : u));
      return usuarios.find((u) => u.id === id)!;
    },
    remove: async (id) => {
      usuarios = usuarios.filter((u) => u.id !== id);
      return { ok: true };
    },
  },
  landingServicios: {
    list: async () => landingServicios,
    create: async (data) => {
      const s: LandingServicio = {
        id: nextId++,
        descripcion: null,
        imagenUrl: null,
        createdAt: new Date().toISOString(),
        ...data,
      };
      landingServicios = [...landingServicios, s];
      return s;
    },
    update: async (id, data) => {
      landingServicios = landingServicios.map((s) => (s.id === id ? { ...s, ...data } : s));
      return landingServicios.find((s) => s.id === id)!;
    },
    remove: async (id) => {
      landingServicios = landingServicios.filter((s) => s.id !== id);
      return { ok: true };
    },
    uploadImagen: async (file) => URL.createObjectURL(file),
  },
  landingContactos: {
    list: async () => landingContactos,
    create: async (data) => {
      const c: LandingContacto = {
        id: nextId++,
        iconoUrl: null,
        createdAt: new Date().toISOString(),
        ...data,
      };
      landingContactos = [...landingContactos, c];
      return c;
    },
    update: async (id, data) => {
      landingContactos = landingContactos.map((c) => (c.id === id ? { ...c, ...data } : c));
      return landingContactos.find((c) => c.id === id)!;
    },
    remove: async (id) => {
      landingContactos = landingContactos.filter((c) => c.id !== id);
      return { ok: true };
    },
    uploadIcono: async (file) => URL.createObjectURL(file),
  },
  auditLog: {
    list: async (): Promise<AuditLogPage> => ({ items: [], total: 0, page: 1, pageSize: 50 }),
    verify: async (): Promise<AuditVerifyResult> => ({
      ok: true,
      rotoEnId: null,
      totalFilas: 0,
      filasVerificadas: 0,
      legacySinHash: 0,
    }),
  },
};
