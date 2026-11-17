# Auditoría y plan del frontend

Verificación del 10 de noviembre de 2026. La API es Node.js con Express, TypeScript y Prisma sobre PostgreSQL 16. El [README del backend](../backend/README.md) contiene los comandos y el catálogo de rutas. Las vistas del [README del frontend](../frontend/README.md) describen el alcance previsto.

Actualización local del 12 de noviembre de 2026 en `feature/api-entorno-local`.
Se preparó `20261112000000_init` a partir del esquema existente. La migración se
aplicó en `pgc_migration_test_20261112`, una base nueva separada de
`gestion_conocimiento_db`, en el mismo PostgreSQL 16 de Docker publicado en 55432.
Se verificaron cero tablas antes de aplicar, despliegue repetible sin migraciones
pendientes y coincidencia exacta con el esquema Prisma mediante migrate diff.
La instalación con npm ci desde caché, la generación del cliente y la compilación
pasaron. La API compilada, configurada temporalmente en 4001, respondió HTTP 200
en salud y categorías. Categorías devolvió un arreglo vacío tras consultar la base
de prueba. Los conteos de usuarios, documentos y categorías de la base actual
se mantuvieron en cero. Se conserva la base de prueba para inspección.
El procedimiento vigente de instalación, variables, migraciones y arranque está
en el README del backend, incluida la adopción de una base creada con db push.
Los apartados siguientes conservan el registro de la auditoría inicial.

## Estado de Git y flujo

- `git ls-remote` confirmó en `personal` (Crls94/PGC) que `main` y `develop` apuntan a `6144620` y `feature/frontend-bootstrap` a `7db0813`. El bootstrap contiene un único commit sobre `develop` y su diff se limita al frontend y su configuración de Git.
- Localmente, `develop` es la rama activa y sigue a `personal/develop`. El bootstrap sigue a `personal/feature/frontend-bootstrap`. `main` sigue a `upstream/main`; ambas referencias locales apuntan a `6144620`. `upstream` es el repositorio de Fabricio y se usa como referencia. La consulta directa a upstream falló por conectividad; su estado se leyó de la referencia local. Para trabajar sobre la base personal, usar explícitamente `personal/main` o acordar el cambio de seguimiento local.
- Se conserva el stash «Avances locales antes de revisar main» y el archivo previo sin seguimiento `frontend/tsconfig.tsbuildinfo`. El build puede volver a generar este archivo. Mantenerlo fuera del PR.
- `main` es la base estable aprobada para despliegue. `develop` recibe cambios validados. Crear cada `feature/*` desde `develop` actualizado y abrir un PR hacia `develop` en el remoto personal. Promover `develop` a `main` mediante un PR de release tras validar el conjunto.

## Cobertura comprobada en código

Los endpoints se indican respecto de `/api`. En `develop` hay tipos y un cliente HTTP. En el bootstrap la única pantalla implementada comprueba `GET /health` directamente con fetch, muestra el estado y permite reintentar. Es la única función de interfaz completa en código. Las funciones de producto de la tabla carecen de pantalla y su cobertura global es parcial cuando hay API. La administración de usuarios está ausente.

| Función | Soporte efectivo y brecha |
| --- | --- |
| Autenticación | `POST /auth/login`, `GET /auth/me` y registro público implementados. El cliente puede adjuntar un JWT desde localStorage. Faltan formulario, gestión de sesión, cierre de sesión y rutas protegidas. |
| Explorador y búsqueda | `GET /documentos` busca en título y contenido sin distinguir mayúsculas y filtra por categoría y estado. Hay catálogos de categorías y etiquetas. Faltan interfaz, filtro por etiqueta en la API y paginación. |
| Creación | `POST /documentos` crea el documento y la versión 1 en una transacción. Admite categoría, etiquetas y relaciones. Falta formulario. La API permite indicar el estado inicial. |
| Lectura | `GET /documentos/:id` devuelve contenido vigente, autor, etiquetas, relaciones y metadatos de versiones. Falta visor. |
| Propuestas | `GET/POST /propuestas` listan por documento y estado o envían contenido y motivo. La propuesta nace pendiente y el documento sigue vigente. Faltan editor y seguimiento de propuestas. La API carece de versión base. |
| Aprobación y rechazo | `PUT /propuestas/:id/aprobar` y `/rechazar` requieren REVISOR o ADMIN. Aprobar actualiza documento y crea versión en una transacción. Rechazar registra la decisión sin modificar el documento. Faltan bandeja, comparación de propuesta con su base y manejo de conflictos. |
| Historial | `GET /documentos/:id/versiones` devuelve contenido y autoría por versión en orden descendente. Falta navegación y lectura histórica. Las versiones guardan contenido. Título, estado y categoría quedan fuera de la instantánea. |
| Comparación | `GET /documentos/:id/diff?v1=1&v2=2` compara dos números de versión guardados y devuelve bloques por línea. Falta selector y visor. Este endpoint carece de soporte para comparar propuestas pendientes. |
| Restauración | `POST /documentos/:id/restaurar/:versionId` aplica contenido histórico y registra una nueva versión. Falta pantalla y la operación directa carece de autorización específica. |
| Usuarios y roles | Prisma modela ADMIN, REVISOR, ANALISTA y cuenta activa. El middleware consulta rol y estado vigentes en BD. Las rutas montadas carecen de listado de usuarios, cambios de rol, activación o desactivación. |

