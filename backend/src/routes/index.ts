import { Router } from "express";
import authRoutes from "./auth.routes.js";
import documentoRoutes from "./documento.routes.js";
import propuestaRoutes from "./propuesta.routes.js";
import categoriaRoutes from "./categoria.routes.js";

const router = Router();

// Montar submódulos
router.use("/auth", authRoutes);
router.use("/documentos", documentoRoutes);
router.use("/propuestas", propuestaRoutes);
router.use("/categorias", categoriaRoutes);

export default router;
