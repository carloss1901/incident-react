import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getIncidents,
  getStats,
  getStatsByCategory,
  getStatsByStatus,
  getStatsBySeverity,
  getTotalIncidents,
  getIncidentCount,
  createIncident,
  updateIncidentStatus,
  deleteIncident,
  getIncidentById,
  loginUser,
  logoutUser,
  getCurrentUser,
  getAuthToken,
  registerUser,
  getUsers,
  getUserById,
  updateUserRole,
  USER_ROLES,
  API_BASE_URL,
  setApiBaseUrl,
  DEFAULT_LOCAL_URL,
  DEFAULT_RENDER_URL
} from './services/api';

// Helper de estilos por categoría
const CATEGORY_COLORS = {
  Redes: 'bg-sky-100 text-sky-800 border-sky-200',
  Hardware: 'bg-amber-100 text-amber-800 border-amber-200',
  Software: 'bg-purple-100 text-purple-800 border-purple-200',
  Seguridad: 'bg-rose-100 text-rose-800 border-rose-200',
  Infraestructura: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  General: 'bg-slate-100 text-slate-700 border-slate-200',
};

const ROLE_STYLES = {
  ADMIN: 'bg-primary/10 text-primary border-primary/30',
  SUPERVISOR: 'bg-amber-100 text-amber-800 border-amber-200',
  OPERATOR: 'bg-sky-100 text-sky-800 border-sky-200',
  SUPPORT: 'bg-violet-100 text-violet-800 border-violet-200',
};

// El backend mantiene datos históricos con OPEN/CLOSED y nuevos con Active/Inactive.
const ACTIVE_STATUSES = ['ACTIVE', 'OPEN', 'IN_PROGRESS', 'EN_PROGRESO'];

function normalizeStatus(status) {
  return ACTIVE_STATUSES.includes(String(status || '').toUpperCase()) ? 'Active' : 'Inactive';
}

