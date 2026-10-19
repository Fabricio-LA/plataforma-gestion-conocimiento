// Definiciones de tipos para el Frontend (alineados al backend y base de datos)

export type Rol = 'ADMIN' | 'REVISOR' | 'ANALISTA';

export type EstadoDocumento = 'BORRADOR' | 'EN_REVISION' | 'PUBLICADO' | 'OBSOLETO';

export type EstadoPropuesta = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface Etiqueta {
  id: string;
  nombre: string;
}

export interface VersionDocumento {
  id: string;
  documentoId: string;
  numeroVersion: number;
  contenido: string;
  mensajeCambio: string;
  autorId: string;
  autor?: Usuario;
  creadoEn: string;
}

export interface Documento {
  id: string;
  titulo: string;
  contenidoActual: string;
  estado: EstadoDocumento;
  categoriaId?: string;
  categoria?: Categoria;
  autorId: string;
  autor?: Usuario;
  etiquetas?: Etiqueta[];
  versiones?: VersionDocumento[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface PropuestaCambio {
  id: string;
  documentoId: string;
  autorId: string;
  autor?: Usuario;
  revisorId?: string;
  revisor?: Usuario;
  contenidoPropuesto: string;
  mensaje: string;
  estado: EstadoPropuesta;
  comentarioRevision?: string;
  creadoEn: string;
  revisadoEn?: string;
}
