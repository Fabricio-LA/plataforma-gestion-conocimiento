import { Router } from "express";
import {
  listarCategorias,
  crearCategoria,
  listarEtiquetas,
  crearEtiqueta,
} from "../controllers/categoria.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas de Categorías
router.get("/", listarCategorias);
router.post("/", authenticateToken, crearCategoria);

// Rutas de Etiquetas
router.get("/etiquetas", listarEtiquetas);
router.post("/etiquetas", authenticateToken, crearEtiqueta);

export default router;