function normalizePriority(priority) {
  const value = String(priority || 'Medium').toUpperCase();
  if (value === 'CRITICAL' || value === 'CRITICA' || value === 'CRÍTICA') return 'High';
  if (value === 'ALTA') return 'High';
  if (value === 'MEDIA') return 'Medium';
  if (value === 'BAJA') return 'Low';
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function App() {
  // Estado principal
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, byCategory: {}, bySeverity: {}, byStatus: {} });
  const [isOnline, setIsOnline] = useState(true);
  const [currentHost, setCurrentHost] = useState(API_BASE_URL);
  const [view, setView] = useState('cards'); // 'cards' | 'table'
  const [activeView, setActiveView] = useState('incidents'); // 'incidents' | 'users'

  // Filtros
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Active' | 'Inactive'
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Usuario y Autenticación (la sesión se restaura desde localStorage)
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('utp_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Modales
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);

  // Selecciones para modales
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [patchStatusData, setPatchStatusData] = useState({ id: null, status: 'Active', message: '', ticketCode: '' });

  // Formularios
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    category: 'Redes',
    priority: 'High',
    status: 'Active',
    location: 'Lima Centro - Torre Tecnológica',
  });
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'admin123' });
  const [loginError, setLoginError] = useState('');
  const [registerForm, setRegisterForm] = useState({ username: '', name: '', email: '', password: '', role: 'OPERATOR' });
  const [registerError, setRegisterError] = useState('');
  const [customHostInput, setCustomHostInput] = useState(API_BASE_URL);

  // Administración de usuarios (GET /api/auth/users, PATCH /api/auth/users/{id}/role)
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [usersAvailable, setUsersAvailable] = useState(true);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [usersSearch, setUsersSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userDetailError, setUserDetailError] = useState('');

  // Toast
  const [toast, setToast] = useState({ visible: false, title: '', message: '', isSuccess: true });

  const triggerToast = useCallback((title, message, isSuccess = true) => {
    setToast({ visible: true, title, message, isSuccess });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3500);
  }, []);

  // Carga de datos: lista + endpoints de métricas del backend
  const loadData = useCallback(async () => {
    try {
      const [
        incidentData,
        statsResult,
        totalResult,
        statusResult,
        severityResult,
        categoryResult,
        countResult
      ] = await Promise.all([
        getIncidents(),
        getStats().catch(() => null),
        getTotalIncidents().catch(() => null),
        getStatsByStatus().catch(() => null),
        getStatsBySeverity().catch(() => null),
        getStatsByCategory().catch(() => null),
        getIncidentCount().catch(() => null)
      ]);

      const formatted = (incidentData || []).map(item => ({
        id: item.id,
        ticketCode: item.ticketCode || `INC-${1000 + item.id}`,
        title: item.title,
        description: item.description,
        category: item.category || 'General',
        location: item.location || 'Campus UTP',
        status: normalizeStatus(item.status),
        priority: normalizePriority(item.priority || item.severity),
        severity: normalizePriority(item.severity || item.priority),
        rejectionReason: item.message || '',
        createdAt: item.createdAt || new Date().toISOString(),
      }));

      setIncidents(formatted);
      setIsOnline(true);

      const byCategory = categoryResult || (statsResult && statsResult.byCategory) || {};
      const bySeverityRaw = severityResult || (statsResult && statsResult.bySeverity) || {};
      const byStatus = statusResult || (statsResult && statsResult.byStatus) || {};

      // Unifica claves de severidad (HIGH/High, MEDIUM/Medium, ...)
      const bySeverity = {};
      Object.entries(bySeverityRaw).forEach(([key, value]) => {
        const label = normalizePriority(key);
        bySeverity[label] = (bySeverity[label] || 0) + Number(value || 0);
      });

      const statusTotal = Object.values(byStatus).reduce((acc, n) => acc + Number(n || 0), 0);
      const total =
        (totalResult && totalResult.total) ??
        (countResult && countResult.total) ??
        (statsResult && statsResult.total) ??
        formatted.length;

      const active = Object.entries(byStatus).reduce(
        (acc, [key, value]) => (ACTIVE_STATUSES.includes(String(key).toUpperCase()) ? acc + Number(value || 0) : acc),
        0
      );

      const fallbackCategory = {};
      formatted.forEach(i => {
        fallbackCategory[i.category] = (fallbackCategory[i.category] || 0) + 1;
      });
      const fallbackSeverity = {};
      formatted.forEach(i => {
        fallbackSeverity[i.severity] = (fallbackSeverity[i.severity] || 0) + 1;
      });

      const resolvedActive = statusTotal > 0
        ? active
        : ((statsResult && statsResult.active) ?? formatted.filter(i => i.status === 'Active').length);

      setStats({
        total,
        active: resolvedActive,
        inactive: Math.max(total - resolvedActive, 0),
        byCategory: Object.keys(byCategory).length ? byCategory : fallbackCategory,
        bySeverity: Object.keys(bySeverity).length ? bySeverity : fallbackSeverity,
        byStatus,
      });
    } catch (err) {
      console.error('Error al conectar con la API:', err);
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // GET /api/auth/me: valida la sesión guardada al iniciar la aplicación
  useEffect(() => {
    if (!getAuthToken()) return;
    let cancelled = false;
    getCurrentUser()
      .then(me => {
        if (!cancelled && me && me.authenticated !== false) {
          setUser(prev => ({
            username: me.username || (prev && prev.username),
            name: me.name || (prev && prev.name) || me.username,
            role: me.role || (prev && prev.role),
          }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem('utp_auth_user');
          setUser(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isAdmin = Boolean(user && String(user.role || '').toUpperCase() === 'ADMIN');

  // GET /api/auth/users: listado de usuarios para administración
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const data = await getUsers();
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.users) ? data.users : []);
      setUsers(list.map(item => ({
        ...item,
        role: String(item.role || 'OPERATOR').toUpperCase(),
      })));
      setUsersAvailable(true);
    } catch (err) {
      setUsers([]);
      if (err.status === 401) {
        setUsersError('Sesión sin token válido. Vuelve a iniciar sesión como ADMIN para administrar usuarios.');
      } else if (err.status === 404 || err.status === 405) {
        setUsersAvailable(false);
        setUsersError('El backend aún no expone GET /api/users.');
      } else {
        setUsersError(err.message || 'No se pudo obtener el listado de usuarios.');
      }
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === 'users' && isAdmin) loadUsers();
  }, [activeView, isAdmin, loadUsers]);

  // Si la sesión deja de ser ADMIN (logout o expiración), vuelve a incidentes.
  useEffect(() => {
    if (!isAdmin && activeView === 'users') setActiveView('incidents');
  }, [isAdmin, activeView]);

  const handleRoleDraftChange = (id, role) => {
    setRoleDrafts(prev => ({ ...prev, [id]: role }));
  };

  // PATCH /api/auth/users/{id}/role
  const handleSaveRole = async (target) => {
    const role = roleDrafts[target.id] || target.role;
    if (role === target.role) return;
    setSavingRoleId(target.id);
    try {
      const updated = await updateUserRole(target.id, role);
      setUsers(prev => prev.map(item => (item.id === target.id
        ? { ...item, ...(updated && typeof updated === 'object' ? updated : {}), role: (updated && updated.role) || role }
        : item)));
      setRoleDrafts(prev => {
        const next = { ...prev };
        delete next[target.id];
        return next;
      });
      const label = target.name || target.username || `#${target.id}`;
      triggerToast('Rol Actualizado', `PATCH /api/auth/users/${target.id}/role • ${label} → ${role}`);
      if (target.username && user && target.username === user.username) {
        setUser(prev => (prev ? { ...prev, role } : prev));
        localStorage.setItem('utp_auth_user', JSON.stringify({ ...user, role }));
      }
    } catch (err) {
      if (err.status === 404 || err.status === 405) {
        setUsersAvailable(false);
        setUsersError('El backend aún no expone PATCH /api/auth/users/{id}/role.');
      }
      triggerToast('Error al Actualizar Rol', err.message, false);
    } finally {
      setSavingRoleId(null);
    }
  };

  // GET /api/auth/users/{id}: detalle del usuario seleccionado
  const handleOpenUserDetail = async (target) => {
    setSelectedUser(target);
    setShowUserModal(true);
    setUserDetailError('');
    setUserDetailLoading(true);
    try {
      const fresh = await getUserById(target.id);
      if (fresh && typeof fresh === 'object') {
        setSelectedUser({
          ...target,
          ...fresh,
          role: String(fresh.role || target.role || 'OPERATOR').toUpperCase(),
        });
      }
    } catch (err) {
      setUserDetailError(err.message || 'No se pudo cargar el detalle del usuario.');
    } finally {
      setUserDetailLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = usersSearch.trim().toLowerCase();
    return users.filter(item => {
      const matchRole = userRoleFilter === 'ALL' || item.role === userRoleFilter;
      const matchQuery = !q
        || String(item.username || '').toLowerCase().includes(q)
        || String(item.name || item.fullName || '').toLowerCase().includes(q)
        || String(item.email || '').toLowerCase().includes(q);
      return matchRole && matchQuery;
    });
  }, [users, usersSearch, userRoleFilter]);

  // Manejo de Login (POST /api/auth/login)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const auth = await loginUser(loginForm.username, loginForm.password);
      const sessionUser = {
        username: auth.username,
        name: auth.name || auth.username,
        role: auth.role,
        email: auth.email,
      };
      setUser(sessionUser);
      localStorage.setItem('utp_auth_user', JSON.stringify(sessionUser));
      setShowLoginModal(false);
      triggerToast('Sesión Iniciada', `Bienvenido ${sessionUser.name} (${sessionUser.role})`);
      loadData();
    } catch (err) {
      setLoginError(err.message || 'Usuario o contraseña inválidos');
    }
  };

  // Registro de usuarios (POST /api/auth/users)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');
    try {
      const created = await registerUser({
        username: registerForm.username.trim(),
        name: registerForm.name.trim(),
        fullName: registerForm.name.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        role: registerForm.role,
      });
      const username = created.username || registerForm.username.trim();
      setRegisterForm({ username: '', name: '', email: '', password: '', role: 'OPERATOR' });
      if (isAdmin) {
        // Un administrador registra cuentas para terceros: permanece en la vista Usuarios.
        setShowRegisterModal(false);
        triggerToast('Usuario Registrado', `POST /api/auth/users • ${username} (${created.role || registerForm.role})`);
        if (usersAvailable) loadUsers();
      } else {
        setLoginForm({ username, password: registerForm.password });
        setShowRegisterModal(false);
        setShowLoginModal(true);
        triggerToast('Usuario Registrado', `POST /api/auth/users • ${username} (${created.role || registerForm.role})`);
      }
    } catch (err) {
      setRegisterError(err.message || 'No se pudo registrar el usuario');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn('No se pudo cerrar sesión en el backend:', err.message);
    }
    localStorage.removeItem('utp_auth_user');
    setUser(null);
    triggerToast('Sesión Cerrada', 'Has salido del sistema.', false);
    setShowLoginModal(true);
  };

  // Manejo de Creación (POST)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const created = await createIncident({
        title: newIncident.title,
        description: newIncident.description,
        category: newIncident.category,
        severity: newIncident.priority,
        priority: newIncident.priority,
        status: newIncident.status,
        location: newIncident.location,
        message: ''
      });
      setShowCreateModal(false);
      setNewIncident({
        title: '',
        description: '',
        category: 'Redes',
        priority: 'High',
        status: 'Active',
        location: 'Lima Centro - Torre Tecnológica',
      });
      triggerToast('POST /api/incidents Exitoso', `Ticket #${created.ticketCode || created.id} registrado correctamente.`);
      loadData();
    } catch (err) {
      triggerToast('Error al Crear', err.message, false);
    }
  };

  // Manejo de Actualización de Estado (PATCH)
  const handleOpenPatchModal = (incident) => {
    setPatchStatusData({
      id: incident.id,
      ticketCode: incident.ticketCode,
      status: incident.status === 'Active' ? 'Active' : 'Inactive',
      message: incident.rejectionReason || ''
    });
    setShowStatusModal(true);
  };

  const handlePatchSubmit = async (e) => {
    e.preventDefault();
    if (!patchStatusData.id) {
      triggerToast('Error en PATCH', 'No se seleccionó un incidente válido.', false);
      return;
    }
    try {
      await updateIncidentStatus(patchStatusData.id, patchStatusData.status, patchStatusData.message);
      setShowStatusModal(false);
      triggerToast('Estado Actualizado', `PATCH /api/incidents/${patchStatusData.id}/status completado.`);
      loadData();
    } catch (err) {
      triggerToast('Error en PATCH', err.message, false);
    }
  };

  // Manejo de Eliminación (DELETE)
  const handleDelete = async (id, ticketCode, title) => {
    if (!window.confirm(`¿Confirmar eliminación del incidente ${ticketCode} (${title})?\n\nEndpoint: DELETE /api/incidents/${id}`)) {
      return;
    }
    try {
      await deleteIncident(id);
      triggerToast('Incidente Eliminado', `Ticket ${ticketCode} eliminado correctamente.`, false);
      loadData();
    } catch (err) {
      triggerToast('Error al Eliminar', err.message, false);
    }
  };

  // Manejo de Detalle Extendido (GET)
  const handleOpenDetailModal = async (incident) => {
    setSelectedIncident(incident);
    setShowDetailModal(true);
    try {
      const fresh = await getIncidentById(incident.id);
      setSelectedIncident({
        ...fresh,
        ticketCode: fresh.ticketCode || `INC-${1000 + fresh.id}`,
        status: normalizeStatus(fresh.status),
        priority: normalizePriority(fresh.priority || fresh.severity),
        severity: normalizePriority(fresh.severity || fresh.priority),
        rejectionReason: fresh.message || ''
      });
    } catch {
      // Usa el que ya tiene en memoria
    }
  };

  // Cambio de Servidor API
  const handleSaveHost = () => {
    let clean = customHostInput.trim().replace(/\/$/, '');
    if (clean) {
      setApiBaseUrl(clean);
      setCurrentHost(clean);
      setShowHostModal(false);
      triggerToast('Servidor Conectado', `Conectando con ${clean}`);
      loadData();
    }
  };

  // Filtrado reactivo de incidentes
  const filteredIncidents = useMemo(() => {
    return incidents.filter(item => {
      const itemActive = item.status === 'Active';
      const statusVal = itemActive ? 'Active' : 'Inactive';
      const matchStatus = statusFilter === 'ALL' || statusVal === statusFilter;

      const itemPrio = (item.priority || item.severity || 'Medium').toUpperCase();
      const matchPriority = priorityFilter === 'ALL' || itemPrio === priorityFilter.toUpperCase();

      const itemCat = (item.category || 'General').toLowerCase();
      const matchCategory = categoryFilter === 'ALL' || itemCat === categoryFilter.toLowerCase();

      const q = searchQuery.toLowerCase();
      const matchQuery = !q ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.ticketCode && item.ticketCode.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.rejectionReason && item.rejectionReason.toLowerCase().includes(q));

      return matchStatus && matchPriority && matchCategory && matchQuery;
    });
  }, [incidents, statusFilter, priorityFilter, categoryFilter, searchQuery]);

  return (
    <div className="bg-background min-h-screen flex flex-col justify-between font-body-md text-on-surface antialiased">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 w-full px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img alt="UTP" className="h-9 w-auto object-contain" src="https://upload.wikimedia.org/wikipedia/commons/5/50/Utplogonuevo.svg" />
            <div className="flex flex-col">
              <span className="font-headline-sm text-base text-primary tracking-tight font-bold">UTP Incidentes TI</span>
              <span className="font-label-sm text-xs text-on-surface-variant leading-none">Gestión Campus &amp; Infraestructura (React)</span>
            </div>
          </div>

          {/* View Switcher */}
          <nav className="flex items-center bg-surface-container-low rounded-lg p-1 border border-surface-container">
            <button
              onClick={() => setActiveView('incidents')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs transition flex items-center gap-1 ${activeView === 'incidents' ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm' : 'font-medium text-on-surface-variant hover:text-on-surface'}`}
              title="Incidentes"
            >
              <span className="material-symbols-outlined text-base">confirmation_number</span>
              <span className="hidden md:inline">Incidentes</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveView('users')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs transition flex items-center gap-1 ${activeView === 'users' ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm' : 'font-medium text-on-surface-variant hover:text-on-surface'}`}
                title="Usuarios"
              >
                <span className="material-symbols-outlined text-base">manage_accounts</span>
                <span className="hidden md:inline">Usuarios</span>
              </button>
            )}
          </nav>

          {/* Host Indicator */}
          <div className="hidden xl:flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-surface-container">
            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="font-mono text-xs font-medium text-on-surface-variant">
              {currentHost.replace(/^https?:\/\//, '')}
            </span>
            <button onClick={() => setShowHostModal(true)} className="text-xs text-tertiary hover:underline ml-1 font-semibold flex items-center gap-0.5">
              <span className="material-symbols-outlined text-sm">swap_horiz</span> Servidor
            </button>
          </div>

          {/* Right Header: User profile */}
          <div className="flex items-center gap-3">
            <button onClick={loadData} title="Sincronizar" className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition">
              <span className="material-symbols-outlined text-xl">sync</span>
            </button>

            <div
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 pl-2 border-l border-surface-container cursor-pointer hover:opacity-90 transition"
            >
              <div className="hidden sm:flex flex-col text-right">
                <span className="font-label-sm text-xs text-on-surface font-semibold">{user ? user.name : 'Iniciar Sesión'}</span>
                <span className="font-label-sm text-[10px] text-outline leading-none">{user ? `Rol: ${user.role || 'Usuario'}` : 'No autenticado'}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                {user ? user.name.charAt(0).toUpperCase() : '?'}
              </div>
            </div>

            {user && (
              <button onClick={handleLogout} title="Cerrar sesión" className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition">
                <span className="material-symbols-outlined text-lg">logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="w-full pt-20 px-6 max-w-7xl mx-auto flex-1 pb-16">
        <div className="flex flex-col w-full">
          <div className={activeView === 'incidents' ? 'contents' : 'hidden'}>
          {/* Top Status & Docs Bar */}
          <section className="w-full pt-2 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <span className="flex items-center gap-1 font-semibold text-primary">
                  <span className="material-symbols-outlined text-sm">terminal</span>
                  incident-controller
                </span>
                <span>/</span>
                <span className="text-on-surface font-medium">Mesa Operativa Campus</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-[11px] font-mono text-on-surface">
                  /api/incidents
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isOnline ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'}`}>
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`}></span>
                  <span>{isOnline ? 'REST API Conectada • OAS 3.0' : 'Desconectado del Servidor'}</span>
                </div>
                <button
                  onClick={() => setShowDocsModal(true)}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:text-primary shadow-sm hover:shadow transition text-xs font-semibold"
                >
                  <span className="material-symbols-outlined text-sm">code</span>
                  <span>APIs &amp; Docs</span>
                </button>
              </div>
            </div>

            {/* Metric Bento Grid (5 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Tickets */}
              <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 shadow-sm border border-surface-container">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Total Incidentes</span>
                  <span className="p-1 rounded-lg bg-surface-container text-tertiary material-symbols-outlined text-base">dataset</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl text-on-surface font-bold">{stats.total || incidents.length}</span>
                  <span className="text-xs text-emerald-600 font-medium">GET /api/incidents/stats</span>
                </div>
                <div className="mt-2 text-xs text-on-surface-variant flex items-center justify-between">
                  <span>Sincronizado con BD</span>
                  <span className="font-semibold text-on-surface">SQLite / JPA</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-tertiary to-tertiary-container"></div>
              </div>

              {/* Active */}
              <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 shadow-sm border border-surface-container">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Activos / En Atención</span>
                  <span className="p-1 rounded-lg bg-emerald-100 text-emerald-700 material-symbols-outlined text-base">radio_button_checked</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl text-emerald-700 font-bold">{stats.active || 0}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-bold">Active</span>
                </div>
                <div className="mt-2 text-xs text-on-surface-variant flex items-center justify-between">
                  <span>Requieren acción técnica</span>
                  <span className="font-semibold text-emerald-700">
                    {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
              </div>

              {/* Inactive */}
              <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 shadow-sm border border-surface-container">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Inactivos / Cerrados</span>
                  <span className="p-1 rounded-lg bg-surface-container text-outline material-symbols-outlined text-base">task_alt</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl text-on-surface font-bold">{stats.inactive || 0}</span>
                  <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-xs font-bold">Inactive</span>
                </div>
                <div className="mt-2 text-xs text-on-surface-variant flex items-center justify-between">
                  <span>Tickets solucionados</span>
                  <span className="font-semibold text-on-surface">
                    {stats.total > 0 ? Math.round((stats.inactive / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-outline"></div>
              </div>

              {/* Critical / High Priority */}
              <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 shadow-sm border border-surface-container">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Prioridad Alta (High)</span>
                  <span className="p-1 rounded-lg bg-red-100 text-primary material-symbols-outlined text-base">warning</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl text-primary font-bold">
                    {(stats.bySeverity && (stats.bySeverity.High || stats.bySeverity.HIGH)) || incidents.filter(i => (i.priority || '').toUpperCase() === 'HIGH').length}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-primary-container text-on-primary text-xs font-bold">Críticos</span>
                </div>
                <div className="mt-2 text-xs text-on-surface-variant flex items-center justify-between">
                  <span>SLA Campus &lt; 2h</span>
                  <span className="font-semibold text-primary">Atención UTP</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-container"></div>
              </div>

              {/* Campus SLA */}
              <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 shadow-sm border border-surface-container">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Tiempo Promedio</span>
                  <span className="p-1 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed-variant material-symbols-outlined text-base">timer</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl text-on-surface font-bold">1.2<span className="text-lg font-normal">h</span></span>
                  <span className="text-xs text-emerald-600 font-medium">-25% vs meta</span>
                </div>
                <div className="mt-2 text-xs text-on-surface-variant flex items-center justify-between">
                  <span>Resolución de incidentes</span>
                  <span className="font-semibold text-tertiary">Óptimo NOC</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-tertiary"></div>
              </div>
            </div>

            {/* Interactive Category Pills Bar (GET /api/incidents/stats/by-category) */}
            <div className="mt-4 p-3 rounded-xl bg-surface-container-lowest border border-surface-container flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                <span className="material-symbols-outlined text-sm text-primary">category</span>
                <span>Métricas por Categoría (GET /api/incidents/stats/by-category):</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(stats.byCategory || {}).map(([cat, count]) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(categoryFilter === cat ? 'ALL' : cat)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface-container-low hover:bg-surface-container border-surface-container text-on-surface'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${categoryFilter === cat ? 'bg-white text-primary' : 'bg-primary/10 text-primary'}`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Controls & Filters Bar */}
          <section className="w-full mb-4">
            <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm border border-surface-container flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
                {/* Search */}
                <div className="relative w-full sm:max-w-xs">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
                  <input
                    type="text"
                    placeholder="Buscar por ID, título, aula..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-lg bg-surface-container-low text-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-surface-container"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-on-surface-variant hover:text-on-surface">
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  )}
                </div>

                {/* Status Toggle */}
                <div className="w-full sm:w-auto flex items-center bg-surface-container-low rounded-lg p-1 border border-surface-container">
                  {['ALL', 'Active', 'Inactive'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-md text-xs transition ${
                        statusFilter === s
                          ? 'font-semibold bg-surface-container-lowest text-on-surface shadow-sm'
                          : 'font-medium text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {s === 'ALL' ? 'Todos' : s === 'Active' ? 'Activos' : 'Inactivos'}
                    </button>
                  ))}
                </div>

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full sm:w-auto bg-surface-container-low text-xs text-on-surface px-3 py-2 rounded-lg focus:outline-none cursor-pointer border border-surface-container"
                >
                  <option value="ALL">Todas las Categorías</option>
                  <option value="Redes">Redes</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Software">Software</option>
                  <option value="Seguridad">Seguridad</option>
                  <option value="Infraestructura">Infraestructura</option>
                  <option value="General">General</option>
                </select>

                {/* Priority Filter */}
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full sm:w-auto bg-surface-container-low text-xs text-on-surface px-3 py-2 rounded-lg focus:outline-none cursor-pointer border border-surface-container"
                >
                  <option value="ALL">Todas las Prioridades</option>
                  <option value="High">Alta (High)</option>
                  <option value="Medium">Media (Medium)</option>
                  <option value="Low">Baja (Low)</option>
                </select>
              </div>

              {/* View Toggles & Add Button */}
              <div className="flex items-center gap-2 justify-end">
                <div className="flex items-center bg-surface-container-low rounded-lg p-1 border border-surface-container">
                  <button
                    onClick={() => setView('cards')}
                    title="Vista Tarjetas"
                    className={`p-1.5 rounded-md transition ${view === 'cards' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    <span className="material-symbols-outlined text-base">grid_view</span>
                  </button>
                  <button
                    onClick={() => setView('table')}
                    title="Vista Tabla"
                    className={`p-1.5 rounded-md transition ${view === 'table' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    <span className="material-symbols-outlined text-base">format_list_bulleted</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white font-semibold text-sm transition shadow-sm"
                >
                  <span className="material-symbols-outlined text-lg">add_circle</span>
                  <span>Nuevo Incidente</span>
                </button>
              </div>
            </div>
          </section>

          {/* Main Incident Display */}
          <section className="w-full">
            {filteredIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl bg-surface-container-lowest border border-dashed border-surface-container">
                <span className="material-symbols-outlined text-5xl text-outline mb-2">content_paste_off</span>
                <h3 className="font-headline-sm text-base text-on-surface font-semibold">No se encontraron incidentes</h3>
                <p className="text-xs text-on-surface-variant mt-1 max-w-sm">No hay registros que coincidan con los filtros seleccionados.</p>
                <button
                  onClick={() => { setStatusFilter('ALL'); setPriorityFilter('ALL'); setCategoryFilter('ALL'); setSearchQuery(''); }}
                  className="mt-4 px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold"
                >
                  Limpiar Filtros
                </button>
              </div>
            ) : view === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredIncidents.map((item) => {
                  const isActive = item.status === 'Active';
                  const catClass = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General;

                  return (
                    <div key={item.id} className="relative flex flex-col justify-between rounded-xl bg-surface-container-lowest p-4 shadow-sm hover:shadow-md transition border border-surface-container">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <span className="font-mono text-xs font-bold text-primary">{item.ticketCode}</span>
                            <h3
                              onClick={() => handleOpenDetailModal(item)}
                              className="font-headline-sm text-sm text-on-surface font-bold hover:text-primary transition cursor-pointer mt-0.5 line-clamp-1"
                            >
                              {item.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container text-on-surface-variant'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-outline'}`}></span>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold text-white ${item.priority === 'High' ? 'bg-primary' : item.priority === 'Medium' ? 'bg-amber-500' : 'bg-sky-600'}`}>
                              {item.priority}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-on-surface line-clamp-2">
                          <span className="font-semibold text-on-surface-variant">Descripción:</span> {item.description}
                        </div>

                        {item.rejectionReason && (
                          <div className="mt-2.5 p-2 rounded-lg bg-surface-container-low text-xs flex items-start gap-1.5 border border-surface-container">
                            <span className="font-semibold text-on-surface-variant shrink-0">Observaciones:</span>
                            <span className="text-on-surface break-words">{item.rejectionReason}</span>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between text-[11px] text-outline font-mono pt-2 border-t border-surface-container">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${catClass}`}>
                            {item.category}
                          </span>
                          <span className="text-on-surface-variant truncate max-w-[130px]" title={item.location}>
                            {item.location || 'Campus UTP'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-surface-container flex items-center justify-between gap-1">
                        <button
                          onClick={() => handleOpenDetailModal(item)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-tertiary hover:bg-tertiary/10 text-xs font-semibold transition"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                          <span>Detalle</span>
                        </button>
                        <button
                          onClick={() => handleOpenPatchModal(item)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-amber-600 hover:bg-amber-500/10 text-xs font-semibold transition"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                          <span>Estado</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.ticketCode, item.title)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-primary hover:bg-primary/10 text-xs font-semibold transition"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low text-xs uppercase text-on-surface-variant border-b border-surface-container">
                    <tr>
                      <th className="py-3 px-4">Ticket</th>
                      <th className="py-3 px-4">Título &amp; Ubicación</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Prioridad</th>
                      <th className="py-3 px-4">Notas / Resolución</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {filteredIncidents.map((item) => {
                      const isActive = item.status === 'Active';
                      const catClass = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General;

                      return (
                        <tr key={item.id} className="hover:bg-surface-container-low transition">
                          <td className="py-3 px-4 font-mono font-bold text-primary">{item.ticketCode}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-on-surface">{item.title}</div>
                            <div className="text-on-surface-variant text-xs">{item.location || 'Campus UTP'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${catClass}`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container text-on-surface-variant'}`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold text-white ${item.priority === 'High' ? 'bg-primary' : item.priority === 'Medium' ? 'bg-amber-500' : 'bg-sky-600'}`}>
                              {item.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-on-surface-variant text-xs max-w-xs truncate">{item.rejectionReason || '—'}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button onClick={() => handleOpenDetailModal(item)} className="p-1.5 rounded-lg text-tertiary hover:bg-tertiary/10" title="Ver Detalle">
                                <span className="material-symbols-outlined text-base">visibility</span>
                              </button>
                              <button onClick={() => handleOpenPatchModal(item)} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-500/10" title="Editar Estado">
                                <span className="material-symbols-outlined text-base">edit</span>
                              </button>
                              <button onClick={() => handleDelete(item.id, item.ticketCode, item.title)} className="p-1.5 rounded-lg text-primary hover:bg-primary/10" title="Eliminar">
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          </div>

          {activeView === 'users' && (
            <section className="w-full pt-2 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <span className="material-symbols-outlined text-sm">manage_accounts</span>
                    auth-controller
                  </span>
                  <span>/</span>
                  <span className="text-on-surface font-medium">Administración de Usuarios</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-[11px] font-mono text-on-surface">
                    /api/users
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadUsers}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:text-primary shadow-sm text-xs font-semibold"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Recargar
                  </button>
                  <button
                    onClick={() => { setRegisterError(''); setShowRegisterModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base">person_add</span>
                    Registrar Usuario
                  </button>
                </div>
              </div>

              {!isAdmin ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl bg-surface-container-lowest border border-dashed border-surface-container">
                  <span className="material-symbols-outlined text-5xl text-outline mb-2">lock</span>
                  <h3 className="font-headline-sm text-base text-on-surface font-semibold">Acceso restringido</h3>
                  <p className="text-xs text-on-surface-variant mt-1 max-w-sm">Solo un usuario con rol ADMIN puede listar y actualizar roles.</p>
                </div>
              ) : (
                <>
                  {!usersAvailable && (
                    <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
                      <span className="material-symbols-outlined text-amber-600 text-xl">warning</span>
                      <div>
                        <p className="text-sm font-bold text-amber-800">Endpoints de usuarios no disponibles</p>
                        <p className="text-xs text-amber-700 mt-1">
                          La interfaz está lista, pero el backend debe exponer <code className="font-mono">GET /api/users</code> y{' '}
                          <code className="font-mono">PATCH /api/auth/users/{'{id}'}/role</code> para listar y guardar los cambios.
                        </p>
                      </div>
                    </div>
                  )}

                  {usersError && usersAvailable && (
                    <div className="mb-4 p-3 rounded-xl bg-red-100 text-red-700 text-xs font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">error</span>
                      {usersError}
                    </div>
                  )}

                  <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm border border-surface-container mb-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
                      <div className="relative w-full sm:max-w-xs">
                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
                        <input
                          type="text"
                          placeholder="Buscar por usuario, nombre o correo..."
                          value={usersSearch}
                          onChange={(e) => setUsersSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low text-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-surface-container"
                        />
                      </div>
                      <select
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value)}
                        className="w-full sm:w-auto bg-surface-container-low text-xs text-on-surface px-3 py-2 rounded-lg focus:outline-none cursor-pointer border border-surface-container"
                      >
                        <option value="ALL">Todos los Roles</option>
                        {USER_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-xs text-on-surface-variant font-semibold">
                      {filteredUsers.length} de {users.length} usuarios
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-container-low text-xs uppercase text-on-surface-variant border-b border-surface-container">
                        <tr>
                          <th className="py-3 px-4">ID</th>
                          <th className="py-3 px-4">Usuario</th>
                          <th className="py-3 px-4">Nombre / Correo</th>
                          <th className="py-3 px-4">Rol actual</th>
                          <th className="py-3 px-4">Nuevo rol</th>
                          <th className="py-3 px-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container">
                        {usersLoading ? (
                          <tr>
                            <td colSpan={6} className="py-8 px-4 text-center text-xs text-on-surface-variant">Cargando usuarios...</td>
                          </tr>
                        ) : filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 px-4 text-center text-xs text-on-surface-variant">
                              {users.length === 0 ? 'No se pudieron cargar usuarios desde el backend.' : 'No hay usuarios que coincidan con los filtros.'}
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map(item => {
                            const currentRole = item.role;
                            const draftRole = roleDrafts[item.id] || currentRole;
                            const isSelf = Boolean(user && item.username === user.username);
                            const changed = draftRole !== currentRole;
                            const badge = ROLE_STYLES[currentRole] || ROLE_STYLES.OPERATOR;

                            return (
                              <tr key={item.id} className="hover:bg-surface-container-low transition">
                                <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">{item.id}</td>
                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => handleOpenUserDetail(item)}
                                    className="font-bold text-on-surface hover:text-primary transition flex items-center gap-1.5"
                                    title="Ver detalle (GET /api/auth/users/{id})"
                                  >
                                    {item.username}
                                    {isSelf && <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-semibold text-on-surface-variant">Tú</span>}
                                  </button>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-on-surface text-xs font-semibold">{item.name || item.fullName || '—'}</div>
                                  <div className="text-on-surface-variant text-xs">{item.email || '—'}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${badge}`}>
                                    {currentRole}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <select
                                    value={draftRole}
                                    disabled={isSelf || savingRoleId === item.id}
                                    onChange={(e) => handleRoleDraftChange(item.id, e.target.value)}
                                    className="bg-surface-container-low text-xs text-on-surface px-2 py-1.5 rounded-lg border border-surface-container focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                                    title={isSelf ? 'No puede cambiar su propio rol' : 'Seleccione el nuevo rol'}
                                  >
                                    {USER_ROLES.map(role => (
                                      <option key={role} value={role}>{role}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => handleSaveRole(item)}
                                    disabled={!changed || isSelf || savingRoleId === item.id || !usersAvailable}
                                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-container"
                                  >
                                    {savingRoleId === item.id ? 'Guardando...' : 'Aplicar'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-on-surface-variant mt-3">
                    Listado: <code className="font-mono">GET /api/users</code> · Actualización: <code className="font-mono">PATCH /api/auth/users/{'{id}'}/role</code> con cuerpo <code className="font-mono">{'{ "role": "ADMIN | SUPERVISOR | OPERATOR | SUPPORT" }'}</code>.
                  </p>
                </>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Floating Toast */}
      {toast.visible && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-lowest shadow-xl max-w-md border border-surface-container transition-all">
          <div className={`p-2 rounded-lg flex items-center justify-center ${toast.isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            <span className="material-symbols-outlined text-xl">{toast.isSuccess ? 'check_circle' : 'error'}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-sm text-on-surface font-bold">{toast.title}</span>
            <span className="font-body-sm text-xs text-on-surface-variant">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Modal: Login */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-2xl flex flex-col border border-surface-container">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary text-white">
                  <span className="material-symbols-outlined text-2xl">lock</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-lg text-on-surface font-bold">Autenticación UTP TI</h2>
                  <p className="text-xs text-on-surface-variant">POST /api/auth/login • Mesa Operativa</p>
                </div>
              </div>
              <button onClick={() => setShowLoginModal(false)} className="p-1 rounded-full hover:bg-surface-container-low text-on-surface-variant">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="py-4 space-y-4">
              {loginError && (
                <div className="p-3 rounded-lg bg-red-100 text-red-700 text-xs font-semibold">{loginError}</div>
              )}

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Usuario o Correo Institucional</label>
                <input
                  type="text"
                  required
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-sm text-on-surface border border-surface-container focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-sm text-on-surface border border-surface-container focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-surface-container">
                <span className="block text-[11px] font-semibold text-on-surface-variant mb-1.5 uppercase">Cuentas Pre-configuradas UTP:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setLoginForm({ username: 'admin', password: 'admin123' })} className="px-2 py-1 rounded bg-white hover:bg-surface-container text-[11px] font-medium border border-surface-container text-on-surface">Admin (admin123)</button>
                  <button type="button" onClick={() => setLoginForm({ username: 'supervisor', password: 'utp2025' })} className="px-2 py-1 rounded bg-white hover:bg-surface-container text-[11px] font-medium border border-surface-container text-on-surface">Supervisor (utp2025)</button>
                  <button type="button" onClick={() => setLoginForm({ username: 'operador', password: 'operador123' })} className="px-2 py-1 rounded bg-white hover:bg-surface-container text-[11px] font-medium border border-surface-container text-on-surface">Operador (operador123)</button>
                </div>
              </div>

              <button type="submit" className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-container text-white font-bold text-sm shadow-md transition">
                Iniciar Sesión
              </button>

              <button
                type="button"
                onClick={() => { setLoginError(''); setShowLoginModal(false); setShowRegisterModal(true); }}
                className="w-full py-2 rounded-lg border border-surface-container text-on-surface-variant hover:text-primary hover:border-primary text-xs font-semibold transition"
              >
                ¿No tienes cuenta? Registrar usuario
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registro de Usuario (POST /api/auth/users) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-2xl flex flex-col border border-surface-container">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary text-white">
                  <span className="material-symbols-outlined text-2xl">person_add</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-lg text-on-surface font-bold">Registrar Usuario TI</h2>
                  <p className="text-xs text-on-surface-variant">POST /api/auth/users • Mesa Operativa</p>
                </div>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="p-1 rounded-full hover:bg-surface-container-low text-on-surface-variant">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="py-4 space-y-3">
              {registerError && (
                <div className="p-3 rounded-lg bg-red-100 text-red-700 text-xs font-semibold">{registerError}</div>
              )}

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Usuario <span className="text-primary">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="ej. operador.noc"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-sm text-on-surface border border-surface-container focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Nombre completo</label>
                <input
                  type="text"
                  placeholder="ej. Operador NOC Campus"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-sm text-on-surface border border-surface-container focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Correo institucional</label>
                <input
                  type="email"
                  placeholder="ej. usuario@utp.edu.pe"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-sm text-on-surface border border-surface-container focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Contraseña <span className="text-primary">*</span></label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-sm text-on-surface border border-surface-container focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Rol</label>
                  <select
                    value={registerForm.role}
                    onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-surface-container focus:outline-none cursor-pointer"
                  >
                    {USER_ROLES.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-container flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowRegisterModal(false); setShowLoginModal(true); }}
                  className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold"
                >
                  Volver
                </button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-md transition">
                  Registrar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear Incidente */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl rounded-2xl bg-surface-container-lowest p-6 shadow-2xl flex flex-col border border-surface-container">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary text-white">
                  <span className="material-symbols-outlined text-xl">add_alert</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-lg text-on-surface font-bold">Registrar Incidente TI</h2>
                  <p className="text-xs text-on-surface-variant">POST /api/incidents • Mesa de Servicio UTP</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full hover:bg-surface-container-low text-on-surface-variant">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Título del Incidente <span className="text-primary">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="ej. Falla en Access Point Piso 3 Pabellón B"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-sm text-on-surface border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Descripción Técnica <span className="text-primary">*</span></label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detalles del equipo, usuario impactado o fallo..."
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-sm text-on-surface border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Categoría</label>
                  <select
                    value={newIncident.category}
                    onChange={(e) => setNewIncident({ ...newIncident, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-surface-container focus:outline-none cursor-pointer"
                  >
                    <option value="Redes">Redes</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Seguridad">Seguridad</option>
                    <option value="Infraestructura">Infraestructura</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Prioridad</label>
                  <select
                    value={newIncident.priority}
                    onChange={(e) => setNewIncident({ ...newIncident, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-surface-container focus:outline-none cursor-pointer"
                  >
                    <option value="High">High (Crítico)</option>
                    <option value="Medium">Medium (Medio)</option>
                    <option value="Low">Low (Bajo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Estado</label>
                  <select
                    value={newIncident.status}
                    onChange={(e) => setNewIncident({ ...newIncident, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-surface-container focus:outline-none cursor-pointer"
                  >
                    <option value="Active">Active (En atención)</option>
                    <option value="Inactive">Inactive (Cerrado)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Sede / Ubicación UTP</label>
                <input
                  type="text"
                  value={newIncident.location}
                  onChange={(e) => setNewIncident({ ...newIncident, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-sm text-on-surface border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="pt-3 border-t border-surface-container flex items-center justify-end gap-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-md transition">Enviar POST Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Estado */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest p-6 shadow-2xl flex flex-col border border-surface-container">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                  <span className="material-symbols-outlined text-xl">edit_note</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-base text-on-surface font-bold">Actualizar Estado</h2>
                  <p className="text-xs text-on-surface-variant">PATCH /api/incidents/{patchStatusData.id}/status • {patchStatusData.ticketCode}</p>
                </div>
              </div>
              <button onClick={() => setShowStatusModal(false)} className="p-1 rounded-full hover:bg-surface-container-low text-on-surface-variant">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handlePatchSubmit} className="py-4 space-y-4">
              <div>
                <span className="block text-xs font-semibold text-on-surface mb-2">Seleccionar Nuevo Estado:</span>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`cursor-pointer flex items-center gap-2 p-3 rounded-xl border transition ${patchStatusData.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500' : 'bg-surface-container-low border-surface-container'}`}>
                    <input
                      type="radio"
                      name="statusChoice"
                      value="Active"
                      checked={patchStatusData.status === 'Active'}
                      onChange={() => setPatchStatusData({ ...patchStatusData, status: 'Active' })}
                      className="accent-emerald-600"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-emerald-800">Active</span>
                      <span className="text-[11px] text-on-surface-variant">En curso / Atención</span>
                    </div>
                  </label>
                  <label className={`cursor-pointer flex items-center gap-2 p-3 rounded-xl border transition ${patchStatusData.status === 'Inactive' ? 'bg-slate-200 border-slate-400' : 'bg-surface-container-low border-surface-container'}`}>
                    <input
                      type="radio"
                      name="statusChoice"
                      value="Inactive"
                      checked={patchStatusData.status === 'Inactive'}
                      onChange={() => setPatchStatusData({ ...patchStatusData, status: 'Inactive' })}
                      className="accent-slate-700"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">Inactive</span>
                      <span className="text-[11px] text-on-surface-variant">Solucionado / Cerrado</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Razones del rechazo / Notas de resolución</label>
                <textarea
                  rows={3}
                  value={patchStatusData.message}
                  onChange={(e) => setPatchStatusData({ ...patchStatusData, message: e.target.value })}
                  placeholder="ej. Resuelto tras reemplazo de cable de red..."
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-sm text-on-surface border border-surface-container focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="pt-3 border-t border-surface-container flex items-center justify-end gap-2">
                <button type="button" onClick={() => setShowStatusModal(false)} className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition">Ejecutar PATCH</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detalle */}
      {showDetailModal && selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl rounded-2xl bg-surface-container-lowest p-6 shadow-2xl flex flex-col border border-surface-container">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed-variant">
                  <span className="material-symbols-outlined text-xl">info</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-base text-on-surface font-bold">{selectedIncident.ticketCode} (ID: {selectedIncident.id})</h2>
                  <p className="text-xs text-on-surface-variant">Detalle inspeccionado vía GET /api/incidents/{selectedIncident.id}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1 rounded-full hover:bg-surface-container-low text-on-surface-variant">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div>
                <span className="text-xs uppercase text-on-surface-variant font-semibold">Título</span>
                <h3 className="font-headline-sm text-sm text-on-surface font-bold mt-0.5">{selectedIncident.title}</h3>
              </div>

              <div>
                <span className="text-xs uppercase text-on-surface-variant font-semibold">Descripción Técnica</span>
                <p className="text-xs text-on-surface mt-0.5 p-3 rounded-lg bg-surface-container-low border border-surface-container">{selectedIncident.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[11px] uppercase text-on-surface-variant font-semibold">Categoría</span>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${CATEGORY_COLORS[selectedIncident.category] || CATEGORY_COLORS.General}`}>
                      {selectedIncident.category}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] uppercase text-on-surface-variant font-semibold">Estado</span>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                      {selectedIncident.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] uppercase text-on-surface-variant font-semibold">Prioridad</span>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary text-white">
                      {selectedIncident.priority}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs uppercase text-on-surface-variant font-semibold">Observaciones / Notas de Cierre</span>
                <p className="text-xs text-on-surface mt-0.5 p-3 rounded-lg bg-surface-container-low border border-surface-container">
                  {selectedIncident.rejectionReason || 'Ninguna observación registrada.'}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-container-low flex flex-col gap-1 text-[11px] text-on-surface-variant border border-surface-container font-mono">
                <span>Registrado: {selectedIncident.createdAt}</span>
                <span>Ubicación: {selectedIncident.location || 'Campus UTP Central'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-surface-container flex justify-end">
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold">Cerrar Detalle</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalle de Usuario (GET /api/auth/users/{id}) */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-2xl flex flex-col border border-surface-container">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold">
                  {String(selectedUser.username || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-headline-md text-base text-on-surface font-bold">{selectedUser.username}</h2>
                  <p className="text-xs text-on-surface-variant">GET /api/auth/users/{selectedUser.id}</p>
                </div>
              </div>
              <button onClick={() => setShowUserModal(false)} className="p-1 rounded-full hover:bg-surface-container-low text-on-surface-variant">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3">
              {userDetailLoading && (
                <div className="p-3 rounded-lg bg-surface-container-low text-xs text-on-surface-variant">Cargando detalle...</div>
              )}
              {userDetailError && (
                <div className="p-3 rounded-lg bg-red-100 text-red-700 text-xs font-semibold">{userDetailError}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] uppercase text-on-surface-variant font-semibold">ID</span>
                  <p className="text-sm text-on-surface font-mono mt-0.5">{selectedUser.id}</p>
                </div>
                <div>
                  <span className="text-[11px] uppercase text-on-surface-variant font-semibold">Rol</span>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${ROLE_STYLES[selectedUser.role] || ROLE_STYLES.OPERATOR}`}>
                      {selectedUser.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] uppercase text-on-surface-variant font-semibold">Nombre</span>
                  <p className="text-xs text-on-surface mt-0.5">{selectedUser.name || selectedUser.fullName || '—'}</p>
                </div>
                <div>
                  <span className="text-[11px] uppercase text-on-surface-variant font-semibold">Correo</span>
                  <p className="text-xs text-on-surface mt-0.5 break-all">{selectedUser.email || '—'}</p>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase text-on-surface-variant font-semibold">Registrado</span>
                <p className="text-xs text-on-surface font-mono mt-0.5">{selectedUser.createdAt || '—'}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-surface-container flex justify-end">
              <button onClick={() => setShowUserModal(false)} className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Docs */}
      {showDocsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl bg-surface-container-lowest p-6 shadow-2xl flex flex-col border border-surface-container overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary text-white">
                  <span className="material-symbols-outlined text-xl">api</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-base text-on-surface font-bold">Catálogo de Endpoints REST UTP</h2>
                  <p className="text-xs text-on-surface-variant">Spring Boot 3 + OpenAPI 3.0</p>
                </div>
              </div>
              <button onClick={() => setShowDocsModal(false)} className="p-1 rounded-full hover:bg-surface-container-low text-on-surface-variant">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3 overflow-y-auto max-h-[60vh] pr-1">
              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-primary text-white">POST</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/auth/login</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Autenticación de operadores y administradores TI (Token / Sesión).</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-600 text-white">POST</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/auth/users</code>
                  <span className="text-xs text-emerald-600 font-semibold">201 Created</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Registro de usuarios con usuario, nombre, correo, contraseña y rol.</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-600 text-white">GET</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/users</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Listado de usuarios para el panel de administración (requiere token ADMIN).</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-600 text-white">GET</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/auth/users/{'{id}'}</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Detalle de un usuario por su identificador.</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-amber-500 text-white">PATCH</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/auth/users/{'{id}'}/role</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Actualización del rol de un usuario (ADMIN, SUPERVISOR, OPERATOR o SUPPORT).</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-600 text-white">GET</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/auth/me</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Valida el token activo y devuelve el usuario autenticado.</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-600 text-white">POST</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/auth/logout</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Invalida la sesión del usuario y limpia el token local.</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-600 text-white">GET</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/incidents</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Listado completo de incidentes registrados en la base de datos.</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-600 text-white">GET</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/incidents/{'{id}'}</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Detalle de un incidente por su identificador.</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-600 text-white">GET</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/incidents/stats</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Métricas globales: total, activos, inactivos, severidad y categorías.</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-600 text-white">GET</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/incidents/stats/total</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Total de incidentes registrados.</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-600 text-white">GET</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/incidents/stats/by-status</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Conteo de incidentes agrupado por estado.</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-600 text-white">GET</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/incidents/stats/by-severity</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Conteo de incidentes agrupado por severidad.</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-600 text-white">GET</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/incidents/stats/by-category</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Total de incidencias agrupadas por categoría (Redes, Hardware, etc.).</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-600 text-white">POST</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/incidents</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Creación de ticket con título, descripción, severidad, categoría y ubicación.</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-amber-500 text-white">PATCH</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/incidents/{'{id}'}/status</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Actualiza estado (Active / Inactive) y notas de rechazo o resolución.</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-red-600 text-white">DELETE</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/incidents/{'{id}'}</code>
                  <span className="text-xs text-emerald-600 font-semibold">204 No Content</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Elimina permanentemente un incidente en la base de datos.</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-600 text-white">GET</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/incidents/stats/count</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Cantidad total de incidentes (alias de stats/total).</p>
              </div>
            </div>

            <div className="pt-3 border-t border-surface-container flex justify-end">
              <button onClick={() => setShowDocsModal(false)} className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold">Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cambiar Servidor */}
      {showHostModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-2xl flex flex-col border border-surface-container">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-xl">dns</span>
                <h2 className="font-headline-md text-base text-on-surface font-bold">Configuración de Servidor Backend</h2>
              </div>
              <button onClick={() => setShowHostModal(false)} className="p-1 rounded-full hover:bg-surface-container-low text-on-surface-variant">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3">
              <label className="block text-xs font-semibold text-on-surface">URL Base de la API:</label>
              <input
                type="text"
                value={customHostInput}
                onChange={(e) => setCustomHostInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-sm font-mono text-on-surface border border-surface-container focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setCustomHostInput(DEFAULT_LOCAL_URL)} className="flex-1 py-1.5 px-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-xs font-semibold text-on-surface">Local (8081)</button>
                <button type="button" onClick={() => setCustomHostInput('http://localhost:8080')} className="flex-1 py-1.5 px-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-xs font-semibold text-on-surface">Local (8080)</button>
                <button type="button" onClick={() => setCustomHostInput(DEFAULT_RENDER_URL)} className="flex-1 py-1.5 px-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-xs font-semibold text-on-surface">Render Prod</button>
              </div>
            </div>

            <div className="pt-2 border-t border-surface-container flex justify-end gap-2">
              <button onClick={handleSaveHost} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-bold">Guardar y Reconectar</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-surface-container-lowest border-t border-surface-container py-6">
        <div className="w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
          <div className="flex items-center gap-3">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/50/Utplogonuevo.svg" alt="UTP Logo" className="h-6 w-auto object-contain" />
            <span>© 2026 Universidad Tecnológica del Perú • Mesa Operativa de Incidentes TI (React)</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Mesa de Ayuda UTP</span>
            <span>•</span>
            <span>Soporte NOC Campus</span>
            <span>•</span>
            <span className={`font-mono font-semibold ${isOnline ? 'text-emerald-600' : 'text-error'}`}>
              {isOnline ? `Online: ${currentHost.replace(/^https?:\/\//, '')}` : 'Desconectado'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
