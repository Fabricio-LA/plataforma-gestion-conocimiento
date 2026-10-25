// Servicio base para realizar peticiones HTTP hacia el Backend API
import {
  Usuario,
  Documento,
  VersionDocumento,
  PropuestaCambio,
  Categoria,
  Etiqueta,
} from "../types/index.js";

const API_BASE_URL = import.meta.env?.VITE_API_URL || "http://localhost:4000/api";

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Error HTTP ${response.status}`);
  }

  return response.json();
}

// 1. Servicios de Autenticación
export const authService = {
  login: (data: { email: string; password: string }) =>
    apiRequest<{ message: string; usuario: Usuario; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  register: (data: { nombre: string; email: string; password: string; rol?: string }) =>
    apiRequest<{ message: string; usuario: Usuario; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMe: () => apiRequest<{ usuario: Usuario }>("/auth/me"),
};

// 2. Servicios de Documentos
export const documentService = {
  listar: (filtros?: { busqueda?: string; categoriaId?: string; estado?: string }) => {
    const params = new URLSearchParams();
    if (filtros?.busqueda) params.append("busqueda", filtros.busqueda);
    if (filtros?.categoriaId) params.append("categoriaId", filtros.categoriaId);
    if (filtros?.estado) params.append("estado", filtros.estado);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<{ total: number; documentos: Documento[] }>(`/documentos${query}`);
  },

  obtenerPorId: (id: string) =>
    apiRequest<{ documento: Documento }>(`/documentos/${id}`),

  crear: (data: {
    titulo: string;
    contenido: string;
    categoriaId?: string;
    estado?: string;
    etiquetas?: string[];
    documentosRelacionadosIds?: string[];
  }) =>
    apiRequest<{ message: string; documento: Documento }>("/documentos", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  actualizar: (id: string, data: { titulo?: string; contenido?: string; mensajeCambio?: string; estado?: string }) =>
    apiRequest<{ message: string; documento: Documento; version: VersionDocumento }>(`/documentos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  eliminar: (id: string) =>
    apiRequest<{ message: string }>(`/documentos/${id}`, { method: "DELETE" }),

  obtenerVersiones: (id: string) =>
    apiRequest<{ versiones: VersionDocumento[] }>(`/documentos/${id}/versiones`),

  compararDiff: (id: string, v1: number, v2: number) =>
    apiRequest<{
      documentoId: string;
      versionOriginal: number;
      versionComparada: number;
      diferencias: Array<{ valor: string; agregado: boolean; eliminado: boolean; lineas: number }>;
    }>(`/documentos/${id}/diff?v1=${v1}&v2=${v2}`),

  restaurarVersion: (id: string, versionId: string) =>
    apiRequest<{ message: string; documento: Documento; version: VersionDocumento }>(
      `/documentos/${id}/restaurar/${versionId}`,
      { method: "POST" }
    ),
};

// 3. Servicios de Propuestas de Cambio (BPMN)
export const proposalService = {
  listar: (filtros?: { estado?: string; documentoId?: string }) => {
    const params = new URLSearchParams();
    if (filtros?.estado) params.append("estado", filtros.estado);
    if (filtros?.documentoId) params.append("documentoId", filtros.documentoId);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<{ total: number; propuestas: PropuestaCambio[] }>(`/propuestas${query}`);
  },

  crear: (data: { documentoId: string; contenidoPropuesto: string; mensaje: string }) =>
    apiRequest<{ message: string; propuesta: PropuestaCambio }>("/propuestas", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  aprobar: (id: string, comentarioRevision?: string) =>
    apiRequest<{ message: string; propuesta: PropuestaCambio; documento: Documento }>(
      `/propuestas/${id}/aprobar`,
      {
        method: "PUT",
        body: JSON.stringify({ comentarioRevision }),
      }
    ),

  rechazar: (id: string, comentarioRevision?: string) =>
    apiRequest<{ message: string; propuesta: PropuestaCambio }>(`/propuestas/${id}/rechazar`, {
      method: "PUT",
      body: JSON.stringify({ comentarioRevision }),
    }),
};

// 4. Servicios de Categorías y Etiquetas
export const categoryService = {
  listarCategorias: () =>
    apiRequest<{ categorias: Array<Categoria & { _count: { documentos: number } }> }>("/categorias"),

  crearCategoria: (data: { nombre: string; descripcion?: string }) =>
    apiRequest<{ message: string; categoria: Categoria }>("/categorias", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listarEtiquetas: () => apiRequest<{ etiquetas: Etiqueta[] }>("/categorias/etiquetas"),

  crearEtiqueta: (nombre: string) =>
    apiRequest<{ message: string; etiqueta: Etiqueta }>("/categorias/etiquetas", {
      method: "POST",
      body: JSON.stringify({ nombre }),
    }),
};
