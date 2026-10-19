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
