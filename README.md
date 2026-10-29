# UTP Incident Operations UI

Frontend para el sistema de Mesa Operativa e Infraestructura TI de la Universidad Tecnológica del Perú (UTP).

## Conexión con Backend (`api-incident`)

Este frontend se comunica directamente con la API REST de incidentes (por defecto `http://localhost:8081` en desarrollo y `https://api-incident.onrender.com` en producción).

### Endpoints Consumidos (contrato OpenAPI 3.0.1 del backend):
- **Autenticación:**
  - `POST /api/auth/login`: Validación de credenciales y emisión del token de sesión.
  - `GET /api/auth/me`: Validación del token activo y datos del usuario autenticado.
  - `POST /api/auth/logout`: Cierre de sesión en el backend.
- **Usuarios:**
  - `POST /api/users`: Registro de usuarios (usuario, nombre, correo y contraseña). Se crea con rol Operador (`OPERATOR`).
  - `GET /api/users`: Listado de usuarios para el panel de administración (requiere token ADMIN).
  - `GET /api/users/{id}`: Detalle de un usuario por ID.
  - `PATCH /api/users/{id}/role`: Cambio de rol de un usuario (Administrador, Supervisor, Operador o Soporte).
- **Métricas y Estadísticas:**
  - `GET /api/incidents/stats`: Totales, activos, inactivos y desgloses.
  - `GET /api/incidents/stats/total`: Total de incidentes.
  - `GET /api/incidents/stats/by-status`: Conteo agrupado por estado.
  - `GET /api/incidents/stats/by-severity`: Conteo agrupado por severidad.
  - `GET /api/incidents/stats/by-category`: Conteo agrupado por categoría.
  - `GET /api/incidents/stats/count`: Cantidad total de incidentes.
- **Gestión de Incidentes (CRUD):**
  - `GET /api/incidents`: Listado de todos los tickets.
  - `GET /api/incidents/{id}`: Detalle de incidente por ID.
  - `POST /api/incidents`: Creación de nuevo incidente con categoría, prioridad, ubicación y estado.
  - `PATCH /api/incidents/{id}/status`: Actualización de estado y notas de resolución/rechazo.
  - `DELETE /api/incidents/{id}`: Eliminación de tickets.

### Administración de Usuarios (solo ADMIN):
La pestaña **Usuarios** del encabezado lista las cuentas y permite cambiar el rol (Administrador, Supervisor, Operador, Soporte) con un selector por fila. Un administrador no puede modificar su propio rol y también puede registrar nuevas cuentas desde esa vista. Al hacer clic en el nombre de usuario se consulta su detalle.

El registro de cuentas **no permite elegir rol**: toda cuenta nueva se crea como Operador (`OPERATOR`) y solo un administrador puede cambiarlo desde esta página.

Endpoints utilizados:
- `GET /api/users` → listado de usuarios `{ id, username, name, email, role, createdAt }` (requiere token ADMIN).
- `GET /api/users/{id}` → detalle de usuario.
- `PATCH /api/users/{id}/role` con `{ "role": "SUPPORT" }` → usuario actualizado.

Nota: los endpoints de usuarios quedaron unificados bajo `/api/users` (listado, registro, detalle y cambio de rol), por lo que el frontend ya no usa `/api/auth/users` ni `/api/auth/roles`.

### Verificación de integración:
```bash
npm run check:api                       # contra https://api-incident.onrender.com
npm run check:api -- http://localhost:8081
```
El script `scripts/check-api.mjs` recorre el contrato `/v3/api-docs`, ejecuta todos los endpoints a través de `src/services/api.js` y crea/elimina un ticket temporal para validar el CRUD.

### Credenciales de Prueba:
- **Administrador TI:** `admin` / `admin123`
- **Docente Supervisor:** `supervisor` / `utp2025`
- **Operador NOC:** `operador` / `operador123`

## Despliegue
Al ser una aplicación web estandarizada con Tailwind CSS y Vanilla JS reactivo, puede servirse directamente con cualquier servidor estático (Vercel, Render Static Site, GitHub Pages o Nginx) abriendo simplemente `index.html`.