## Arranque y contratos

### Validación del bootstrap completada

Prueba local del 10 de noviembre de 2026, sobre `feature/frontend-bootstrap`.

- **Compilación.** `npm run build` pasó tanto en frontend como en backend con las dependencias existentes. La instalación limpia del frontend ya se había comprobado en la copia temporal del mismo commit.
- **PostgreSQL.** Se inició Docker Desktop y `docker compose up -d postgres` creó el volumen del proyecto. PostgreSQL 18 de Windows ya escuchaba en 5432 y la conexión con las credenciales de ejemplo falló con P1000. Se ejecutó Compose con `$env:POSTGRES_PORT='55432'`, conservando el mismo volumen. El contenedor quedó operativo. Para futuras ejecuciones mantener esa variable en la terminal o configurar el puerto en el entorno local.
- **Esquema y API.** Se usó la URL de `backend/.env.example` con host `127.0.0.1` y puerto `55432`, `PORT=4000` y un secreto JWT aleatorio solo en el proceso. `prisma db push` inicializó el esquema del volumen recién creado sin reset ni aceptación de pérdida de datos. Después se compiló y arrancó mediante `npm start`. Este procedimiento local queda pendiente de sustituirse por migraciones versionadas para entornos compartidos.
- **Conectividad con BD.** `GET http://localhost:4000/api/categorias` respondió HTTP 200 con `{"categorias":[]}`. El controlador ejecuta `prisma.categoria.findMany`, por lo que esta comprobación alcanzó PostgreSQL. `GET /api/health` respondió HTTP 200 con `status=ok`. La respuesta incluyó CORS permitido para el origen del frontend.
- **Navegador.** Vite arrancó en `http://127.0.0.1:5181/`. En el navegador integrado de VS Code se comprobó esa dirección y el estado «Sin conexión al servidor» con la API apagada. Tras arrancarla se pulsó el botón «Comprobar conexión» y la misma página mostró «Servidor disponible» y «Todo listo. La plataforma puede comunicarse con el servidor». El navegador de la herramienta integrada estaba inaccesible y se utilizó la ventana existente de VS Code.
- **Alcance.** Pasó el recorrido del bootstrap hasta `/health` y, por separado, una consulta real de API a BD. La pantalla actual solo consulta salud. Las operaciones autenticadas y los flujos documentales quedan pendientes de las entregas del plan. Se conservaron el stash y los cambios existentes. El único archivo fuente modificado durante esta validación fue este documento. Los puertos 5181 y 55432 son ajustes locales.

Las observaciones siguientes describen el estado de la auditoría inicial y los contratos pendientes.

- En una copia temporal de `7db0813`, la instalación desde caché y el build de producción completaron. Vite sirvió el HTML y transformó `/src/main.tsx` con HTTP 200 en `127.0.0.1:5181` tras autorizar la ejecución. El fallo previo en 5173 fue EACCES. Un intento en 5180 abrió el puerto, pero el sandbox bloqueó el proceso de esbuild con EPERM.
- El chequeo TypeScript del backend pasó con `tsc --noEmit` y las dependencias instaladas. Durante la auditoría el daemon de Docker Desktop no respondió y `localhost:4000/api/health` estaba inaccesible. Queda pendiente el flujo completo en navegador con API y BD.
- Para la prueba local, levantar PostgreSQL con `docker compose up -d postgres` desde la raíz. Configurar `backend/.env` con `DATABASE_URL` coherente con Compose, `PORT=4000` y un `JWT_SECRET` propio. Desde `backend`, instalar dependencias, generar Prisma y aplicar el esquema sobre una BD local desechable. El repo tiene `schema.prisma` y carece de migraciones versionadas. Acordar cómo incorporar la migración inicial antes de validar en entornos compartidos. Iniciar la API desde `backend`. Cargar las variables antes de importar los módulos de auth, que leen el secreto al inicializarse.
- Configurar `frontend/.env` si cambia `VITE_API_URL`. El valor por defecto es `http://localhost:4000/api`. `/health` solo verifica Express. Validar PostgreSQL con una operación real, por ejemplo el catálogo de categorías. La API habilita CORS globalmente y utiliza un secreto JWT fijo de respaldo. Revisar ambos antes de compartir el entorno.
- El listado y detalle devuelven etiquetas como nombres, aunque `Documento` las tipa como objetos. El listado omite `autorId` y devuelve `totalVersiones`. El detalle devuelve `relaciones` y versiones resumidas. Las autorías embebidas son perfiles parciales. Separar esos DTO al conectar las pantallas.

## Permisos y revisión

