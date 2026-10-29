// Verificación de integración frontend <-> API de incidentes.
// Uso: npm run check:api  [-- https://api-incident.onrender.com]
// Recorre el contrato OpenAPI del backend y ejecuta cada endpoint a través
// de la misma capa (src/services/api.js) que usa la aplicación React.
import {
  setApiBaseUrl,
  getIncidents,
  getIncidentById,
  getStats,
  getTotalIncidents,
  getStatsByStatus,
  getStatsBySeverity,
  getStatsByCategory,
  getIncidentCount,
  loginUser,
  getCurrentUser,
  logoutUser,
  registerUser,
  createIncident,
  updateIncidentStatus,
  deleteIncident,
  DEFAULT_RENDER_URL,
} from "../src/services/api.js";

const baseUrl = (process.argv[2] || process.env.API_URL || DEFAULT_RENDER_URL).replace(/\/$/, "");
setApiBaseUrl(baseUrl);

let passed = 0;
let failed = 0;
const failures = [];

async function check(label, fn) {
  try {
    const detail = await fn();
    passed += 1;
    console.log(`PASS  ${label}${detail ? `  ->  ${detail}` : ""}`);
  } catch (err) {
    failed += 1;
    failures.push(label);
    console.log(`FAIL  ${label}  ->  ${err.message}`);
  }
}

function summarize(value) {
  if (Array.isArray(value)) return `${value.length} registros`;
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

console.log(`\nAPI base: ${baseUrl}\n`);

// 1. Contrato OpenAPI
let spec = null;
await check("GET /v3/api-docs (contrato OpenAPI)", async () => {
  const resp = await fetch(`${baseUrl}/v3/api-docs`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  spec = await resp.json();
  return `${Object.keys(spec.paths || {}).length} rutas declaradas`;
});

// 2. Endpoints de solo lectura
let sampleId = null;
await check("GET /api/incidents", async () => {
  const data = await getIncidents();
  if (!Array.isArray(data)) throw new Error("La respuesta no es un arreglo");
  const sample = data.find(i => i && i.id);
  if (sample) sampleId = sample.id;
  return summarize(data);
});

await check("GET /api/incidents/{id}", async () => {
  if (!sampleId) throw new Error("No hay incidentes para consultar");
  const data = await getIncidentById(sampleId);
  return `id=${data.id} ticket=${data.ticketCode || "n/a"}`;
});

await check("GET /api/incidents/stats", async () => summarize(await getStats()));
await check("GET /api/incidents/stats/total", async () => summarize(await getTotalIncidents()));
await check("GET /api/incidents/stats/by-status", async () => summarize(await getStatsByStatus()));
await check("GET /api/incidents/stats/by-severity", async () => summarize(await getStatsBySeverity()));
await check("GET /api/incidents/stats/by-category", async () => summarize(await getStatsByCategory()));
await check("GET /api/incidents/stats/count", async () => summarize(await getIncidentCount()));

// 3. Autenticación
await check("POST /api/auth/login", async () => {
  const data = await loginUser("admin", "admin123");
  if (data.authenticated !== true) throw new Error("authenticated != true");
  return `rol=${data.role} token=${String(data.token).slice(0, 18)}...`;
});

await check("POST /api/auth/login (credenciales inválidas)", async () => {
  try {
    await loginUser("admin", "incorrecta");
  } catch (err) {
    return `rechazado correctamente (${err.message})`;
  }
  throw new Error("El backend aceptó credenciales inválidas");
});

await check("GET /api/auth/me", async () => {
  const me = await getCurrentUser();
  if (me.authenticated === false) throw new Error("Sesión no autenticada");
  return `usuario=${me.username} rol=${me.role}`;
});

await check("POST /api/auth/users (registro)", async () => {
  try {
    const created = await registerUser({
      username: "check.api.user",
      name: "Usuario Check API",
      fullName: "Usuario Check API",
      email: "check.api.user@utp.edu.pe",
      password: "check12345",
      role: "OPERATOR",
    });
    return `id=${created.id || "n/a"} usuario=${created.username}`;
  } catch (err) {
    // Si el usuario ya fue creado por una ejecución previa, el endpoint está operativo.
    if (/ya est. registrado/i.test(err.message)) return "usuario de prueba ya registrado (409 esperado)";
    throw err;
  }
});

// 4. CRUD sobre un ticket temporal (se elimina al final)
let createdId = null;
await check("POST /api/incidents", async () => {
  const created = await createIncident({
    title: "Verificación de integración (temporal)",
    description: "Ticket generado por npm run check:api; se elimina automáticamente.",
    category: "General",
    severity: "Low",
    priority: "Low",
    status: "Active",
    location: "Campus UTP",
    message: "",
  });
  if (!created || !created.id) throw new Error("La respuesta no incluye id");
  createdId = created.id;
  return `id=${created.id} ticket=${created.ticketCode || "n/a"}`;
});

await check("PATCH /api/incidents/{id}/status", async () => {
  if (!createdId) throw new Error("No se creó el ticket temporal");
  const updated = await updateIncidentStatus(createdId, "Inactive", "Cerrado por verificación automatizada");
  if (String(updated.status).toUpperCase() !== "INACTIVE") throw new Error(`status=${updated.status}`);
  return `status=${updated.status}`;
});

await check("DELETE /api/incidents/{id}", async () => {
  if (!createdId) throw new Error("No se creó el ticket temporal");
  await deleteIncident(createdId);
  const remaining = await getIncidents();
  if (remaining.some(i => String(i.id) === String(createdId))) {
    throw new Error(`El ticket ${createdId} sigue apareciendo en el listado`);
  }
  return `id=${createdId} eliminado`;
});

await check("POST /api/auth/logout", async () => {
  const data = await logoutUser();
  return summarize(data);
});

// 5. Cobertura del contrato
console.log("\nCobertura del contrato OpenAPI:");
const expected = [
  "GET /api/incidents",
  "POST /api/incidents",
  "GET /api/incidents/{id}",
  "DELETE /api/incidents/{id}",
  "PATCH /api/incidents/{id}/status",
  "GET /api/incidents/stats",
  "GET /api/incidents/stats/total",
  "GET /api/incidents/stats/by-status",
  "GET /api/incidents/stats/by-severity",
  "GET /api/incidents/stats/by-category",
  "GET /api/incidents/stats/count",
  "POST /api/auth/login",
  "POST /api/auth/users",
  "POST /api/auth/logout",
  "GET /api/auth/me",
];

if (!spec) {
  console.log("  No se pudo leer el contrato; se omite la comparación.");
} else {
  const documented = [];
  const httpMethods = ["get", "post", "put", "patch", "delete", "head", "options"];
  for (const [path, ops] of Object.entries(spec.paths || {})) {
    for (const method of Object.keys(ops)) {
      if (httpMethods.includes(method.toLowerCase())) documented.push(`${method.toUpperCase()} ${path}`);
    }
  }
  const missing = documented.filter(op => !expected.includes(op));
  const extra = expected.filter(op => !documented.includes(op));
  console.log(`  Documentados: ${documented.length} | Cubiertos por el frontend: ${expected.length}`);
  if (missing.length) console.log(`  Sin implementar en el frontend: ${missing.join(", ")}`);
  if (extra.length) console.log(`  En el frontend pero no documentados: ${extra.join(", ")}`);
  if (!missing.length && !extra.length) console.log("  Cobertura completa: todos los endpoints documentados están implementados.");
}

console.log(`\nResultado: ${passed} OK, ${failed} fallidos`);
if (failed) {
  console.log(`Fallidos: ${failures.join(", ")}`);
  process.exitCode = 1;
}
