-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'REVISOR', 'ANALISTA');

-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('BORRADOR', 'EN_REVISION', 'PUBLICADO', 'OBSOLETO');

-- CreateEnum
CREATE TYPE "EstadoPropuesta" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'ANALISTA',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etiquetas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "etiquetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido_actual" TEXT NOT NULL,
    "estado" "EstadoDocumento" NOT NULL DEFAULT 'BORRADOR',
    "categoria_id" TEXT,
    "autor_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versiones" (
    "id" TEXT NOT NULL,
    "documento_id" TEXT NOT NULL,
    "numero_version" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "mensaje_cambio" TEXT NOT NULL,
    "autor_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propuestas_cambio" (
    "id" TEXT NOT NULL,
    "documento_id" TEXT NOT NULL,
    "autor_id" TEXT NOT NULL,
    "revisor_id" TEXT,
    "contenido_propuesto" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "estado" "EstadoPropuesta" NOT NULL DEFAULT 'PENDIENTE',
    "comentario_revision" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisado_en" TIMESTAMP(3),

    CONSTRAINT "propuestas_cambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_etiquetas" (
    "documento_id" TEXT NOT NULL,
    "etiqueta_id" TEXT NOT NULL,

    CONSTRAINT "documento_etiquetas_pkey" PRIMARY KEY ("documento_id","etiqueta_id")
);

-- CreateTable
CREATE TABLE "documento_relaciones" (
    "origen_id" TEXT NOT NULL,
    "destino_id" TEXT NOT NULL,

    CONSTRAINT "documento_relaciones_pkey" PRIMARY KEY ("origen_id","destino_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "etiquetas_nombre_key" ON "etiquetas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "versiones_documento_id_numero_version_key" ON "versiones"("documento_id", "numero_version");

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versiones" ADD CONSTRAINT "versiones_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versiones" ADD CONSTRAINT "versiones_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_cambio" ADD CONSTRAINT "propuestas_cambio_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_cambio" ADD CONSTRAINT "propuestas_cambio_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_cambio" ADD CONSTRAINT "propuestas_cambio_revisor_id_fkey" FOREIGN KEY ("revisor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_etiquetas" ADD CONSTRAINT "documento_etiquetas_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_etiquetas" ADD CONSTRAINT "documento_etiquetas_etiqueta_id_fkey" FOREIGN KEY ("etiqueta_id") REFERENCES "etiquetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_relaciones" ADD CONSTRAINT "documento_relaciones_origen_id_fkey" FOREIGN KEY ("origen_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_relaciones" ADD CONSTRAINT "documento_relaciones_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
