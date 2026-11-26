import React, { useState } from 'react';
import { authFetch } from '../utils/api.js';

export default function EntryCard({ entrada, onDelete }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro de la bitácora?')) return;
    setIsDeleting(true);
    try {
      const res = await authFetch(`/api/entradas/${entrada.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onDelete) onDelete(entrada.id);
      }
    } catch (err) {
      console.error('Error al eliminar:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedDate = () => {
    try {
      const [year, month, day] = (entrada.fecha || '').split('-');
      if (year && month && day) {
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
      }
      return entrada.fecha;
    } catch {
      return entrada.fecha;
    }
  };

  const actividades = Array.isArray(entrada.actividades) ? entrada.actividades : [entrada.actividades];
  const tecnologias = Array.isArray(entrada.tecnologias_usadas) ? entrada.tecnologias_usadas : [];

  return (
    <article className="flex flex-col gap-2 relative group">
      {/* Timeline Marker */}
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant font-mono">
          {formattedDate()}
        </span>
        <span className="h-[1px] flex-1 bg-surface-container-high"></span>
        <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium">
          {entrada.horas_trabajadas || 8} hrs dedicadas
        </span>
      </div>

      {/* Main Card Body */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-4 transition-all duration-200 hover:shadow-md">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="text-xl font-semibold text-on-surface tracking-tight leading-snug">
              {entrada.titulo}
            </h2>
            {entrada.audio_duracion > 0 && (
              <span className="text-xs text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-primary">mic</span>
                Voz original: {entrada.audio_duracion} segs
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-medium">
              <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
              Redactado con IA
            </span>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container transition-all"
              title="Eliminar registro"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>

        {/* Actividades Técnicas */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Actividades Realizadas
          </span>
          <ul className="space-y-1.5 text-sm text-on-surface leading-relaxed">
            {actividades.map((act, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                  check_circle
                </span>
                <span>{act}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tecnologías Usadas (Chips) */}
        {tecnologias.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-on-surface-variant mr-1">Stack:</span>
            {tecnologias.map((tech, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 rounded-md bg-surface-container text-on-surface-variant text-xs font-medium font-mono"
              >
                #{tech}
              </span>
            ))}
          </div>
        )}

        {/* Aprendizaje Clave (Editorial Box) */}
        {entrada.aprendizaje_clave && (
          <div className="bg-surface-container-low p-4 rounded-xl flex items-start gap-3 border-l-2 border-primary">
            <div className="w-7 h-7 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[16px]">psychology</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Aprendizaje Clave & Reto Superado
              </span>
              <p className="text-xs text-on-surface leading-relaxed mt-0.5 italic">
                "{entrada.aprendizaje_clave}"
              </p>
            </div>
          </div>
        )}

        {/* Toggle Transcripción Original */}
        {entrada.transcripcion_original && (
          <div className="pt-1 border-t border-outline-variant/30">
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="text-xs text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">
                {showOriginal ? 'expand_less' : 'expand_more'}
              </span>
              <span>{showOriginal ? 'Ocultar transcripción original' : 'Ver transcripción original de voz'}</span>
            </button>
            {showOriginal && (
              <p className="mt-2 text-xs text-on-surface-variant bg-surface-container p-3 rounded-lg font-mono leading-relaxed">
                {entrada.transcripcion_original}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

