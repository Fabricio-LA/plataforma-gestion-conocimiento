import { Response } from "express";
import prisma from "../config/db.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { EstadoPropuesta, Prisma } from "@prisma/client";

// 1. Crear propuesta de cambio (Analista / Usuario)
export async function crearPropuesta(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { documentoId, contenidoPropuesto, mensaje, versionBase } = req.body;
    const autorId = req.user!.id;

    if (!documentoId || !contenidoPropuesto || !mensaje) {
      res.status(400).json({
        message: "documentoId, contenidoPropuesto y mensaje explicativo son obligatorios",
      });
      return;
    }

    const documento = await prisma.documento.findUnique({
      where: { id: String(documentoId) },
      include: {
        versiones: {
          orderBy: { numeroVersion: "desc" },
          take: 1,
        },
      },
    });

    if (!documento) {
      res.status(404).json({ message: "El documento a modificar no existe" });
      return;
    }

    // Si no se envía versionBase explícita, se enlaza a la versión vigente actual
    const versionBaseFinal = versionBase !== undefined
      ? Number(versionBase)
      : (documento.versiones[0]?.numeroVersion || 1);

    const propuesta = await prisma.propuestaCambio.create({
      data: {
        documentoId: String(documentoId),
        autorId,
        contenidoPropuesto,
        mensaje: String(mensaje).trim(),
        versionBase: versionBaseFinal,
        estado: EstadoPropuesta.PENDIENTE,
      },
      include: {
        autor: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
        documento: {
          select: { id: true, titulo: true },
        },
      },
    });

    res.status(201).json({
      message: "Propuesta de cambio enviada exitosamente para revisión",
      propuesta,
    });
  } catch (error: any) {
    console.error("Error al crear propuesta:", error);
    res.status(500).json({ message: "Error al enviar propuesta", error: error.message });
  }
}

// 2. Listar propuestas (con filtros de estado y documento)
export async function listarPropuestas(req: AuthRequest, res: Response): Promise<void> {
  try {
    const estado = req.query.estado ? String(req.query.estado) : undefined;
    const documentoId = req.query.documentoId ? String(req.query.documentoId) : undefined;

    const whereClause: Prisma.PropuestaCambioWhereInput = {};

    if (estado && Object.values(EstadoPropuesta).includes(estado as EstadoPropuesta)) {
      whereClause.estado = estado as EstadoPropuesta;
    }

    if (documentoId) {
      whereClause.documentoId = documentoId;
    }

    const propuestas = await prisma.propuestaCambio.findMany({
      where: whereClause,
      orderBy: { creadoEn: "desc" },
      include: {
        autor: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
        revisor: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
        documento: {
          select: { id: true, titulo: true, contenidoActual: true },
        },
      },
    });

    res.json({ total: propuestas.length, propuestas });
  } catch (error: any) {
    console.error("Error al listar propuestas:", error);
    res.status(500).json({ message: "Error al obtener propuestas", error: error.message });
  }
}

// 3. Aprobar propuesta de cambio (Líder Técnico / Revisor / Admin) -> Fusión con documento oficial
export async function aprobarPropuesta(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const { comentarioRevision } = req.body;
    const revisorId = req.user!.id;

    // Transacción atómica: verificar estado, comprobar versionBase y fusionar
    const resultado = await prisma.$transaction(async (tx) => {
      const propActual = await tx.propuestaCambio.findUnique({
        where: { id },
        include: {
          documento: {
            include: {
              versiones: {
                orderBy: { numeroVersion: "desc" },
                take: 1,
              },
            },
          },
        },
      });

      if (!propActual) {
        throw new Error("NOT_FOUND");
      }

      if (propActual.estado !== EstadoPropuesta.PENDIENTE) {
        throw new Error(`ALREADY_EVALUATED:${propActual.estado}`);
      }

      const ultimaVersionActual = propActual.documento.versiones[0]?.numeroVersion || 1;

      // Validación de versión base y concurrencia: si difiere de la versión actual, conflicto 409
      if (propActual.versionBase !== null && propActual.versionBase !== ultimaVersionActual) {
        throw new Error(`CONFLICT_VERSION:${propActual.versionBase}:${ultimaVersionActual}`);
      }

      const nuevoNumeroVersion = ultimaVersionActual + 1;

      // 1. Actualizar propuesta a APROBADA
      const propAprobada = await tx.propuestaCambio.update({
        where: { id },
        data: {
          estado: EstadoPropuesta.APROBADA,
          revisorId,
          comentarioRevision: comentarioRevision ? String(comentarioRevision).trim() : "Aprobado por el líder técnico",
          revisadoEn: new Date(),
        },
      });

      // 2. Actualizar el documento oficial con el contenido aprobado
      const docActualizado = await tx.documento.update({
        where: { id: propActual.documentoId },
        data: {
          contenidoActual: propActual.contenidoPropuesto,
        },
      });

      // 3. Crear nueva versión oficial en el historial
      const nuevaVersion = await tx.version.create({
        data: {
          documentoId: propActual.documentoId,
          numeroVersion: nuevoNumeroVersion,
          contenido: propActual.contenidoPropuesto,
          mensajeCambio: `Fusión de propuesta de cambio aprobada: ${propActual.mensaje}`,
          autorId: propActual.autorId,
        },
      });

      return { propAprobada, docActualizado, nuevaVersion };
    });

    res.json({
      message: "Propuesta aprobada y fusionada exitosamente en el documento oficial",
      propuesta: resultado.propAprobada,
      documento: resultado.docActualizado,
      version: resultado.nuevaVersion,
    });
  } catch (error: any) {
    if (error.message?.startsWith("CONFLICT_VERSION")) {
      const [, base, actual] = error.message.split(":");
      res.status(409).json({
        message: "Conflicto: la propuesta quedó desactualizada porque el documento fue modificado con una versión posterior",
        versionBase: Number(base),
        versionActual: Number(actual),
      });
      return;
    }

    if (error.message === "NOT_FOUND") {
      res.status(404).json({ message: "Propuesta no encontrada" });
      return;
    }

    if (error.message?.startsWith("ALREADY_EVALUATED")) {
      const [, estado] = error.message.split(":");
      res.status(400).json({ message: `La propuesta ya fue evaluada (Estado: ${estado})` });
      return;
    }

    console.error("Error al aprobar propuesta:", error);
    res.status(500).json({ message: "Error al aprobar propuesta", error: error.message });
  }
}

// 4. Rechazar propuesta de cambio (Líder Técnico / Revisor / Admin)
export async function rechazarPropuesta(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const { comentarioRevision } = req.body;
    const revisorId = req.user!.id;

    const propuesta = await prisma.propuestaCambio.findUnique({ where: { id } });

    if (!propuesta) {
      res.status(404).json({ message: "Propuesta no encontrada" });
      return;
    }

    if (propuesta.estado !== EstadoPropuesta.PENDIENTE) {
      res.status(400).json({ message: `La propuesta ya fue evaluada (Estado: ${propuesta.estado})` });
      return;
    }

    const propRechazada = await prisma.propuestaCambio.update({
      where: { id },
      data: {
        estado: EstadoPropuesta.RECHAZADA,
        revisorId,
        comentarioRevision: comentarioRevision ? String(comentarioRevision).trim() : "Cambio rechazado por el revisor",
        revisadoEn: new Date(),
      },
    });

    res.json({
      message: "Propuesta rechazada con observaciones registradas",
      propuesta: propRechazada,
    });
  } catch (error: any) {
    console.error("Error al rechazar propuesta:", error);
    res.status(500).json({ message: "Error al rechazar propuesta", error: error.message });
  }
}
