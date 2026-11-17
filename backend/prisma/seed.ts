import { PrismaClient, Rol, EstadoDocumento, EstadoPropuesta } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando carga de datos iniciales (seed)...");

  // 1. Limpiar datos previos si existieran
  await prisma.documentoRelacion.deleteMany();
  await prisma.documentoEtiqueta.deleteMany();
  await prisma.propuestaCambio.deleteMany();
  await prisma.version.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.etiqueta.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.usuario.deleteMany();

  // 2. Crear Usuarios (uno por cada rol del organigrama)
  const passwordComun = await bcrypt.hash("123456", 10);

  const admin = await prisma.usuario.create({
    data: {
      nombre: "Fabricio Lujan (Admin)",
      email: "admin@hitss.com",
      password: passwordComun,
      rol: Rol.ADMIN,
    },
  });

  const revisor = await prisma.usuario.create({
    data: {
      nombre: "Carlos Encalada (Líder Técnico / Revisor)",
      email: "revisor@hitss.com",
      password: passwordComun,
      rol: Rol.REVISOR,
    },
  });

  const analista = await prisma.usuario.create({
    data: {
      nombre: "Rodrigo Arivilca (Analista de Desarrollo)",
      email: "analista@hitss.com",
      password: passwordComun,
      rol: Rol.ANALISTA,
    },
  });

  console.log("✅ Usuarios creados: admin@hitss.com, revisor@hitss.com, analista@hitss.com (contraseña: 123456)");

  // 3. Crear Categorías
  const catArquitectura = await prisma.categoria.create({
    data: {
      nombre: "Arquitectura de Software",
      descripcion: "Patrones, diseños modulares y contratos de interfaz para células ágiles.",
    },
  });

  const catDevops = await prisma.categoria.create({
    data: {
      nombre: "DevOps & Cloud",
      descripcion: "Guías de contenerización, despliegue continuo y pipelines de CI/CD.",
    },
  });

  const catEstandares = await prisma.categoria.create({
    data: {
      nombre: "Estándares y Buenas Prácticas",
      descripcion: "Convenciones de código, seguridad y gestión documental interna.",
    },
  });

  // 4. Crear Etiquetas
  const tagMicroservicios = await prisma.etiqueta.create({ data: { nombre: "microservicios" } });
  const tagDocker = await prisma.etiqueta.create({ data: { nombre: "docker" } });
  const tagSeguridad = await prisma.etiqueta.create({ data: { nombre: "seguridad" } });

  // 5. Crear Documento 1: con 2 versiones para probar el visualizador de diferencias (Diff)
  const contenidoDoc1V1 = `# Guía de Arquitectura de Microservicios

## 1. Introducción
Esta guía define los estándares arquitectónicos para los servicios backend en Global Hitss.

## 2. Tecnologías base
- Entorno: Node.js con TypeScript
- API REST con Express
- Base de datos relacional PostgreSQL

## 3. Protocolos de comunicación
Todas las solicitudes internas deben utilizar JSON sobre HTTPS.
`;

  const contenidoDoc1V2 = `# Guía de Arquitectura de Microservicios

## 1. Introducción
Esta guía define los estándares arquitectónicos para los servicios backend en Global Hitss y sus células de desarrollo.

## 2. Tecnologías base
- Entorno: Node.js v20+ LTS con TypeScript
- API REST con Express y Prisma ORM
- Base de datos relacional PostgreSQL 16 contenerizada

## 3. Protocolos de comunicación
Todas las solicitudes internas deben utilizar JSON sobre HTTPS con cabeceras de autorización Bearer JWT.

## 4. Trazabilidad
Cada cambio estructural debe someterse al flujo de revisión técnica antes de su puesta en producción.
`;

  const doc1 = await prisma.documento.create({
    data: {
      titulo: "Guía de Arquitectura de Microservicios y Contratos de API",
      contenidoActual: contenidoDoc1V2,
      estado: EstadoDocumento.PUBLICADO,
      categoriaId: catArquitectura.id,
      autorId: admin.id,
      versiones: {
        create: [
          {
            numeroVersion: 1,
            contenido: contenidoDoc1V1,
            mensajeCambio: "Versión inicial: Definición básica de componentes",
            autorId: admin.id,
          },
          {
            numeroVersion: 2,
            contenido: contenidoDoc1V2,
            mensajeCambio: "Actualización v2: Incorporación de Prisma ORM, JWT y trazabilidad",
            autorId: revisor.id,
          },
        ],
      },
      etiquetas: {
        create: [
          { etiquetaId: tagMicroservicios.id },
          { etiquetaId: tagSeguridad.id },
        ],
      },
    },
  });

  // 6. Crear Documento 2: Manual de Despliegue con Docker
  const contenidoDoc2 = `# Manual de Despliegue con Docker y Docker Compose

## 1. Alcance
Despliegue automatizado de entornos locales de desarrollo para células ágiles.

## 2. Comandos esenciales
- Levantar servicios: \`docker compose up -d\`
- Detener servicios: \`docker compose down\`
- Ver logs en vivo: \`docker compose logs -f\`

## 3. Persistencia
Los datos de PostgreSQL se conservan en el volumen nombrado \`postgres_data\`.
`;

  const doc2 = await prisma.documento.create({
    data: {
      titulo: "Manual de Despliegue con Docker y Docker Compose",
      contenidoActual: contenidoDoc2,
      estado: EstadoDocumento.PUBLICADO,
      categoriaId: catDevops.id,
      autorId: revisor.id,
      versiones: {
        create: [
          {
            numeroVersion: 1,
            contenido: contenidoDoc2,
            mensajeCambio: "Creación inicial del manual de infraestructura",
            autorId: revisor.id,
          },
        ],
      },
      etiquetas: {
        create: [{ etiquetaId: tagDocker.id }],
      },
    },
  });

  // 7. Relacionar Documento 1 con Documento 2
  await prisma.documentoRelacion.create({
    data: {
      origenId: doc1.id,
      destinoId: doc2.id,
    },
  });

  // 8. Crear Propuesta de Cambio Pendiente (Flujo BPMN en vivo para el Líder Técnico)
  const contenidoPropuestoDoc1 = `${contenidoDoc1V2}
## 5. Auditoría de Seguridad
Se establece la rotación obligatoria de credenciales y tokens JWT cada 30 días.
`;

  await prisma.propuestaCambio.create({
    data: {
      documentoId: doc1.id,
      autorId: analista.id,
      contenidoPropuesto: contenidoPropuestoDoc1,
      mensaje: "Propuesta: Añadir política de rotación periódica de tokens JWT para cumplir normativa ISO",
      estado: EstadoPropuesta.PENDIENTE,
    },
  });

  console.log("✅ Documentos de prueba y propuesta BPMN pendiente registrados con éxito.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
