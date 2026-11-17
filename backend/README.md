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

## Arranque local reproducible

Ejecutar los siguientes comandos en PowerShell. Desde la raíz, crear los archivos
locales solo si aún no existen.

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
```

Editar el archivo raíz `.env` con los valores de PostgreSQL usados por Compose.
Si 5432 está ocupado, establecer `POSTGRES_PORT=55432`. En `backend/.env`,
ajustar `DATABASE_URL` con el mismo usuario, contraseña, base y puerto publicado.
Por ejemplo, con las credenciales locales del archivo de ejemplo y puerto alternativo
se usa `postgresql://postgres:postgres123@127.0.0.1:55432/gestion_conocimiento_db?schema=public`.
Codificar los caracteres especiales de usuario y contraseña para una URL.
La API usa `PORT=4000` por defecto. Los scripts precargan dotenv desde el directorio backend.

Generar un secreto local con el siguiente comando y colocar el resultado en
`JWT_SECRET` dentro de `backend/.env`.

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
docker compose up -d postgres
docker compose ps
Set-Location backend
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run prisma:status
npm run build
npm start
```

En otra terminal, verificar tanto el proceso HTTP como una lectura de PostgreSQL.

```powershell
curl.exe -i http://localhost:4000/api/health
curl.exe -i http://localhost:4000/api/categorias
```

La segunda consulta debe devolver HTTP 200 con `categorias`, que será un arreglo
vacío en una base nueva. Para desarrollo usar `npm run dev` desde backend.
`prisma:deploy` aplica las migraciones existentes y puede repetirse.
`prisma:migrate` se reserva para crear nuevas migraciones durante el desarrollo.
Los archivos `.env` están ignorados por Git. Versionar solamente sus ejemplos,
el esquema y las migraciones. Las credenciales de ejemplo son para uso local.

### Base existente creada con db push

Antes de aplicar esta migración sobre una base con tablas, hacer un respaldo y
verificar que su esquema coincide con `prisma/schema.prisma`. La migración inicial
crea las tablas y debe registrarse como ya aplicada cuando esas tablas ya existen.
Desde backend, con `DATABASE_URL` apuntando a esa base, el siguiente comando permite
comprobar diferencias sin escribir en ella.

```powershell
npx prisma migrate diff --from-url "$env:DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
```

Para ese comando establecer explícitamente `$env:DATABASE_URL` desde la configuración
local. El código de salida 0 indica coincidencia y 2 indica diferencias.
Solo tras confirmar coincidencia y disponer de respaldo, registrar la base inicial.

```powershell
npx prisma migrate resolve --applied 20261112000000_init
npm run prisma:deploy
```

Si hay diferencias, revisarlas antes de continuar. Conservar los volúmenes y
evitar comandos de reset durante esta adopción.

## Validación local

Validación local del 12 de noviembre de 2026 realizada con PostgreSQL 16 y Prisma
5.22.0. Se creó la base separada `pgc_migration_test_20261112` en el contenedor
existente, con cero tablas iniciales. La migración se aplicó, la segunda aplicación
quedó sin pendientes y migrate diff confirmó coincidencia con el esquema.
Pasaron npm ci desde caché, prisma generate, build y las consultas HTTP de salud
y categorías tanto con npm start (4001) como con npm run dev (4002).
La base de prueba queda disponible para inspección y los procesos de API de prueba
se detuvieron al terminar. El contenedor y su volumen se conservaron.

## 🚀 Requisitos Previos

1. **Node.js** (v20 o superior LTS) y **npm**.
2. **Docker Desktop** (para la base de datos PostgreSQL).

---

## 🛠️ Comandos Disponibles

* `npm ci` : Instala las dependencias fijadas en package-lock.json.
* `npm run dev` : Inicia el servidor en modo desarrollo con recarga en vivo (`tsx watch`).
* `npm run build` : Compila el código TypeScript a JavaScript en `./dist`.
* `npm run start` : Inicia el servidor compilado en producción.
* `npm run prisma:generate` : Genera el cliente tipado de Prisma.
* `npm run prisma:migrate` : Crea migraciones durante el desarrollo.
* `npm run prisma:deploy` : Aplica las migraciones versionadas.
* `npm run prisma:status` : Comprueba el estado de las migraciones.
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
