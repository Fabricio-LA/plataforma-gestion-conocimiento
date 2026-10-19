import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

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
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
});

export default app;