1. **Registro público privilegiado.** `auth.routes.ts` expone el registro públicamente y el controlador acepta cualquier valor del enum de roles. Restringir el alta pública a ANALISTA y definir cómo se provisionan las cuentas de revisión.
2. **Mutaciones que eluden revisión.** `PUT /documentos/:id` y la restauración solo exigen sesión. Permiten cambiar el documento oficial directamente sin verificar rol ni autoría. La creación acepta el estado indicado por el cliente. Definir en servidor quién puede crear borradores, cambiar estados y publicar. Canalizar las modificaciones de contenido vigente por revisión. La eliminación tiene control de autor o ADMIN y elimina en cascada versiones y propuestas. Dejarla fuera de la interfaz del MVP hasta acordar retención.
3. **Propuestas desactualizadas y decisiones simultáneas.** `PropuestaCambio` no referencia la versión base. Aprobar aplica todo el contenido propuesto sobre el vigente. Además, las comprobaciones de estado pendiente se hacen antes de las escrituras y pueden quedar obsoletas. Guardar la versión base, verificarla al enviar y al decidir, y condicionar la decisión dentro de la transacción para que solo una gane. Acordar si se admite autorrevisión y qué propuestas o borradores puede ver cada rol.

## Validación e integración propuesta

1. Actualizar las referencias de `personal` y comprobar la base y el diff del bootstrap. Usar una copia limpia de la rama y verificar `npm ci`, `npm run build` y `npm run dev -- --port 5181 --strictPort` en `frontend`.
2. Probar en navegador con la API apagada y encendida. Comprobar estado inicial, error, reintento y recuperación tras arrancar la API. Verificar `GET /api/health` y una lectura con acceso a BD. Registrar el puerto y los resultados en el PR.
3. Abrir, tras la validación, un PR `feature/frontend-bootstrap → develop` en Crls94/PGC. Revisar el alcance y conservar `7db0813` con un merge normal si se quiere mantener ese commit en la historia de `develop`. Acordar dónde versionar esta auditoría antes de preparar el PR. En esta etapa el PR queda propuesto.

## Entregas pequeñas en orden

Cada rama sale de `develop` después de integrar sus dependencias. Las diez ramas de la tabla constituyen el MVP propuesto.

| Rama propuesta | Alcance | Criterio de aceptación |
| --- | --- | --- |
| `feature/api-entorno-local` | Arranque reproducible, migración inicial y cuentas de prueba por rol. | Una BD vacía se inicializa; la API responde y lee un catálogo; el secreto se carga desde configuración. |
| `feature/api-permisos-revision` | Restringir registro, proteger cambios directos y fijar reglas de estados y visibilidad. | El alta pública solo crea analistas; un analista no publica ni restaura directamente; el servidor aplica la matriz acordada. |
| `feature/frontend-sesion` | Inicio y cierre de sesión, perfil y navegación protegida. | Credenciales válidas abren el explorador; recargar recupera el perfil; sesión inválida vuelve al login; un 403 de permisos conserva la sesión válida. |
| `feature/frontend-explorador` | Lista, búsqueda y filtros de categoría y estado. | Buscar por título o contenido y combinar filtros devuelve los resultados correctos; hay estados de carga, vacío y error. |
| `feature/frontend-lectura` | Detalle del documento con contenido, autor, estado y metadatos. | Un enlace directo carga el documento vigente; 404 se muestra claramente; el contenido se renderiza de forma segura. |
| `feature/frontend-creacion` | Formulario con título, contenido y categoría opcional. | Valida campos obligatorios; abre el documento creado tras guardar y el historial contiene la versión 1. |
| `feature/api-propuestas-version-base` | Persistir base y proteger decisiones concurrentes. | Una propuesta obsoleta recibe conflicto sin sobrescribir contenido; dos decisiones simultáneas producen un único resultado coherente. |
| `feature/frontend-propuestas` | Editar desde la versión leída, enviar motivo y seguir estado. | El envío queda pendiente y conserva el contenido vigente; un conflicto permite recargar sin perder el borrador local de la edición. |
| `feature/frontend-revision` | Bandeja, comparación contra la base, aprobación y rechazo. | Un revisor ve los cambios y registra su decisión; aprobar crea una sola versión y rechazar conserva la vigente; el analista carece de permiso en la API. |
| `feature/frontend-historial` | Historial, lectura histórica y comparación de dos versiones oficiales. | Se muestran autor, fecha y motivo; elegir dos versiones distingue adiciones y eliminaciones, incluso cuando son iguales. |

**Posteriores al MVP.** `feature/frontend-restauracion` prepara una propuesta con contenido histórico. Debe conservar el historial y crear una sola versión oficial tras aprobación. `feature/frontend-filtros-avanzados` incorpora etiquetas y paginación con soporte de API, conservando filtros al navegar. `feature/api-gestion-usuarios` queda condicionada a una necesidad acordada. Requeriría listar cuentas y cambiar rol o estado con autorización y trazabilidad antes de planificar una interfaz. La edición enriquecida y la gestión visual de relaciones también quedan para después.
