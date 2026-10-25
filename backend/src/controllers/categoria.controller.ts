import { Request, Response } from "express";
import prisma from "../config/db.js";

export async function listarCategorias(_req: Request, res: Response): Promise<void> {
  try {
    const categorias = await prisma.categoria.findMany({
      orderBy: { nombre: "asc" },
      include: {
        _count: {
          select: { documentos: true },
        },
      },
    });

    res.json({ categorias });
  } catch (error: any) {
    console.error("Error al listar categorías:", error);
    res.status(500).json({ message: "Error al obtener categorías", error: error.message });
  }
}

export async function crearCategoria(req: Request, res: Response): Promise<void> {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre || !nombre.trim()) {
      res.status(400).json({ message: "El nombre de la categoría es obligatorio" });
      return;
    }

    const existente = await prisma.categoria.findUnique({
      where: { nombre: nombre.trim() },
    });

    if (existente) {
      res.status(409).json({ message: "Ya existe una categoría con ese nombre" });
      return;
    }

    const nueva = await prisma.categoria.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
      },
    });

    res.status(201).json({ message: "Categoría creada exitosamente", categoria: nueva });
  } catch (error: any) {
    console.error("Error al crear categoría:", error);
    res.status(500).json({ message: "Error al crear categoría", error: error.message });
  }
}

export async function listarEtiquetas(_req: Request, res: Response): Promise<void> {
  try {
    const etiquetas = await prisma.etiqueta.findMany({
      orderBy: { nombre: "asc" },
    });
    res.json({ etiquetas });
  } catch (error: any) {
    console.error("Error al listar etiquetas:", error);
    res.status(500).json({ message: "Error al obtener etiquetas", error: error.message });
  }
}

export async function crearEtiqueta(req: Request, res: Response): Promise<void> {
  try {
    const { nombre } = req.body;

    if (!nombre || !nombre.trim()) {
      res.status(400).json({ message: "El nombre de la etiqueta es obligatorio" });
      return;
    }

    const existente = await prisma.etiqueta.findUnique({
      where: { nombre: nombre.trim().toLowerCase() },
    });

    if (existente) {
      res.status(409).json({ message: "La etiqueta ya existe" });
      return;
    }

    const nueva = await prisma.etiqueta.create({
      data: { nombre: nombre.trim().toLowerCase() },
    });

    res.status(201).json({ message: "Etiqueta creada", etiqueta: nueva });
  } catch (error: any) {
    console.error("Error al crear etiqueta:", error);
    res.status(500).json({ message: "Error al crear etiqueta", error: error.message });
  }
}
