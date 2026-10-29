import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getIncidents,
  getStats,
  createIncident,
  updateIncidentStatus,
  deleteIncident,
  getIncidentById,
  loginUser,
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

export default function App() {
  // Estado principal
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, byCategory: {}, bySeverity: {} });
  const [isOnline, setIsOnline] = useState(true);
  const [currentHost, setCurrentHost] = useState(API_BASE_URL);
  const [view, setView] = useState('cards'); // 'cards' | 'table'

  // Filtros
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Active' | 'Inactive'
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Usuario y Autenticación
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('utp_auth_user');
      return stored ? JSON.parse(stored) : { username: 'admin', name: 'Admin TI UTP', role: 'ADMIN' };
    } catch {
      return { username: 'admin', name: 'Admin TI UTP', role: 'ADMIN' };
    }
  });

  // Modales
  const [showLoginModal, setShowLoginModal] = useState(false);
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
  const [customHostInput, setCustomHostInput] = useState(API_BASE_URL);

  // Toast
  const [toast, setToast] = useState({ visible: false, title: '', message: '', isSuccess: true });

  const triggerToast = useCallback((title, message, isSuccess = true) => {
    setToast({ visible: true, title, message, isSuccess });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3500);
  }, []);

  // Carga de datos
  const loadData = useCallback(async () => {
    try {
      const [incidentData, statsData] = await Promise.all([
        getIncidents(),
        getStats().catch(() => null)
      ]);

      const formatted = incidentData.map(item => ({
        id: item.id,
        ticketCode: item.ticketCode || `INC-${1000 + item.id}`,
        title: item.title,
        description: item.description,
        category: item.category || 'General',
        location: item.location || 'Campus UTP',
        status: item.status || 'Active',
        priority: item.priority || item.severity || 'Medium',
        severity: item.severity || item.priority || 'Medium',
        rejectionReason: item.message || '',
        createdAt: item.createdAt || new Date().toISOString(),
      }));

      setIncidents(formatted);
      setIsOnline(true);

      if (statsData) {
        setStats(statsData);
      } else {
        // Fallback local
        const total = formatted.length;
        const active = formatted.filter(i => !i.status || i.status === 'Active' || i.status === 'OPEN').length;
        const byCategory = {};
        formatted.forEach(i => {
          const c = i.category || 'General';
          byCategory[c] = (byCategory[c] || 0) + 1;
        });
        setStats({ total, active, inactive: total - active, byCategory, bySeverity: {} });
      }
    } catch (err) {
      console.error('Error al conectar con la API:', err);
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejo de Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const auth = await loginUser(loginForm.username, loginForm.password);
      setUser(auth);
      localStorage.setItem('utp_auth_user', JSON.stringify(auth));
      setShowLoginModal(false);
      triggerToast('Sesión Iniciada', `Bienvenido ${auth.name} (${auth.role})`);
      loadData();
    } catch (err) {
      // Fallback para testing offline
      if (['admin123', 'utp2025', 'operador123'].includes(loginForm.password)) {
        const fallback = {
          username: loginForm.username,
          name: loginForm.username === 'admin' ? 'Admin TI UTP' : (loginForm.username === 'supervisor' ? 'Docente Miguel Jaeger' : 'Operador NOC'),
          role: loginForm.username === 'admin' ? 'ADMIN' : 'OPERATOR'
        };
        setUser(fallback);
        localStorage.setItem('utp_auth_user', JSON.stringify(fallback));
        setShowLoginModal(false);
        triggerToast('Sesión Iniciada (Offline)', `Bienvenido ${fallback.name}`);
      } else {
        setLoginError(err.message || 'Usuario o contraseña inválidos');
      }
    }
  };

  const handleLogout = () => {
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
    const isActive = !incident.status || incident.status === 'Active' || incident.status === 'OPEN';
    setPatchStatusData({
      id: incident.id,
      ticketCode: incident.ticketCode,
      status: isActive ? 'Active' : 'Inactive',
      message: incident.rejectionReason || ''
    });
    setShowStatusModal(true);
  };

  const handlePatchSubmit = async (e) => {
    e.preventDefault();
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
      const itemActive = !item.status || item.status === 'Active' || item.status === 'OPEN' || item.status === 'IN_PROGRESS';
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

          {/* Host Indicator */}
          <div className="hidden md:flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-surface-container">
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
                  const isActive = !item.status || item.status === 'Active' || item.status === 'OPEN';
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
                      const isActive = !item.status || item.status === 'Active' || item.status === 'OPEN';
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
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-600 text-white">GET</span>
                  <code className="font-mono text-xs font-bold text-on-surface">/api/incidents/stats</code>
                  <span className="text-xs text-emerald-600 font-semibold">200 OK</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Métricas globales: total, activos, inactivos, severidad y categorías.</p>
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
