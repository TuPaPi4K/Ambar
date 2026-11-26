import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/api.js';

export default function ExportModal({ isOpen, onClose }) {
  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMarkdown();
    }
  }, [isOpen]);

  const loadMarkdown = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/exportar-markdown');
      const data = await res.json();
      if (data.success) {
        setMarkdown(data.markdown);
      }
    } catch (err) {
      console.error('Error cargando informe:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `informe_pasantias_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-surface rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl border border-outline-variant/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/30 bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary-container text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">description</span>
            </div>
            <div>
              <h3 className="font-semibold text-base text-on-surface">Informe de Pasantías en Markdown</h3>
              <p className="text-xs text-on-surface-variant">Listo para exportar y presentar a tus evaluadores</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-surface-container-lowest">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-primary gap-2 text-sm font-medium">
              <span className="material-symbols-outlined text-[22px] animate-spin">progress_activity</span>
              <span>Generando informe consolidado...</span>
            </div>
          ) : (
            <pre className="text-xs font-mono text-on-surface whitespace-pre-wrap leading-relaxed select-text bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
              {markdown}
            </pre>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-outline-variant/30 bg-surface-container-low">
          <span className="text-xs text-on-surface-variant">
            Formato GitHub Flavored Markdown (.md)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? '¡Copiado!' : 'Copiar texto'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-medium transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Descargar archivo .md</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

