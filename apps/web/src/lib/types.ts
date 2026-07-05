export interface PublicProfesional {
  id: number;
  nombre: string;
  especialidad: string;
  ubicacion: string | null;
  color: string | null;
}

export interface Config {
  id: number;
  nombre: string;
  razonSocial: string | null;
  cuit: string | null;
  direccion: string | null;
  cp: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  telefono: string | null;
  email: string | null;
  logoUrl: string | null;
  duracionDefault: number;
  modoConfirmacionDefault: "automatico" | "aprobacion";
  landingTagline: string | null;
  landingSubtitulo: string | null;
  landingCtaTexto: string | null;
  landingCtaUrl: string | null;
}

export interface LandingConfig {
  landingTagline: string | null;
  landingSubtitulo: string | null;
  landingCtaTexto: string | null;
  landingCtaUrl: string | null;
}

export interface LandingFoto {
  id: number;
  url: string;
  altTexto: string | null;
  orden: number;
  createdAt: string;
}

export interface LandingLink {
  id: number;
  label: string;
  url: string;
  orden: number;
  activa: boolean;
}

export interface LandingServicio {
  id: number;
  titulo: string;
  descripcion: string | null;
  imagenUrl: string | null;
  orden: number;
  activo: boolean;
  createdAt: string;
}

export interface LandingContacto {
  id: number;
  label: string;
  url: string;
  iconoUrl: string | null;
  orden: number;
  activo: boolean;
  createdAt: string;
}

export interface Usuario {
  id: string;
  name: string;
  email: string;
  role: "admin" | "profesional" | "administrativo" | "paciente";
  createdAt: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
  get esOverbooking() {
    return this.code === "overbooking";
  }
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  accion: "crear" | "editar" | "eliminar";
  entidad: string;
  entidadId: string | null;
  entidadLabel: string | null;
  diff: string | null;
  ip: string | null;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditVerifyResult {
  ok: boolean;
  rotoEnId: number | null;
  totalFilas: number;
  filasVerificadas: number;
  legacySinHash: number;
}

/** Forma común que cumplen tanto la API real como el mock. */
export interface ApiClient {
  public: {
    profesionales: () => Promise<PublicProfesional[]>;
  };
  config: {
    get: () => Promise<Config | null>;
    update: (data: import("@turnos/shared").ConfigClinicaUpdate) => Promise<Config>;
    uploadLogo: (file: File) => Promise<{ url: string; config: Config }>;
  };
  landingManager: {
    getConfig: () => Promise<LandingConfig | null>;
    updateConfig: (data: import("@turnos/shared").LandingConfigUpdate) => Promise<LandingConfig>;
    listFotos: () => Promise<LandingFoto[]>;
    uploadFoto: (file: File, altTexto?: string) => Promise<LandingFoto>;
    removeFoto: (id: number) => Promise<{ ok: true }>;
    reorderFotos: (ids: number[]) => Promise<LandingFoto[]>;
    listLinks: () => Promise<LandingLink[]>;
    createLink: (data: import("@turnos/shared").LandingLinkCreate) => Promise<LandingLink>;
    updateLink: (id: number, data: import("@turnos/shared").LandingLinkUpdate) => Promise<LandingLink>;
    removeLink: (id: number) => Promise<{ ok: true }>;
    reorderLinks: (ids: number[]) => Promise<LandingLink[]>;
  };
  usuarios: {
    list: () => Promise<Usuario[]>;
    setRole: (id: string, role: string) => Promise<Usuario>;
    remove: (id: string) => Promise<{ ok: true }>;
  };
  landingServicios: {
    list: () => Promise<LandingServicio[]>;
    create: (data: import("@turnos/shared").LandingServicioCreate) => Promise<LandingServicio>;
    update: (id: number, data: import("@turnos/shared").LandingServicioUpdate) => Promise<LandingServicio>;
    remove: (id: number) => Promise<{ ok: true }>;
    uploadImagen: (file: File) => Promise<string>;
  };
  landingContactos: {
    list: () => Promise<LandingContacto[]>;
    create: (data: import("@turnos/shared").LandingContactoCreate) => Promise<LandingContacto>;
    update: (id: number, data: import("@turnos/shared").LandingContactoUpdate) => Promise<LandingContacto>;
    remove: (id: number) => Promise<{ ok: true }>;
    uploadIcono: (file: File) => Promise<string>;
  };
  auditLog: {
    list: (params?: {
      userId?: string;
      entidad?: string;
      accion?: string;
      desde?: string;
      hasta?: string;
      q?: string;
      page?: number;
    }) => Promise<AuditLogPage>;
    verify: () => Promise<AuditVerifyResult>;
  };
}
