import { PrismaClient, Rol, EstadoDocumento, EstadoPropuesta } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando carga y actualización de datos (seed)...");

  // 1. Limpiar datos previos
  await prisma.documentoRelacion.deleteMany();
  await prisma.documentoEtiqueta.deleteMany();
  await prisma.propuestaCambio.deleteMany();
  await prisma.version.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.etiqueta.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.usuario.deleteMany();

  // 2. Crear Usuarios (Roles oficiales del organigrama)
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

  console.log("✅ Usuarios creados: admin@hitss.com, revisor@hitss.com, analista@hitss.com");

  // 3. Crear 5 Categorías completas
  const catArquitectura = await prisma.categoria.create({
    data: {
      nombre: "Arquitectura de Software",
      descripcion: "Patrones, diseños modulares, microservicios y contratos de interfaz.",
    },
  });

  const catDevops = await prisma.categoria.create({
    data: {
      nombre: "DevOps & Cloud",
      descripcion: "Contenerización con Docker, integración continua y despliegue automatizado.",
    },
  });

  const catEstandares = await prisma.categoria.create({
    data: {
      nombre: "Estándares y Buenas Prácticas",
      descripcion: "Guías de estilo, convenciones de desarrollo y gestión documental interna.",
    },
  });

  const catSeguridad = await prisma.categoria.create({
    data: {
      nombre: "Seguridad y Gobernanza de Datos",
      descripcion: "Políticas de autenticación JWT, cifrado y control de accesos por roles.",
    },
  });

  const catCalidad = await prisma.categoria.create({
    data: {
      nombre: "Gestión de Calidad y Pruebas",
      descripcion: "Pruebas unitarias, aseguramiento de calidad (QA) y cobertura de código.",
    },
  });

  // 4. Crear Etiquetas (con mayúsculas/minúsculas correctas y prolijas)
  const tagMicroservicios = await prisma.etiqueta.create({ data: { nombre: "Microservicios" } });
  const tagDocker = await prisma.etiqueta.create({ data: { nombre: "Docker" } });
  const tagSeguridad = await prisma.etiqueta.create({ data: { nombre: "Seguridad" } });
  const tagApiRest = await prisma.etiqueta.create({ data: { nombre: "API REST" } });
  const tagDevOps = await prisma.etiqueta.create({ data: { nombre: "DevOps" } });
  const tagBuenasPracticas = await prisma.etiqueta.create({ data: { nombre: "Buenas Prácticas" } });
  const tagPostgres = await prisma.etiqueta.create({ data: { nombre: "PostgreSQL" } });
  const tagCalidad = await prisma.etiqueta.create({ data: { nombre: "QA / Pruebas" } });

  // 5. Documento 1 (Líder Técnico): Guía de Microservicios (con v1 y v2 para diffs)
  const doc1V1 = `# Guía de Arquitectura de Microservicios

## 1. Introducción
Esta guía define los estándares arquitectónicos para los servicios backend en Global Hitss.

## 2. Tecnologías base
- Entorno: Node.js con TypeScript
- API REST con Express
- Base de datos relacional PostgreSQL

## 3. Protocolos de comunicación
Todas las solicitudes internas deben utilizar JSON sobre HTTPS.
`;

  const doc1V2 = `# Guía de Arquitectura de Microservicios

## 1. Introducción
Esta guía define los estándares arquitectónicos para los servicios backend en Global Hitss y sus células ágiles de desarrollo.

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
      contenidoActual: doc1V2,
      estado: EstadoDocumento.PUBLICADO,
      categoriaId: catArquitectura.id,
      autorId: revisor.id,
      versiones: {
        create: [
          {
            numeroVersion: 1,
            contenido: doc1V1,
            mensajeCambio: "Versión inicial: Definición base de componentes",
            autorId: revisor.id,
          },
          {
            numeroVersion: 2,
            contenido: doc1V2,
            mensajeCambio: "Actualización v2: Incorporación de Prisma ORM, JWT y trazabilidad",
            autorId: revisor.id,
          },
        ],
      },
      etiquetas: {
        create: [
          { etiquetaId: tagMicroservicios.id },
          { etiquetaId: tagApiRest.id },
          { etiquetaId: tagBuenasPracticas.id },
        ],
      },
    },
  });

  // 6. Documento 2 (Líder Técnico): Manual de Despliegue con Docker
  const doc2Contenido = `# Manual de Despliegue con Docker y Docker Compose

## 1. Alcance
Despliegue automatizado de entornos locales y servidores mediante contenedores aislados.

