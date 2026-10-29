// Servicio de conexión API REST con el Backend (api-incident)
// Contrato verificado contra https://api-incident.onrender.com/v3/api-docs (OpenAPI 3.0.1)
export const DEFAULT_LOCAL_URL = "http://localhost:8081";
export const DEFAULT_RENDER_URL = "https://api-incident.onrender.com";

const TOKEN_KEY = "utp_auth_token";
const REQUEST_TIMEOUT = 20000;

// Almacenamiento en memoria para entornos sin localStorage (Node, pruebas, SSR)
const memoryStorage = new Map();

function hasLocalStorage() {
  return typeof localStorage !== "undefined";
}

function readStorage(key) {
  try {
    if (hasLocalStorage()) return localStorage.getItem(key);
  } catch {
    /* almacenamiento no disponible */
  }
  return memoryStorage.has(key) ? memoryStorage.get(key) : null;
}

function writeStorage(key, value) {
  try {
    if (hasLocalStorage()) localStorage.setItem(key, value);
    else memoryStorage.set(key, value);
  } catch {
    memoryStorage.set(key, value);
  }
}

function removeStorage(key) {
  try {
    if (hasLocalStorage()) localStorage.removeItem(key);
  } catch {
    /* almacenamiento no disponible */
  }
  memoryStorage.delete(key);
}

export function getInitialApiUrl() {
  const stored = readStorage("utp_api_url");
  if (stored) return stored;
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return DEFAULT_LOCAL_URL;
  }
  return DEFAULT_RENDER_URL;
}

export let API_BASE_URL = getInitialApiUrl();

export function setApiBaseUrl(url) {
  API_BASE_URL = url.replace(/\/$/, "");
  writeStorage("utp_api_url", API_BASE_URL);
}

// Token de sesión devuelto por POST /api/auth/login
export function getAuthToken() {
  return readStorage(TOKEN_KEY);
}

function setAuthToken(token) {
  if (token) writeStorage(TOKEN_KEY, token);
  else removeStorage(TOKEN_KEY);
}

// Cliente HTTP centralizado: JSON, timeout, token y mensajes de error del backend.
async function request(path, { method = "GET", body, timeout = REQUEST_TIMEOUT } = {}) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;

  try {
    const headers = { Accept: "application/json" };
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const resp = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller ? controller.signal : undefined,
    });

    const text = await resp.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!resp.ok) {
      const message =
        (data && typeof data === "object" && (data.message || data.error)) ||
        `HTTP ${resp.status}`;
      const error = new Error(message);
      error.status = resp.status;
      error.body = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Tiempo de espera agotado al conectar con la API");
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* ----------------------------- Autenticación ----------------------------- */

// POST /api/auth/login
export async function loginUser(username, password) {
  let data;
  try {
    data = await request("/api/auth/login", {
      method: "POST",
      body: { username, password },
    });
  } catch (err) {
    throw new Error(err.message || "Credenciales incorrectas");
  }

  if (!data || data.authenticated !== true) {
    throw new Error((data && data.message) || "Credenciales incorrectas");
  }

  setAuthToken(data.token);
  return data;
}

// POST /api/users  (registro de usuario, responde 201 Created)
export async function registerUser(data) {
  return await request("/api/users", { method: "POST", body: data });
}

// Roles aceptados por el backend (validados en PATCH /api/users/{id}/role)
export const USER_ROLES = ["ADMIN", "SUPERVISOR", "OPERATOR", "SUPPORT"];

// GET /api/users  (listado de usuarios, solo ADMIN)
export async function getUsers() {
  return await request("/api/users");
}

// GET /api/users/{id}  (detalle de usuario, solo ADMIN)
export async function getUserById(id) {
  return await request(`/api/users/${id}`);
}

// PATCH /api/users/{id}/role  (cambio de rol, solo ADMIN)
export async function updateUserRole(id, role) {
  return await request(`/api/users/${id}/role`, {
    method: "PATCH",
    body: { role },
  });
}

// PATCH /api/users/{id}/password
// - El propio usuario debe enviar currentPassword + newPassword.
// - Un ADMIN puede cambiar la de cualquier usuario enviando solo newPassword.
export async function updateUserPassword(id, { currentPassword, newPassword } = {}) {
  const body = { newPassword };
  if (currentPassword) body.currentPassword = currentPassword;
  return await request(`/api/users/${id}/password`, {
    method: "PATCH",
    body,
  });
}

// DELETE /api/users/{id}  (solo ADMIN, responde 204 No Content)
export async function deleteUser(id) {
  await request(`/api/users/${id}`, { method: "DELETE" });
  return true;
}

// GET /api/auth/me
export async function getCurrentUser() {
  return await request("/api/auth/me");
}

// POST /api/auth/logout
export async function logoutUser() {
  try {
    return await request("/api/auth/logout", { method: "POST" });
  } finally {
    setAuthToken(null);
  }
}

/* ------------------------------ Incidentes ------------------------------- */

// GET /api/incidents
export async function getIncidents() {
  return await request("/api/incidents");
}

// GET /api/incidents/{id}
export async function getIncidentById(id) {
  return await request(`/api/incidents/${id}`);
}

// POST /api/incidents
export async function createIncident(data) {
  return await request("/api/incidents", { method: "POST", body: data });
}

// PATCH /api/incidents/{id}/status
export async function updateIncidentStatus(id, status, message) {
  return await request(`/api/incidents/${id}/status`, {
    method: "PATCH",
    body: { status, message },
  });
}

// PATCH /api/incidents/{id}/priority
export async function updateIncidentPriority(id, priority) {
  return await request(`/api/incidents/${id}/priority`, {
    method: "PATCH",
    body: { priority },
  });
}

// DELETE /api/incidents/{id}  -> 204 No Content
export async function deleteIncident(id) {
  await request(`/api/incidents/${id}`, { method: "DELETE" });
  return true;
}

/* ------------------------------- Métricas -------------------------------- */

// GET /api/incidents/stats
export async function getStats() {
  return await request("/api/incidents/stats");
}

// GET /api/incidents/stats/total
export async function getTotalIncidents() {
  return await request("/api/incidents/stats/total");
}

// GET /api/incidents/stats/by-status
export async function getStatsByStatus() {
  return await request("/api/incidents/stats/by-status");
}

// GET /api/incidents/stats/by-severity
export async function getStatsBySeverity() {
  return await request("/api/incidents/stats/by-severity");
}

// GET /api/incidents/stats/by-category
export async function getStatsByCategory() {
  return await request("/api/incidents/stats/by-category");
}

// GET /api/incidents/stats/count
export async function getIncidentCount() {
  return await request("/api/incidents/stats/count");
}
