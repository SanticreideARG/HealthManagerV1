import type {
  ConfigClinicaUpdate,
  LandingConfigUpdate,
  LandingLinkCreate,
  LandingLinkUpdate,
  LandingServicioCreate,
  LandingServicioUpdate,
  LandingContactoCreate,
  LandingContactoUpdate,
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
