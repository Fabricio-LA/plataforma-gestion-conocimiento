# Backend API - Plataforma de Gestión de Conocimiento (Micro-SaaS)

Servicio backend desarrollado con **Node.js**, **Express**, **TypeScript** y **Prisma ORM**, conectado a una base de datos relacional **PostgreSQL**.

---

## 🏗️ Arquitectura del Proyecto

```text
backend/
├── prisma/
│   └── schema.prisma         # Modelos de datos (Usuarios, Roles, Documentos, Versiones, Propuestas)
├── src/
│   ├── config/               # Configuración global y cliente Prisma (db.ts)
│   ├── controllers/          # Controladores que procesan solicitudes HTTP
│   ├── middlewares/          # Autenticación JWT, verificación de roles (RBAC)
│   ├── routes/               # Definición y enrutamiento de endpoints REST
│   ├── services/             # Lógica de negocio (versionado tipo Git, diffs, aprobaciones)
│   └── index.ts              # Punto de entrada del servidor Express
├── .env.example              # Variables de entorno requeridas
├── package.json              # Dependencias y scripts de desarrollo
└── tsconfig.json             # Configuración del compilador TypeScript
```

---

## 🚀 Requisitos Previos

1. **Node.js** (v20 o superior LTS) y **npm**.
2. **Docker Desktop** (para la base de datos PostgreSQL).

---

## 🛠️ Comandos Disponibles

* `npm install` : Instala todas las dependencias del proyecto.
* `npm run dev` : Inicia el servidor en modo desarrollo con recarga en vivo (`tsx watch`).
* `npm run build` : Compila el código TypeScript a JavaScript en `./dist`.
* `npm run start` : Inicia el servidor compilado en producción.
* `npm run prisma:generate` : Genera el cliente tipado de Prisma.
* `npm run prisma:migrate` : Ejecuta y aplica migraciones a la base de datos PostgreSQL.
* `npm run prisma:studio` : Abre la interfaz visual de Prisma Studio para inspeccionar los datos.

---

## 📡 Catálogo de Endpoints de la API (`http://localhost:4000/api`)

### 1. Autenticación (`/api/auth`)
| Método | Endpoint | Descripción | Requiere Auth |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Registro de usuario (`nombre`, `email`, `password`, `rol` opcional) | No |
| `POST` | `/api/auth/login` | Inicio de sesión (`email`, `password`) -> devuelve `token` y `usuario` | No |
| `GET` | `/api/auth/me` | Retorna el perfil del usuario autenticado | Sí |

### 2. Documentos y Gestión de Notas (`/api/documentos`)
| Método | Endpoint | Descripción | Requiere Auth |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/documentos` | Listar documentos (soporta `?busqueda=`, `?categoriaId=`, `?estado=`) | Sí |
| `POST` | `/api/documentos` | Crear documento (`titulo`, `contenido`, `categoriaId`, `etiquetas`, `documentosRelacionadosIds`) -> crea Versión 1 | Sí |
| `GET` | `/api/documentos/:id` | Detalle del documento con autor, categoría, etiquetas, versiones y relaciones | Sí |
| `PUT` | `/api/documentos/:id` | Actualizar documento (`titulo`, `contenido`, `mensajeCambio`) -> crea nueva Versión | Sí |
| `DELETE`| `/api/documentos/:id` | Eliminar documento (autor o ADMIN) | Sí |

### 3. Control de Versiones Granular y Diffs (`/api/documentos/:id/...`)
| Método | Endpoint | Descripción | Requiere Auth |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/documentos/:id/versiones` | Historial cronológico de versiones del documento | Sí |
| `GET` | `/api/documentos/:id/diff?v1=1&v2=2` | Comparador de diferencias línea por línea estilo Git (`added`, `removed`, `value`) | Sí |
| `POST` | `/api/documentos/:id/restaurar/:versionId` | Revertir el documento a una versión histórica previa | Sí |

### 4. Propuestas de Cambio y Aprobaciones BPMN (`/api/propuestas`)
| Método | Endpoint | Descripción | Roles Permitidos |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/propuestas` | Listar propuestas (soporta `?estado=PENDIENTE`, `?documentoId=`) | Autenticado |
| `POST` | `/api/propuestas` | Enviar propuesta (`documentoId`, `contenidoPropuesto`, `mensaje`) | Autenticado |
| `PUT` | `/api/propuestas/:id/aprobar` | Aprobar y fusionar cambio en documento oficial (`comentarioRevision`) | **REVISOR**, **ADMIN** |
| `PUT` | `/api/propuestas/:id/rechazar`| Rechazar propuesta de cambio con observaciones (`comentarioRevision`) | **REVISOR**, **ADMIN** |

### 5. Categorías y Etiquetas (`/api/categorias`)
| Método | Endpoint | Descripción | Requiere Auth |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/categorias` | Listar categorías disponibles | No |
| `POST` | `/api/categorias` | Crear una nueva categoría (`nombre`, `descripcion`) | Sí |
| `GET` | `/api/categorias/etiquetas` | Listar etiquetas existentes | No |
| `POST` | `/api/categorias/etiquetas` | Crear una nueva etiqueta (`nombre`) | Sí |
