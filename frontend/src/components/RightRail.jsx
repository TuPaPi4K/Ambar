import React from 'react';

export default function RightRail({ entradas, onOpenExport }) {
  const totalHoras = entradas.reduce((acc, curr) => acc + (Number(curr.horas_trabajadas) || 0), 0);
  
  const techMap = {};
  entradas.forEach(e => {
    if (Array.isArray(e.tecnologias_usadas)) {
      e.tecnologias_usadas.forEach(t => {
        techMap[t] = (techMap[t] || 0) + 1;
      });
    }
  });

  const sortedTechs = Object.entries(techMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <aside aria-label="Resumen Diario IA" className="hidden lg:flex flex-col gap-6 sticky top-24 w-80 shrink-0">
      {/* Summary Digest Card (Stitch Right Rail) */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-5">
        <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            </div>
            <h3 className="font-semibold text-base text-on-surface">Métricas Pasantía</h3>
          </div>
          <span className="text-[11px] font-medium text-primary">En vivo</span>
        </div>

        {/* Micro Analytics Metric Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-surface-container-low rounded-xl flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant">Horas Acumuladas</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold text-on-surface">{totalHoras.toFixed(1)}</span>
              <span className="text-xs text-primary font-medium">hrs</span>
            </div>
            <span className="text-[11px] text-on-surface-variant">Total registrado</span>
          </div>

          <div className="p-3 bg-surface-container-low rounded-xl flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant">Días Logueados</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold text-on-surface">{entradas.length}</span>
              <span className="text-xs text-on-surface-variant font-medium">días</span>
            </div>
            <span className="text-[11px] text-primary flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px]">bolt</span> Activo
            </span>
          </div>
        </div>

        {/* Technologies Breakdown */}
        {sortedTechs.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Tecnologías Registradas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sortedTechs.map(([tech, count]) => (
                <span
                  key={tech}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container text-xs text-on-surface font-mono"
                >
                  <span>{tech}</span>
                  <span className="w-4 h-4 rounded-full bg-surface-container-highest text-[10px] flex items-center justify-center text-on-surface-variant">
                    {count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Export CTA Button */}
        <div className="pt-2">
          <button
            onClick={onOpenExport}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-all duration-200 text-xs font-medium shadow-xs active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Generar Informe Markdown</span>
          </button>
        </div>
      </div>

      {/* Security & Local Data Notice (Quiet Luxury style) */}
      <div className="rounded-2xl p-5 bg-surface-container-high/40 border border-outline-variant/30 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] text-primary">database</span>
          <span className="text-xs font-semibold uppercase tracking-wider">Persistencia Local SQLite</span>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Tus notas y transcripciones se procesan con Gemini 2.5 Flash y se guardan íntegramente en tu archivo local <code className="font-mono text-[11px] bg-surface-container px-1 py-0.5 rounded">bitacora.db</code>.
        </p>
      </div>
    </aside>
  );
}

