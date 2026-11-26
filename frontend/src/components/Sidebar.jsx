import React from 'react';

export default function Sidebar({ user, onLogout, onNewRecording, onOpenExport, activeTab, setActiveTab }) {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 bg-surface-container-low flex-col justify-between p-6 z-50 border-r border-outline-variant/30 select-none">
      <div className="flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-[18px]">graphic_eq</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg text-on-surface tracking-tight leading-tight">
                Bitácora IA
              </span>
              <span className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Pasantías Activas
              </span>
            </div>
          </div>
          <div className="p-1 text-primary hover:text-primary-container rounded transition-colors" title="SQLite sincronizado">
            <span className="material-symbols-outlined text-[20px]">cloud_done</span>
          </div>
        </div>

        {/* Quick Voice Dictation CTA */}
        <div className="pt-1">
          <button
            onClick={onNewRecording}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-on-surface text-surface hover:bg-primary-container hover:text-on-primary transition-all duration-200 shadow-sm active:scale-95 group font-medium text-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-primary-fixed group-hover:text-on-primary transition-colors">
              mic
            </span>
            <span>Dictar con IA</span>
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex flex-col gap-1 text-sm font-medium">
          <button
            onClick={() => setActiveTab('bitacora')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors text-left ${
              activeTab === 'bitacora'
                ? 'bg-surface-container-highest text-on-surface font-semibold shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">auto_stories</span>
            <span>Bitácora</span>
          </button>

          <button
            onClick={() => setActiveTab('tareas')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors text-left ${
              activeTab === 'tareas'
                ? 'bg-surface-container-highest text-on-surface font-semibold shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Tareas & Fechas</span>
          </button>

          <button
            onClick={() => setActiveTab('ajustes')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors text-left ${
              activeTab === 'ajustes'
                ? 'bg-surface-container-highest text-on-surface font-semibold shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
            <span>Ajustes de IA</span>
          </button>

          <button
            onClick={onOpenExport}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors text-left"
          >
            <span className="material-symbols-outlined text-[20px] text-primary">description</span>
            <span>Exportar Markdown</span>
          </button>
        </nav>
      </div>

      {/* Bottom Shortcuts & Profile Card */}
      <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant/30">
        <div className="flex flex-col gap-2 p-3 bg-surface-container rounded-xl text-xs text-on-surface-variant">
          <div className="flex items-center justify-between">
            <span>Grabar audio</span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface-container-lowest text-on-surface font-mono shadow-xs">
              Botón Mic
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span>IA Engine</span>
            <span className="text-primary font-medium">Gemini 2.5 Flash</span>
          </div>
        </div>

        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-semibold text-xs shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-on-surface leading-tight truncate">
                {user?.nombre || user?.username || 'Pasante'}
              </span>
              <span className="text-[11px] text-primary flex items-center gap-1 leading-tight font-mono">
                @{user?.username || 'pasante'}
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
            title="Cerrar sesión"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

