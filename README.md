# UTP Incident Operations UI

Frontend para el sistema de Mesa Operativa e Infraestructura TI de la Universidad Tecnológica del Perú (UTP).

## Conexión con Backend (`api-incident`)

Este frontend se comunica directamente con la API REST de incidentes (por defecto `http://localhost:8081` en desarrollo y `https://api-incident.onrender.com` en producción).

### Endpoints Consumidos:
- **Autenticación:**
  - `POST /api/auth/login`: Validación de credenciales de operadores y administradores TI.
- **Métricas y Estadísticas:**
  - `GET /api/incidents/stats`: Total general, activos, inactivos y desglose por severidad.
  - `GET /api/incidents/stats/by-category`: Conteo dinámico agrupado por categorías (Redes, Hardware, Software, Seguridad, Infraestructura).
- **Gestión de Incidentes (CRUD):**
  - `GET /api/incidents`: Listado de todos los tickets.
  - `GET /api/incidents/{id}`: Detalle de incidente por ID.
  - `POST /api/incidents`: Creación de nuevo incidente con categoría, prioridad, ubicación y estado.
  - `PATCH /api/incidents/{id}/status`: Actualización de estado y notas de resolución/rechazo.
  - `DELETE /api/incidents/{id}`: Eliminación de tickets.

### Credenciales de Prueba:
- **Administrador TI:** `admin` / `admin123`
- **Docente Supervisor:** `supervisor` / `utp2025`
- **Operador NOC:** `operador` / `operador123`

## Despliegue
Al ser una aplicación web estandarizada con Tailwind CSS y Vanilla JS reactivo, puede servirse directamente con cualquier servidor estático (Vercel, Render Static Site, GitHub Pages o Nginx) abriendo simplemente `index.html`.