## 2. Comandos esenciales
- Levantar servicios en segundo plano: \`docker compose up -d\`
- Detener servicios: \`docker compose down\`
- Inspeccionar registros en vivo: \`docker compose logs -f postgres\`

## 3. Persistencia de Datos
Los datos de PostgreSQL residen en el volumen nombrado \`postgres_data\` para evitar pérdidas de información.
`;

  const doc2 = await prisma.documento.create({
    data: {
      titulo: "Manual de Despliegue con Docker y CI/CD",
      contenidoActual: doc2Contenido,
      estado: EstadoDocumento.PUBLICADO,
      categoriaId: catDevops.id,
      autorId: revisor.id,
      versiones: {
        create: [
          {
            numeroVersion: 1,
            contenido: doc2Contenido,
            mensajeCambio: "Creación inicial del manual de infraestructura contenerizada",
            autorId: revisor.id,
          },
        ],
      },
      etiquetas: {
        create: [
          { etiquetaId: tagDocker.id },
          { etiquetaId: tagDevOps.id },
          { etiquetaId: tagPostgres.id },
        ],
      },
    },
  });

  // 7. Documento 3 (Líder Técnico): Estándares de Seguridad y JWT
  const doc3Contenido = `# Estándares de Seguridad y Gestión de Tokens JWT

## 1. Objetivo
Garantizar la confidencialidad, autenticidad e integridad de las sesiones de usuario en la plataforma.

## 2. Reglas de Autenticación
- Los tokens JWT deben generarse con algoritmo HS256 y firma robusta.
- El tiempo de expiración estándar es de 24 horas para entornos de desarrollo.
- Las contraseñas en reposo deben procesarse con algoritmo bcrypt con factor de costo 10.

## 3. Matriz de Roles (RBAC)
- **ADMIN:** Control total de accesos y restauración de versiones.
- **REVISOR:** Evaluación, aprobación y rechazo de cambios propuestos.
- **ANALISTA:** Registro y propuesta de mejoras documentales.
`;

  const doc3 = await prisma.documento.create({
    data: {
      titulo: "Estándares de Seguridad y Gestión de Tokens JWT",
      contenidoActual: doc3Contenido,
      estado: EstadoDocumento.PUBLICADO,
      categoriaId: catSeguridad.id,
      autorId: revisor.id,
      versiones: {
        create: [
          {
            numeroVersion: 1,
            contenido: doc3Contenido,
            mensajeCambio: "Definición oficial de directivas de seguridad y control RBAC",
            autorId: revisor.id,
          },
        ],
      },
      etiquetas: {
        create: [
          { etiquetaId: tagSeguridad.id },
          { etiquetaId: tagBuenasPracticas.id },
        ],
      },
    },
  });

  // 8. Documento 4 (Líder Técnico): Directiva de Calidad de Código
  const doc4Contenido = `# Directiva de Calidad de Código y Pruebas Unitarias

## 1. Propósito
Establecer los lineamientos para garantizar estabilidad antes de promover ramas a producción.

## 2. Prácticas Obligatorias
- Cobertura mínima de pruebas recomendada: 80% en lógica de negocio.
- Compilación limpia con TypeScript en modo estricto (\`strict: true\`).
- Validación de esquemas y contratos antes de la ejecución de migraciones.
`;

  const doc4 = await prisma.documento.create({
    data: {
      titulo: "Directiva de Calidad de Código y Pruebas Unitarias",
      contenidoActual: doc4Contenido,
      estado: EstadoDocumento.PUBLICADO,
      categoriaId: catCalidad.id,
      autorId: revisor.id,
      versiones: {
        create: [
          {
            numeroVersion: 1,
            contenido: doc4Contenido,
            mensajeCambio: "Lanzamiento oficial de la directiva de aseguramiento de calidad técnica",
            autorId: revisor.id,
          },
        ],
      },
      etiquetas: {
        create: [
          { etiquetaId: tagCalidad.id },
          { etiquetaId: tagBuenasPracticas.id },
        ],
      },
    },
  });

  // 9. Documento 5 (Líder Técnico): Procedimiento Operativo de Gestión de Cambios
  const doc5Contenido = `# Procedimiento Operativo para Gestión y Versionado de Cambios

## 1. Alcance Operativo
Aplica a todos los activos documentales y especificaciones técnicas gestionados en Global Hitss.

## 2. Ciclo de Vida Documental
1. **Borrador:** Creación y elaboración inicial por el analista.
2. **Propuesta enviada:** Envío con justificación técnica detallada hacia la bandeja de revisión.
3. **Revisión técnica:** Evaluación por el Líder Técnico con comparación diferencial (Diff).
4. **Publicación o Rechazo:** Fusión automática en caso de aprobación o registro de observaciones.
`;

  const doc5 = await prisma.documento.create({
    data: {
      titulo: "Procedimiento Operativo para Gestión y Versionado de Cambios",
      contenidoActual: doc5Contenido,
      estado: EstadoDocumento.PUBLICADO,
      categoriaId: catEstandares.id,
      autorId: revisor.id,
      versiones: {
        create: [
          {
            numeroVersion: 1,
            contenido: doc5Contenido,
            mensajeCambio: "Aprobación del procedimiento estándar para el flujo BPMN de cambios",
            autorId: revisor.id,
          },
        ],
      },
      etiquetas: {
        create: [
          { etiquetaId: tagBuenasPracticas.id },
          { etiquetaId: tagMicroservicios.id },
        ],
      },
    },
  });

  // 10. Conectar documentos relacionados
  await prisma.documentoRelacion.create({ data: { origenId: doc1.id, destinoId: doc2.id } });
  await prisma.documentoRelacion.create({ data: { origenId: doc1.id, destinoId: doc3.id } });
  await prisma.documentoRelacion.create({ data: { origenId: doc4.id, destinoId: doc5.id } });

  // 11. Propuesta de Cambio Pendiente (Flujo BPMN en vivo para el Líder Técnico)
  const contenidoPropuestoDoc1 = `${doc1V2}
## 5. Auditoría y Rotación de Credenciales
Se establece la rotación obligatoria de credenciales y tokens JWT cada 30 días para cumplir con la certificación ISO 27001.
`;

  await prisma.propuestaCambio.create({
    data: {
      documentoId: doc1.id,
      autorId: analista.id,
      contenidoPropuesto: contenidoPropuestoDoc1,
      mensaje: "Propuesta de Analista: Incorporar política periódica de rotación de tokens JWT según norma ISO 27001",
      versionBase: 2,
      estado: EstadoPropuesta.PENDIENTE,
    },
  });

  console.log("✅ 5 documentos oficiales del Líder Técnico, 5 categorías y etiquetas creadas.");
  console.log("✅ Propuesta BPMN pendiente registrada en Doc 1 para evaluación del Líder Técnico.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
