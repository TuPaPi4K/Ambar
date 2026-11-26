import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/api.js';

export default function TareasView() {
  const [tareas, setTareas] = useState([]);
  const [nuevaTarea, setNuevaTarea] = useState('');
  const [prioridad, setPrioridad] = useState('normal');
  const [filter, setFilter] = useState('todas'); // todas | pendientes | completadas
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTareas();

    // Sincronización automática de tareas en tiempo real
    const handleFocus = () => {
      fetchTareas(true);
    };
    window.addEventListener('focus', handleFocus);
    const interval = setInterval(() => fetchTareas(true), 45000); // Polling suave cada 45s

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const fetchTareas = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await authFetch('/api/tareas');
      const data = await res.json();
      if (data.success) {
        setTareas(data.data || []);
      }
    } catch (err) {
      console.error('Error cargando tareas:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleCrearTarea = async (e) => {
    e.preventDefault();
    if (!nuevaTarea.trim()) return;

    try {
      const res = await authFetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: nuevaTarea.trim(),
          prioridad
        })
      });
      const data = await res.json();
      if (data.success) {
        setTareas((prev) => [data.data, ...prev]);
        setNuevaTarea('');
      }
    } catch (err) {
      console.error('Error al crear tarea:', err);
    }
  };

  const handleToggle = async (tarea) => {
    const nuevoEstado = tarea.completada === 1 ? 0 : 1;
    // Optimistic update
    setTareas((prev) =>
      prev.map((t) => (t.id === tarea.id ? { ...t, completada: nuevoEstado } : t))
    );

    try {
      await authFetch(`/api/tareas/${tarea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completada: nuevoEstado })
      });
    } catch (err) {
      console.error('Error actualizando tarea:', err);
      fetchTareas();
    }
  };

  const handleEliminar = async (id) => {
    setTareas((prev) => prev.filter((t) => t.id !== id));
    try {
      await authFetch(`/api/tareas/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error eliminando tarea:', err);
      fetchTareas();
    }
  };

  const filtradas = tareas.filter((t) => {
    if (filter === 'pendientes') return t.completada === 0;
    if (filter === 'completadas') return t.completada === 1;
    return true;
  });

  const completadasCount = tareas.filter((t) => t.completada === 1).length;
  const porcentaje = tareas.length > 0 ? Math.round((completadasCount / tareas.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <h2 className="text-2xl font-semibold text-on-surface tracking-tight">Tareas & Fechas</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Compromisos laborales extraídos de tu voz o agregados manualmente.
          </p>
        </div>

        {/* Progress Pill */}
        <div className="flex items-center gap-3 bg-surface-container px-4 py-2 rounded-xl text-xs">
          <span className="text-on-surface-variant font-medium">Progreso:</span>
          <div className="w-24 h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${porcentaje}%` }}
            ></div>
          </div>
          <span className="font-mono font-bold text-primary">{completadasCount}/{tareas.length}</span>
        </div>
      </div>

      {/* Quick Add Task Form */}
      <form onSubmit={handleCrearTarea} className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-[20px] text-primary">
            add_task
          </span>
          <input
            type="text"
            value={nuevaTarea}
            onChange={(e) => setNuevaTarea(e.target.value)}
            placeholder="Añadir nueva tarea o compromiso..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary border border-outline-variant/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value)}
            className="bg-surface-container-low text-xs rounded-xl px-3 py-2.5 border border-outline-variant/30 text-on-surface focus:outline-none"
          >
            <option value="normal">Prioridad Normal</option>
            <option value="alta">Alta Prioridad</option>
            <option value="baja">Baja Prioridad</option>
          </select>

          <button
            type="submit"
            disabled={!nuevaTarea.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-medium transition-all disabled:opacity-50 active:scale-95 shrink-0"
          >
            Agregar
          </button>
        </div>
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['todas', 'pendientes', 'completadas'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${filter === f
              ? 'bg-on-surface text-surface'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
          >
            {f} {f === 'todas' && `(${tareas.length})`}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-2.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-primary gap-2 text-xs">
            <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
            <span>Cargando tareas...</span>
          </div>
        ) : filtradas.length === 0 ? (
          <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40 text-xs text-on-surface-variant">
            No hay tareas en esta sección. Las actividades que menciones en tus notas de voz aparecerán aquí.
          </div>
        ) : (
          filtradas.map((tarea) => (
            <div
              key={tarea.id}
              className={`group flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest border transition-all ${tarea.completada === 1
                ? 'border-outline-variant/20 opacity-60 bg-surface-container-low'
                : 'border-outline-variant/30 hover:border-primary/40 shadow-xs'
                }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <button
                  type="button"
                  onClick={() => handleToggle(tarea)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${tarea.completada === 1
                    ? 'bg-primary text-on-primary'
                    : 'border-2 border-outline hover:border-primary'
                    }`}
                >
                  {tarea.completada === 1 && (
                    <span className="material-symbols-outlined text-[15px]">check</span>
                  )}
                </button>

                <div className="flex flex-col min-w-0">
                  <span
                    className={`text-sm leading-snug truncate ${tarea.completada === 1 ? 'line-through text-on-surface-variant' : 'text-on-surface'
                      }`}
                  >
                    {tarea.texto}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-on-surface-variant font-mono">
                    <span>{tarea.fecha}</span>
                    {tarea.prioridad === 'alta' && (
                      <span className="px-1.5 py-0.2 rounded bg-error-container text-on-error-container font-sans text-[10px]">
                        Alta
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleEliminar(tarea.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/40 rounded-lg transition-all"
                title="Eliminar tarea"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

