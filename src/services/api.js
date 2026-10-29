// Servicio de conexión API REST con el Backend (api-incident)
export const DEFAULT_LOCAL_URL = "http://localhost:8081";
export const DEFAULT_RENDER_URL = "https://api-incident.onrender.com";

export function getInitialApiUrl() {
  const stored = localStorage.getItem("utp_api_url");
  if (stored) return stored;
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return DEFAULT_LOCAL_URL;
  }
  return DEFAULT_RENDER_URL;
}

export let API_BASE_URL = getInitialApiUrl();

export function setApiBaseUrl(url) {
  API_BASE_URL = url.replace(/\/$/, "");
  localStorage.setItem("utp_api_url", API_BASE_URL);
}

// 1. Obtener todas las incidencias (GET /api/incidents)
export async function getIncidents() {
  const resp = await fetch(`${API_BASE_URL}/api/incidents`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.json();
}

// 2. Obtener estadísticas consolidadas (GET /api/incidents/stats)
export async function getStats() {
  const resp = await fetch(`${API_BASE_URL}/api/incidents/stats`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.json();
}

// 3. Obtener estadísticas por categoría (GET /api/incidents/stats/by-category)
export async function getStatsByCategory() {
  const resp = await fetch(`${API_BASE_URL}/api/incidents/stats/by-category`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.json();
}

// 4. Detalle de incidente (GET /api/incidents/{id})
export async function getIncidentById(id) {
  const resp = await fetch(`${API_BASE_URL}/api/incidents/${id}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.json();
}

// 5. Crear incidente (POST /api/incidents)
export async function createIncident(data) {
  const resp = await fetch(`${API_BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.json();
}

// 6. Actualizar estado (PATCH /api/incidents/{id}/status)
export async function updateIncidentStatus(id, status, message) {
  const resp = await fetch(`${API_BASE_URL}/api/incidents/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, message })
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.json();
}

// 7. Eliminar incidente (DELETE /api/incidents/{id})
export async function deleteIncident(id) {
  const resp = await fetch(`${API_BASE_URL}/api/incidents/${id}`, {
    method: "DELETE"
  });
  if (!resp.ok && resp.status !== 204) throw new Error(`HTTP ${resp.status}`);
  return true;
}

// 8. Autenticación (POST /api/auth/login)
export async function loginUser(username, password) {
  const resp = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await resp.json();
  if (!resp.ok || !data.authenticated) {
    throw new Error(data.message || "Credenciales incorrectas");
  }
  return data;
}
