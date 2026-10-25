import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { Rol } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "clave_secreta_global_hitss";
const JWT_EXPIRES_IN = "24h";

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      res.status(400).json({ message: "Nombre, email y contraseña son obligatorios" });
      return;
    }

    const emailExistente = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (emailExistente) {
      res.status(409).json({ message: "Ya existe un usuario con este correo electrónico" });
      return;
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Asignar rol (validar contra enum Rol o por defecto ANALISTA)
    let rolAsignado: Rol = Rol.ANALISTA;
    if (rol && Object.values(Rol).includes(rol)) {
      rolAsignado = rol;
    }

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        email: email.toLowerCase().trim(),
        password: passwordHash,
        rol: rolAsignado,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        creadoEn: true,
      },
    });

    const token = jwt.sign(
      { id: nuevoUsuario.id, email: nuevoUsuario.email, rol: nuevoUsuario.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: "Usuario registrado exitosamente",
      usuario: nuevoUsuario,
      token,
    });
  } catch (error: any) {
    console.error("Error en register:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email y contraseña son obligatorios" });
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!usuario) {
      res.status(401).json({ message: "Credenciales inválidas" });
      return;
    }

    if (!usuario.activo) {
      res.status(403).json({ message: "Esta cuenta se encuentra inactiva" });
      return;
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      res.status(401).json({ message: "Credenciales inválidas" });
      return;
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: "Inicio de sesión exitoso",
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo,
        creadoEn: usuario.creadoEn,
      },
      token,
    });
  } catch (error: any) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        creadoEn: true,
      },
    });

    if (!usuario) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    res.json({ usuario });
  } catch (error: any) {
    console.error("Error en getMe:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
}
