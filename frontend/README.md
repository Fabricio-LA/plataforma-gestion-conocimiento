# Frontend Web - Plataforma de Gestión de Conocimiento (Micro-SaaS)

Estructura modular en **React** diseñada para la interfaz de usuario de la plataforma colaborativa de gestión y versionado de documentos técnicos.

---

## 📁 Arquitectura del Frontend

```text
frontend/
├── public/                 # Recursos estáticos servidos directamente (favicon, manifest)
├── src/
│   ├── assets/             # Logos, íconos vectoriales y estilos globales
│   ├── components/         # Componentes reutilizables
│   │   ├── common/         # Componentes atómicos (Botones, Inputs, Modales, Badges, Alertas)
│   │   ├── layout/         # Estructura visual de la app (Navbar, Sidebar, Footer, MainLayout)
│   │   └── documents/      # Componentes de documentos (Editor Markdown, Visor de Diff/Versiones)
│   ├── context/            # Estados globales con React Context (AuthContext, DocumentContext)
│   ├── hooks/              # Custom Hooks (useAuth, useDocuments, etc.)
│   ├── pages/              # Vistas principales:
│   │                       #  - LoginPage (Inicio de sesión con JWT)
│   │                       #  - DashboardPage (Bandeja y lista de notas/documentos)
│   │                       #  - DocumentDetailPage (Lectura de documento vigente)
│   │                       #  - DocumentEditorPage (Edición y propuesta de cambios)
│   │                       #  - HistoryPage (Historial y comparación de versiones)
│   │                       #  - ApprovalsPage (Panel para Líder Técnico/Revisor)
│   ├── services/           # Comunicación con la API REST
│   │   └── api.ts          # Cliente base para fetch/HTTP con token de autenticación
│   ├── types/              # Definiciones TypeScript de entidades (Usuario, Documento, Version)
│   │   └── index.ts
│   └── utils/              # Funciones auxiliares y formateadores
├── .env.example            # Variable VITE_API_URL hacia el backend (http://localhost:4000/api)
└── README.md
```

---

## 🔌 Conexión con el Backend

El backend corre por defecto en `http://localhost:4000/api`.
En `src/services/api.ts` dispones de la función `apiRequest(endpoint, options)` configurada para enviar automáticamente el token JWT almacenado en `localStorage`.

---

## 📋 Vistas Sugeridas según BPMN y Alcances

1. **Autenticación:** Iniciar sesión según rol (Administrador, Revisor / Líder Técnico, Analista).
2. **Dashboard / Explorador:** Listado de documentos, buscador, filtros por categoría y etiquetas.
3. **Editor:** Creación y modificación en formato Markdown / texto enriquecido.
4. **Visor de Historial y Diffs:** Línea de tiempo de versiones pasadas y comparación visual de cambios.
5. **Panel de Aprobaciones:** Vista del Revisor para aprobar o rechazar propuestas de cambio.
