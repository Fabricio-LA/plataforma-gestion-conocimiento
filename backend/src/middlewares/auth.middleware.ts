import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import { Rol } from "@prisma/client";

export interface TokenPayload {
  id: string;
  email: string;
  rol: Rol;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || "clave_secreta_global_hitss";

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    res.status(401).json({ message: "Acceso no autorizado: token no proporcionado" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    // Verificar que el usuario exista y siga activo
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, rol: true, activo: true },
    });

    if (!usuario || !usuario.activo) {
      res.status(401).json({ message: "Usuario no válido o inactivo" });
      return;
    }

    req.user = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };

    next();
  } catch (error) {
    res.status(403).json({ message: "Token inválido o expirado" });
    return;
  }
}

export function authorizeRoles(...allowedRoles: Rol[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }

    if (!allowedRoles.includes(req.user.rol)) {
      res.status(403).json({
        message: `Acceso denegado: requiere uno de los roles [${allowedRoles.join(", ")}]`,
      });
      return;
    }

    next();
  };
}
