import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Endpoint de verificación de salud (Health Check)
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "Plataforma Gestión de Conocimiento API",
    timestamp: new Date().toISOString(),
  });
});

// Enrutar todos los endpoints de la API
app.use("/api", apiRoutes);

// Manejador para rutas no encontradas
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
  console.log(`📡 Endpoints base disponibles en http://localhost:${PORT}/api`);
});

export default app;
