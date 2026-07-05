import type {
  ConfigClinicaUpdate,
  LandingConfigUpdate,
  LandingLinkCreate,
  LandingLinkUpdate,
  LandingServicioCreate,
  LandingServicioUpdate,
  LandingContactoCreate,
  LandingContactoUpdate,
  ProfesionalCreate,
  ProfesionalUpdate,
  VentanaRecurrenteCreate,
  VentanaRecurrenteUpdate,
  VentanaExcepcionCreate,
  ObraSocialCreate,
  ObraSocialUpdate,
  PacienteCreate,
  PacienteUpdate,
  TurnoCreate,
  BloqueoCreate,
} from "@turnos/shared";
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
  VentanasProfesional,
  VentanaRecurrente,
  VentanaExcepcion,
  Paciente,
  Turno,
  Disponibilidad,
  DisponibilidadSlot,
  EstadoTurno,
} from "./types.js";
import { ApiError } from "./types.js";
import { mockApi } from "./mockApi.js";

// Re-export para no romper imports existentes (`from "../lib/api.js"`).
export { ApiError };
export type {
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
  VentanasProfesional,
  VentanaRecurrente,
  VentanaExcepcion,
  Paciente,
  Turno,
  Disponibilidad,
  DisponibilidadSlot,
  EstadoTurno,
};

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const USE_MOCK = import.meta.env.VITE_MOCK === "1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? res.statusText, body.error);
  }
  return res.json() as Promise<T>;
}

