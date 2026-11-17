import { Router } from "express";
import {
  listarDocumentos,
  obtenerDocumentoPorId,
  crearDocumento,
  actualizarDocumento,
  eliminarDocumento,
  obtenerHistorialVersiones,
  compararVersiones,
  restaurarVersion,
} from "../controllers/documento.controller.js";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { Rol } from "@prisma/client";

const router = Router();

// Todas las operaciones sobre documentos requieren sesión activa
router.use(authenticateToken);

// CRUD de documentos
router.get("/", listarDocumentos);
router.post("/", crearDocumento);
router.get("/:id", obtenerDocumentoPorId);
router.put("/:id", actualizarDocumento);
router.delete("/:id", eliminarDocumento);

// Versionado y trazabilidad (Git-like)
router.get("/:id/versiones", obtenerHistorialVersiones);
router.get("/:id/diff", compararVersiones);
router.post("/:id/restaurar/:versionId", authorizeRoles(Rol.REVISOR, Rol.ADMIN), restaurarVersion);

export default router;
