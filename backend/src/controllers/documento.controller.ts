import { Response } from "express";
import prisma from "../config/db.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { EstadoDocumento, Prisma } from "@prisma/client";
import { diffLines, Change } from "diff";

// 1. Listar documentos con filtros y búsqueda
export async function listarDocumentos(req: AuthRequest, res: Response): Promise<void> {
  try {
    const busqueda = req.query.busqueda ? String(req.query.busqueda) : undefined;
    const categoriaId = req.query.categoriaId ? String(req.query.categoriaId) : undefined;
    const estado = req.query.estado ? String(req.query.estado) : undefined;

    const whereClause: Prisma.DocumentoWhereInput = {};

    if (estado && Object.values(EstadoDocumento).includes(estado as EstadoDocumento)) {
      whereClause.estado = estado as EstadoDocumento;
    }

    if (categoriaId) {
      whereClause.categoriaId = categoriaId;
    }

    if (busqueda) {
      whereClause.OR = [
        { titulo: { contains: busqueda, mode: "insensitive" } },
        { contenidoActual: { contains: busqueda, mode: "insensitive" } },
      ];
    }

    const documentos = await prisma.documento.findMany({
      where: whereClause,
      orderBy: { actualizadoEn: "desc" },
      include: {
        autor: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
        categoria: {
          select: { id: true, nombre: true },
        },
        etiquetas: {
          include: {
            etiqueta: true,
          },
        },
        _count: {
          select: { versiones: true },
        },
      },
    });

    res.json({
      total: documentos.length,
      documentos: documentos.map((doc) => ({
        id: doc.id,
        titulo: doc.titulo,
        contenidoActual: doc.contenidoActual,
        estado: doc.estado,
        categoria: doc.categoria,
        autor: doc.autor,
        etiquetas: doc.etiquetas.map((e) => e.etiqueta.nombre),
        totalVersiones: doc._count.versiones,
        creadoEn: doc.creadoEn,
        actualizadoEn: doc.actualizadoEn,
      })),
    });
  } catch (error: any) {
    console.error("Error al listar documentos:", error);
    res.status(500).json({ message: "Error al obtener documentos", error: error.message });
  }
}

// 2. Obtener un documento específico por ID
export async function obtenerDocumentoPorId(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const documento = await prisma.documento.findUnique({
      where: { id },
      include: {
        autor: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
        categoria: true,
        etiquetas: {
          include: { etiqueta: true },
        },
        versiones: {
          orderBy: { numeroVersion: "desc" },
          select: {
            id: true,
            numeroVersion: true,
            mensajeCambio: true,
            creadoEn: true,
            autor: {
              select: { id: true, nombre: true, email: true },
            },
          },
        },
        documentosRelacionados: {
          include: {
            destino: {
              select: { id: true, titulo: true, estado: true },
            },
          },
        },
      },
    });

    if (!documento) {
      res.status(404).json({ message: "Documento no encontrado" });
      return;
    }

    res.json({
      documento: {
        ...documento,
        etiquetas: documento.etiquetas.map((e) => e.etiqueta.nombre),
        relaciones: documento.documentosRelacionados.map((r) => r.destino),
      },
    });
  } catch (error: any) {
    console.error("Error al obtener documento:", error);
    res.status(500).json({ message: "Error al obtener documento", error: error.message });
  }
}

