import { Router } from "express";
import {
  crearPropuesta,
  listarPropuestas,
  aprobarPropuesta,
  rechazarPropuesta,
} from "../controllers/propuesta.controller.js";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { Rol } from "@prisma/client";

const router = Router();

// Todas las rutas de propuestas requieren autenticación
router.use(authenticateToken);

// Listar y proponer cambios (Analista / Cualquier usuario autenticado)
router.get("/", listarPropuestas);
router.post("/", crearPropuesta);

// Flujo de revisión BPMN: solo Líder Técnico (REVISOR) o ADMIN pueden aprobar/rechazar
router.put("/:id/aprobar", authorizeRoles(Rol.REVISOR, Rol.ADMIN), aprobarPropuesta);
router.put("/:id/rechazar", authorizeRoles(Rol.REVISOR, Rol.ADMIN), rechazarPropuesta);

export default router;
