import React, { useState, useEffect } from 'react';
import { authFetch } from './utils/api.js';
import Login from './components/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import VoiceRecorder from './components/VoiceRecorder.jsx';
import EntryCard from './components/EntryCard.jsx';
import RightRail from './components/RightRail.jsx';
import ExportModal from './components/ExportModal.jsx';
import TareasView from './components/TareasView.jsx';
import AjustesView from './components/AjustesView.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [entradas, setEntradas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bitacora');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('todos');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showMobileRecorder, setShowMobileRecorder] = useState(false);

  // Comprobar sesión al cargar la app
  useEffect(() => {
    checkAuthSession();
  }, []);

  const checkAuthSession = async () => {
    const token = localStorage.getItem('bitacora_token');
    const savedUser = localStorage.getItem('bitacora_user');

    if (!token) {
      setIsAuthChecking(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        fetchEntradas();
      } else {
        localStorage.removeItem('bitacora_token');
        localStorage.removeItem('bitacora_user');
      }
    } catch {
      // Si el backend no responde de inmediato pero hay un usuario guardado localmente, permitir acceso offline
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          fetchEntradas();
        } catch {
          // fallback
        }
      }
    } finally {
      setIsAuthChecking(false);
    }
  };

  const handleLoginSuccess = (userData, token) => {
    setUser(userData);
    fetchEntradas();
  };

  const handleLogout = () => {
    localStorage.removeItem('bitacora_token');
    localStorage.removeItem('bitacora_user');
    setUser(null);
  };

  const fetchEntradas = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await authFetch('/api/entradas');
      const data = await res.json();
      if (data.success) {
        setEntradas(data.data || []);
      }
    } catch (err) {
      console.error('Error cargando entradas:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Sincronización en tiempo real entre PC y Móvil (sin parpadeos de carga)
  useEffect(() => {
    if (!user) return;
    const handleFocus = () => {
      fetchEntradas(true);
    };
    window.addEventListener('focus', handleFocus);
    const interval = setInterval(() => fetchEntradas(true), 45000); // Polling suave cada 45s
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [user]);

  const handleEntryCreated = (newEntry) => {
    setEntradas((prev) => [newEntry, ...prev]);
    setShowMobileRecorder(false);
  };

  const handleEntryDeleted = (deletedId) => {
    setEntradas((prev) => prev.filter((e) => e.id !== deletedId));
  };

  // Filtrado de entradas por búsqueda
  const filteredEntradas = entradas.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const tituloMatch = (e.titulo || '').toLowerCase().includes(q);
    const actividadesMatch = Array.isArray(e.actividades)
      ? e.actividades.some((a) => a.toLowerCase().includes(q))
      : (e.actividades || '').toLowerCase().includes(q);
    const techMatch = Array.isArray(e.tecnologias_usadas)
      ? e.tecnologias_usadas.some((t) => t.toLowerCase().includes(q))
      : false;
    return tituloMatch || actividadesMatch || techMatch;
  });

  const currentDateFormatted = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-primary gap-3">
        <span className="material-symbols-outlined text-[36px] animate-spin">progress_activity</span>
        <span className="text-xs font-mono text-on-surface-variant">Iniciando bitácora segura...</span>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans flex flex-col">
      {/* Desktop Sidebar (Stitch layout) */}
      <Sidebar
        user={user}
        onLogout={handleLogout}
        onNewRecording={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenExport={() => setIsExportOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Wrapper: Left padding for desktop sidebar */}
      <div className="lg:pl-72 flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 w-full z-40 pt-safe bg-surface/90 backdrop-blur-md border-b border-outline-variant/30">
          <div className="h-14 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shrink-0">
                <span className="material-symbols-outlined text-[16px]">graphic_eq</span>
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="font-semibold text-sm text-on-surface truncate">Bitácora de Pasantías</h1>
                <span className="text-[10px] text-primary font-mono truncate">@{user.username}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsExportOpen(true)}
                className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container"
                title="Exportar Markdown"
              >
                <span className="material-symbols-outlined text-[20px]">description</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/40"
                title="Cerrar sesión"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-12">
          {activeTab === 'bitacora' && (
            <>
              {/* Desktop Top Header (Stitch Editorial style) */}
              <div className="hidden lg:flex flex-col gap-1 mb-8">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-on-surface-variant font-medium">
                  <span>{currentDateFormatted}</span>
                  <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                  <span className="text-primary flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    Registro de Actividades
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 mt-1">
                  <h1 className="text-3xl font-semibold text-on-surface tracking-tight">
                    Bitácora de Pasantías
                  </h1>
                  {/* Quick Search */}
                  <div className="relative w-72">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-on-surface-variant">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Buscar en actividades o stack..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Voice Prompt & Dictation Hero (Stitch Ambient Card) */}
              <div className="mb-8" id="voice-hero">
                <VoiceRecorder onEntryCreated={handleEntryCreated} />
              </div>

              {/* Master 2-Column Layout: Editorial Stream + AI Right Rail */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Primary Journal Stream (8 cols) */}
                <div className="lg:col-span-8 flex flex-col gap-6 min-w-0">
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Historial de Jornadas
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-xs font-mono text-on-surface-variant">
                        {filteredEntradas.length}
                      </span>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-3">
                      <span className="material-symbols-outlined text-[32px] text-primary animate-spin">
                        progress_activity
                      </span>
                      <p className="text-sm">Cargando bitácora local...</p>
                    </div>
                  ) : filteredEntradas.length === 0 ? (
                    <div className="bg-surface-container-lowest rounded-2xl p-10 text-center border border-dashed border-outline-variant/50 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-surface-container mx-auto flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[24px]">mic</span>
                      </div>
                      <h3 className="font-semibold text-base text-on-surface">
                        {searchQuery ? 'No se encontraron resultados' : 'Aún no tienes registros guardados'}
                      </h3>
                      <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                        {searchQuery
                          ? 'Intenta con otro término de búsqueda o limpia el filtro.'
                          : 'Presiona el botón de micrófono arriba y describe lo que hiciste hoy. Gemini lo estructurará automáticamente.'}
                      </p>
                    </div>
                  ) : (
                    filteredEntradas.map((entrada) => (
                      <EntryCard key={entrada.id} entrada={entrada} onDelete={handleEntryDeleted} />
                    ))
                  )}
                </div>

                {/* Right Rail (4 cols) */}
                <div className="lg:col-span-4">
                  <RightRail entradas={entradas} onOpenExport={() => setIsExportOpen(true)} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'tareas' && <TareasView />}

          {activeTab === 'ajustes' && <AjustesView user={user} />}
        </main>

        {/* Mobile Bottom Navigation Bar (Stitch PWA style) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-outline-variant/30 pb-safe">
          <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
            <button
              onClick={() => setActiveTab('bitacora')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
                activeTab === 'bitacora' ? 'text-primary font-semibold' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">auto_stories</span>
              <span className="text-[10px]">Bitácora</span>
            </button>

            {/* Central Big Mic Action Button */}
            <button
              onClick={() => {
                setActiveTab('bitacora');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-12 h-12 -mt-4 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md active:scale-95 transition-all"
              aria-label="Grabar audio"
            >
              <span className="material-symbols-outlined text-[26px]">mic</span>
            </button>

            <button
              onClick={() => setActiveTab('tareas')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
                activeTab === 'tareas' ? 'text-primary font-semibold' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">check_circle</span>
              <span className="text-[10px]">Tareas</span>
            </button>

            <button
              onClick={() => setActiveTab('ajustes')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
                activeTab === 'ajustes' ? 'text-primary font-semibold' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">tune</span>
              <span className="text-[10px]">Ajustes</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Export Markdown Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}