// 3. Crear documento y su versión 1 inicial
export async function crearDocumento(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { titulo, contenido, categoriaId, estado, etiquetas, documentosRelacionadosIds } = req.body;
    const autorId = req.user!.id;

    if (!titulo || !contenido) {
      res.status(400).json({ message: "El título y el contenido son obligatorios" });
      return;
    }

    const resultado = await prisma.$transaction(async (tx) => {
      // Crear el documento
      const nuevoDoc = await tx.documento.create({
        data: {
          titulo: String(titulo).trim(),
          contenidoActual: contenido,
          estado: (estado as EstadoDocumento) || EstadoDocumento.BORRADOR,
          categoriaId: categoriaId ? String(categoriaId) : null,
          autorId,
        },
      });

      // Crear automáticamente la Versión 1 en el historial
      await tx.version.create({
        data: {
          documentoId: nuevoDoc.id,
          numeroVersion: 1,
          contenido: contenido,
          mensajeCambio: "Creación inicial del documento",
          autorId,
        },
      });

      // Asociar etiquetas si se proporcionaron
      if (Array.isArray(etiquetas) && etiquetas.length > 0) {
        for (const nombreEtiqueta of etiquetas) {
          const etiqueta = await tx.etiqueta.upsert({
            where: { nombre: String(nombreEtiqueta).trim().toLowerCase() },
            create: { nombre: String(nombreEtiqueta).trim().toLowerCase() },
            update: {},
          });

          await tx.documentoEtiqueta.create({
            data: {
              documentoId: nuevoDoc.id,
              etiquetaId: etiqueta.id,
            },
          });
        }
      }

      // Asociar notas/documentos relacionados
      if (Array.isArray(documentosRelacionadosIds) && documentosRelacionadosIds.length > 0) {
        for (const destinoId of documentosRelacionadosIds) {
          await tx.documentoRelacion.create({
            data: {
              origenId: nuevoDoc.id,
              destinoId: String(destinoId),
            },
          });
        }
      }

      return nuevoDoc;
    });

    res.status(201).json({
      message: "Documento creado con versión 1 registrada",
      documento: resultado,
    });
  } catch (error: any) {
    console.error("Error al crear documento:", error);
    res.status(500).json({ message: "Error al crear documento", error: error.message });
  }
}

// 4. Actualizar documento y generar nueva versión en historial
export async function actualizarDocumento(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const { titulo, contenido, categoriaId, estado, mensajeCambio } = req.body;
    const autorId = req.user!.id;

    const docExistente = await prisma.documento.findUnique({
      where: { id },
      include: {
        versiones: {
          orderBy: { numeroVersion: "desc" },
          take: 1,
        },
      },
    });

    if (!docExistente) {
      res.status(404).json({ message: "Documento no encontrado" });
      return;
    }

    const ultimaVersion = docExistente.versiones[0]?.numeroVersion || 1;
    const nuevoNumeroVersion = ultimaVersion + 1;
    const nuevoContenido = contenido !== undefined ? contenido : docExistente.contenidoActual;

    const resultado = await prisma.$transaction(async (tx) => {
      // Actualizar el documento principal
      const docActualizado = await tx.documento.update({
        where: { id },
        data: {
          titulo: titulo !== undefined ? String(titulo).trim() : docExistente.titulo,
          contenidoActual: nuevoContenido,
          categoriaId: categoriaId !== undefined ? (categoriaId ? String(categoriaId) : null) : docExistente.categoriaId,
          estado: estado || docExistente.estado,
        },
      });

      // Crear nueva versión en el historial
      const nuevaVersion = await tx.version.create({
        data: {
          documentoId: id,
          numeroVersion: nuevoNumeroVersion,
          contenido: nuevoContenido,
          mensajeCambio: mensajeCambio ? String(mensajeCambio).trim() : `Actualización a versión ${nuevoNumeroVersion}`,
          autorId,
        },
      });

      return { docActualizado, nuevaVersion };
    });

    res.json({
      message: `Documento actualizado exitosamente. Se generó la versión ${nuevoNumeroVersion}`,
      documento: resultado.docActualizado,
      version: resultado.nuevaVersion,
    });
  } catch (error: any) {
    console.error("Error al actualizar documento:", error);
    res.status(500).json({ message: "Error al actualizar documento", error: error.message });
  }
}

// 5. Eliminar documento
export async function eliminarDocumento(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const doc = await prisma.documento.findUnique({ where: { id } });
    if (!doc) {
      res.status(404).json({ message: "Documento no encontrado" });
      return;
    }

    // Solo el autor o un ADMIN puede borrar
    if (doc.autorId !== req.user!.id && req.user!.rol !== "ADMIN") {
      res.status(403).json({ message: "No tienes permisos para eliminar este documento" });
      return;
    }

    await prisma.documento.delete({ where: { id } });
    res.json({ message: "Documento eliminado correctamente" });
  } catch (error: any) {
    console.error("Error al eliminar documento:", error);
    res.status(500).json({ message: "Error al eliminar documento", error: error.message });
  }
}