async function upload<T>(path: string, file: File, method = "POST"): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}${path}`, {
    method,
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? res.statusText, body.error);
  }
  return res.json() as Promise<T>;
}

const realApi: ApiClient = {
  public: {
    profesionales: () => request<PublicProfesional[]>("/public/profesionales"),
  },
  profesionales: {
    list: () => request<Profesional[]>("/profesionales"),
    create: (data: ProfesionalCreate) =>
      request<Profesional>("/profesionales", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: ProfesionalUpdate) =>
      request<Profesional>(`/profesionales/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) =>
      request<{ ok: true }>(`/profesionales/${id}`, { method: "DELETE" }),
    ventanas: {
      list: (profesionalId: number) =>
        request<VentanasProfesional>(`/profesionales/${profesionalId}/ventanas`),
      createRecurrente: (profesionalId: number, data: VentanaRecurrenteCreate) =>
        request<VentanaRecurrente>(`/profesionales/${profesionalId}/ventanas`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
      updateRecurrente: (profesionalId: number, ventanaId: number, data: VentanaRecurrenteUpdate) =>
        request<VentanaRecurrente>(`/profesionales/${profesionalId}/ventanas/${ventanaId}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
      removeRecurrente: (profesionalId: number, ventanaId: number) =>
        request<{ ok: true }>(`/profesionales/${profesionalId}/ventanas/${ventanaId}`, { method: "DELETE" }),
      createExcepcion: (profesionalId: number, data: VentanaExcepcionCreate) =>
        request<VentanaExcepcion>(`/profesionales/${profesionalId}/excepciones`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
      removeExcepcion: (profesionalId: number, excepcionId: number) =>
        request<{ ok: true }>(`/profesionales/${profesionalId}/excepciones/${excepcionId}`, { method: "DELETE" }),
    },
  },
  obrasSociales: {
    list: () => request<ObraSocial[]>("/obras-sociales"),
    create: (data: ObraSocialCreate) =>
      request<ObraSocial>("/obras-sociales", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: ObraSocialUpdate) =>
      request<ObraSocial>(`/obras-sociales/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) =>
      request<{ ok: true }>(`/obras-sociales/${id}`, { method: "DELETE" }),
  },
  pacientes: {
    list: (q?: string) => request<Paciente[]>(`/pacientes${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    create: (data: PacienteCreate) =>
      request<Paciente>("/pacientes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: PacienteUpdate) =>
      request<Paciente>(`/pacientes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) =>
      request<{ ok: true }>(`/pacientes/${id}`, { method: "DELETE" }),
  },
  turnos: {
    list: (profesionalId: number, desde?: string, hasta?: string) => {
      const qs = new URLSearchParams({ profesionalId: String(profesionalId) });
      if (desde) qs.set("desde", desde);
      if (hasta) qs.set("hasta", hasta);
      return request<Turno[]>(`/turnos?${qs.toString()}`);
    },
    disponibilidad: (profesionalId: number, fecha: string) =>
      request<Disponibilidad>(`/turnos/disponibilidad?profesionalId=${profesionalId}&fecha=${fecha}`),
    create: (data: TurnoCreate) =>
      request<Turno>("/turnos", { method: "POST", body: JSON.stringify(data) }),
    createBloqueo: (data: BloqueoCreate) =>
      request<Turno>("/turnos/bloqueos", { method: "POST", body: JSON.stringify(data) }),
    confirmar: (id: number) => request<Turno>(`/turnos/${id}/confirmar`, { method: "POST" }),
    arribo: (id: number) => request<Turno>(`/turnos/${id}/arribo`, { method: "POST" }),
    atendido: (id: number) => request<Turno>(`/turnos/${id}/atendido`, { method: "POST" }),
    ausente: (id: number) => request<Turno>(`/turnos/${id}/ausente`, { method: "POST" }),
    cancelar: (id: number) => request<Turno>(`/turnos/${id}/cancelar`, { method: "POST" }),
  },
  config: {
    get: () => request<Config | null>("/config"),
    update: (data: ConfigClinicaUpdate) =>
      request<Config>("/config", { method: "PUT", body: JSON.stringify(data) }),
    uploadLogo: (file: File) =>
      upload<{ url: string; config: Config }>("/config/logo", file, "PUT"),
  },
  landingManager: {
    getConfig: () => request<LandingConfig | null>("/landing-manager/config"),
    updateConfig: (data: LandingConfigUpdate) =>
      request<LandingConfig>("/landing-manager/config", { method: "PUT", body: JSON.stringify(data) }),
    listFotos: () => request<LandingFoto[]>("/landing-manager/fotos"),
    uploadFoto: (file: File, altTexto?: string) => {
      const form = new FormData();
      form.append("file", file);
      if (altTexto) form.append("altTexto", altTexto);
      return fetch(`${BASE}/landing-manager/fotos`, { method: "POST", body: form, credentials: "include" })
        .then(async (r) => { if (!r.ok) { const b = await r.json().catch(() => ({})); throw new ApiError(r.status, b.message ?? r.statusText, b.error); } return r.json() as Promise<LandingFoto>; });
    },
    removeFoto: (id: number) =>
      request<{ ok: true }>(`/landing-manager/fotos/${id}`, { method: "DELETE" }),
    reorderFotos: (ids: number[]) =>
      request<LandingFoto[]>("/landing-manager/fotos/orden", { method: "PATCH", body: JSON.stringify({ ids }) }),
    listLinks: () => request<LandingLink[]>("/landing-manager/links"),
    createLink: (data: LandingLinkCreate) =>
      request<LandingLink>("/landing-manager/links", { method: "POST", body: JSON.stringify(data) }),
    updateLink: (id: number, data: LandingLinkUpdate) =>
      request<LandingLink>(`/landing-manager/links/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    removeLink: (id: number) =>
      request<{ ok: true }>(`/landing-manager/links/${id}`, { method: "DELETE" }),
    reorderLinks: (ids: number[]) =>
      request<LandingLink[]>("/landing-manager/links/orden", { method: "PATCH", body: JSON.stringify({ ids }) }),
  },
  usuarios: {
    list: () => request<Usuario[]>("/usuarios"),
    setRole: (id: string, role: string) =>
      request<Usuario>(`/usuarios/${id}`, { method: "PATCH", body: JSON.stringify({ role }) }),
    remove: (id: string) =>
      request<{ ok: true }>(`/usuarios/${id}`, { method: "DELETE" }),
  },
  landingServicios: {
    list: () => request<LandingServicio[]>("/landing-servicios"),
    create: (data: LandingServicioCreate) =>
      request<LandingServicio>("/landing-servicios", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: LandingServicioUpdate) =>
      request<LandingServicio>(`/landing-servicios/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) =>
      request<{ ok: true }>(`/landing-servicios/${id}`, { method: "DELETE" }),
    uploadImagen: (file: File) =>
      upload<{ url: string }>("/landing-manager/upload-imagen", file).then((r) => r.url),
  },
  landingContactos: {
    list: () => request<LandingContacto[]>("/landing-contactos"),
    create: (data: LandingContactoCreate) =>
      request<LandingContacto>("/landing-contactos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: LandingContactoUpdate) =>
      request<LandingContacto>(`/landing-contactos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) =>
      request<{ ok: true }>(`/landing-contactos/${id}`, { method: "DELETE" }),
    uploadIcono: (file: File) =>
      upload<{ url: string }>("/landing-manager/upload-imagen", file).then((r) => r.url),
  },
  auditLog: {
    list: (params: { userId?: string; entidad?: string; accion?: string; desde?: string; hasta?: string; q?: string; page?: number } = {}) => {
      const qs = new URLSearchParams();
      if (params.userId)  qs.set("userId",  params.userId);
      if (params.entidad) qs.set("entidad", params.entidad);
      if (params.accion)  qs.set("accion",  params.accion);
      if (params.desde)   qs.set("desde",   params.desde);
      if (params.hasta)   qs.set("hasta",   params.hasta);
      if (params.q)       qs.set("q",       params.q);
      if (params.page)    qs.set("page",    String(params.page));
      return request<AuditLogPage>(`/audit-log?${qs.toString()}`);
    },
    verify: () => request<AuditVerifyResult>("/audit-log/verify"),
  },
};

export const api: ApiClient = USE_MOCK ? mockApi : realApi;
export const usandoMock = USE_MOCK;
