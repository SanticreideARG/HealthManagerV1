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

const profesionales: PublicProfesional[] = [
  { id: 1, nombre: "Dra. Ana López", especialidad: "Clínica médica", ubicacion: "Sede Centro", color: "#0E5A6B" },
  { id: 2, nombre: "Dr. Martín Pérez", especialidad: "Cardiología", ubicacion: "Sede Centro", color: "#2E8C79" },
  { id: 3, nombre: "Lic. Sofía Ruiz", especialidad: "Psicología", ubicacion: null, color: "#B8482A" },
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
    profesionales: async () => profesionales,
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