// 6. Listar historial de versiones de un documento
export async function obtenerHistorialVersiones(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const versiones = await prisma.version.findMany({
      where: { documentoId: id },
      orderBy: { numeroVersion: "desc" },
      include: {
        autor: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
      },
    });

    res.json({ versiones });
  } catch (error: any) {
    console.error("Error al obtener versiones:", error);
    res.status(500).json({ message: "Error al obtener versiones", error: error.message });
  }
}

// 7. Comparar diferencias (diff) entre dos versiones o contra la actual
export async function compararVersiones(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const v1 = req.query.v1 ? String(req.query.v1) : undefined;
    const v2 = req.query.v2 ? String(req.query.v2) : undefined;

    if (!v1 || !v2) {
      res.status(400).json({ message: "Debes especificar v1 y v2 (números de versión) para comparar" });
      return;
    }

    const version1 = await prisma.version.findUnique({
      where: {
        documentoId_numeroVersion: {
          documentoId: id,
          numeroVersion: parseInt(v1, 10),
        },
      },
    });

    const version2 = await prisma.version.findUnique({
      where: {
        documentoId_numeroVersion: {
          documentoId: id,
          numeroVersion: parseInt(v2, 10),
        },
      },
    });

    if (!version1 || !version2) {
      res.status(404).json({ message: "Una o ambas versiones no existen para este documento" });
      return;
    }

    // Cálculo del diff línea por línea tipo Git
    const diferencias: Change[] = diffLines(version1.contenido, version2.contenido);

    res.json({
      documentoId: id,
      versionOriginal: version1.numeroVersion,
      versionComparada: version2.numeroVersion,
      diferencias: diferencias.map((part) => ({
        valor: part.value,
        agregado: !!part.added,
        eliminado: !!part.removed,
        lineas: part.count,
      })),
    });
  } catch (error: any) {
    console.error("Error al comparar versiones:", error);
    res.status(500).json({ message: "Error al comparar versiones", error: error.message });
  }
}

// 8. Restaurar documento a una versión anterior
export async function restaurarVersion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const versionId = String(req.params.versionId);
    const autorId = req.user!.id;

    const versionObjetivo = await prisma.version.findUnique({
      where: { id: versionId },
    });

    if (!versionObjetivo || versionObjetivo.documentoId !== id) {
      res.status(404).json({ message: "La versión especificada no existe para este documento" });
      return;
    }

    const doc = await prisma.documento.findUnique({
      where: { id },
      include: {
        versiones: {
          orderBy: { numeroVersion: "desc" },
          take: 1,
        },
      },
    });

    if (!doc) {
      res.status(404).json({ message: "Documento no encontrado" });
      return;
    }

    const ultimaVersion = doc.versiones[0]?.numeroVersion || 1;
    const nuevoNumeroVersion = ultimaVersion + 1;

    const resultado = await prisma.$transaction(async (tx) => {
      // Actualiza contenido del documento con el contenido histórico
      const docActualizado = await tx.documento.update({
        where: { id },
        data: {
          contenidoActual: versionObjetivo.contenido,
        },
      });

      // Registra una nueva versión de respaldo informando la restauración
      const nuevaVersion = await tx.version.create({
        data: {
          documentoId: id,
          numeroVersion: nuevoNumeroVersion,
          contenido: versionObjetivo.contenido,
          mensajeCambio: `Restauración a la versión ${versionObjetivo.numeroVersion}`,
          autorId,
        },
      });

      return { docActualizado, nuevaVersion };
    });

    res.json({
      message: `Documento restaurado con éxito a la versión ${versionObjetivo.numeroVersion}. Se creó la versión ${nuevoNumeroVersion}`,
      documento: resultado.docActualizado,
      version: resultado.nuevaVersion,
    });
  } catch (error: any) {
    console.error("Error al restaurar versión:", error);
    res.status(500).json({ message: "Error al restaurar versión", error: error.message });
  }
}
