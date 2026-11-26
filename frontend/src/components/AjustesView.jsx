import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/api.js';

export default function AjustesView({ user }) {
  const [config, setConfig] = useState({ hasGeminiKey: false, model: 'gemini-2.5-flash', maskedKey: null });
  const [newKey, setNewKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState(null);

  // Estados de Administración de Usuarios
  const [usuarios, setUsuarios] = useState([]);
  const [nuevoUsername, setNuevoUsername] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRol, setNuevoRol] = useState('user');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userStatus, setUserStatus] = useState(null);

  // Estados de Auditoría de Seguridad
  const [securityLogs, setSecurityLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchConfig();
    if (isAdmin) {
      fetchUsuarios();
      fetchLogs();
    }
  }, [isAdmin]);

  const fetchConfig = async () => {
    try {
      const res = await authFetch('/api/config');
      const data = await res.json();
      if (data.success) {
        setConfig(data);
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const res = await authFetch('/api/admin/usuarios');
      const data = await res.json();
      if (data.success) {
        setUsuarios(data.data || []);
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await authFetch('/api/admin/logs');
      const data = await res.json();
      if (data.success) {
        setSecurityLogs(data.data || []);
      }
    } catch (err) {
      console.error('Error cargando logs:', err);
    }
  };

  const handleSaveKey = async (e) => {
    e.preventDefault();
    if (!newKey.trim()) return;

    setIsSavingKey(true);
    setKeyStatus(null);
    try {
      const res = await authFetch('/api/config/key', {
        method: 'POST',
        body: JSON.stringify({ apiKey: newKey.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setKeyStatus({ type: 'success', msg: '¡API Key actualizada y activa con Gemini 2.5 Flash!' });
        setNewKey('');
        fetchConfig();
      } else {
        throw new Error(data.error || 'Error al guardar clave');
      }
    } catch (err) {
      setKeyStatus({ type: 'error', msg: err.message });
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setUserStatus(null);

    if (!nuevoUsername.trim() || !nuevoPassword.trim()) {
      setUserStatus({ type: 'error', msg: 'Debes completar usuario y contraseña.' });
      return;
    }

    if (nuevoPassword.length < 6) {
      setUserStatus({ type: 'error', msg: 'La contraseña debe tener mínimo 6 caracteres por seguridad.' });
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await authFetch('/api/admin/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          username: nuevoUsername.trim(),
          password: nuevoPassword,
          nombre: nuevoNombre.trim() || nuevoUsername.trim(),
          role: nuevoRol
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUserStatus({ type: 'success', msg: `Usuario @${data.data.username} creado exitosamente.` });
        setNuevoUsername('');
        setNuevoPassword('');
        setNuevoNombre('');
        fetchUsuarios();
        fetchLogs();
      } else {
        throw new Error(data.error || 'Error al crear usuario.');
      }
    } catch (err) {
      setUserStatus({ type: 'error', msg: err.message });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEliminarUsuario = async (userId, targetUsername) => {
    if (!window.confirm(`¿Estás seguro de revocar el acceso a @${targetUsername}?`)) return;

    try {
      const res = await authFetch(`/api/admin/usuarios/${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchUsuarios();
        fetchLogs();
      } else {
        alert(data.error || 'Error al eliminar usuario');
      }
    } catch (err) {
      alert('Error de red: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-3 border-b border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold text-on-surface tracking-tight">Ajustes & Seguridad del Sistema</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Configuración de inteligencia artificial, control de acceso de usuarios y auditoría local.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-surface-container text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">verified_user</span>
            {isAdmin ? 'Cuenta Principal (Admin)' : 'Cuenta de Usuario'}
          </span>
        </div>
      </div>

      {/* SECCIÓN EXCLUSIVA DE ADMIN: GESTIÓN DE CUENTAS */}
      {isAdmin && (
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-primary/30 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-on-surface">Gestión de Cuentas Autorizadas</h3>
                <p className="text-xs text-on-surface-variant">
                  Solo tu cuenta principal puede dar de alta o revocar accesos a la bitácora.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold bg-primary-fixed text-on-primary-fixed px-2.5 py-1 rounded-full">
              {usuarios.length} cuentas activas
            </span>
          </div>

          {/* Formulario de Creación de Usuario */}
          <form onSubmit={handleCrearUsuario} className="space-y-4 bg-surface-container-low p-5 rounded-xl border border-outline-variant/40">
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">
              Crear Nuevo Acceso Autorizado
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-on-surface-variant">Usuario</label>
                <input
                  type="text"
                  required
                  placeholder="ej: pasante2"
                  value={nuevoUsername}
                  onChange={(e) => setNuevoUsername(e.target.value)}
                  className="w-full bg-surface-container-lowest text-xs px-3 py-2.5 rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-on-surface-variant">Contraseña (mín 6 car.)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={nuevoPassword}
                  onChange={(e) => setNuevoPassword(e.target.value)}
                  className="w-full bg-surface-container-lowest text-xs px-3 py-2.5 rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-on-surface-variant">Nombre o Apodo</label>
                <input
                  type="text"
                  placeholder="ej: María Pasante"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full bg-surface-container-lowest text-xs px-3 py-2.5 rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-on-surface-variant">Rol de Acceso</label>
                <select
                  value={nuevoRol}
                  onChange={(e) => setNuevoRol(e.target.value)}
                  className="w-full bg-surface-container-lowest text-xs px-3 py-2.5 rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none"
                >
                  <option value="user">Usuario (Solo Bitácora)</option>
                  <option value="admin">Administrador (Control Total)</option>
                </select>
              </div>
            </div>

            {userStatus && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${userStatus.type === 'success'
                    ? 'bg-primary-fixed text-on-primary-fixed'
                    : 'bg-error-container text-on-error-container'
                  }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {userStatus.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span>{userStatus.msg}</span>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isCreatingUser}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-medium transition-all disabled:opacity-50 shadow-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>{isCreatingUser ? 'Creando cuenta...' : 'Crear y Autorizar Cuenta'}</span>
              </button>
            </div>
          </form>

          {/* Listado de Cuentas Existentes */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Cuentas Registradas en el Sistema
            </h4>

            <div className="divide-y divide-outline-variant/20 border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-lowest">
              {usuarios.map((u) => {
                const isSelf = u.id === user.id;
                return (
                  <div key={u.id} className="p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                        <span className="material-symbols-outlined text-[18px]">
                          {u.role === 'admin' ? 'shield_person' : 'person'}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-on-surface truncate">
                            {u.nombre}
                          </span>
                          <span className="font-mono text-[11px] text-on-surface-variant">
                            @{u.username}
                          </span>
                          {isSelf && (
                            <span className="px-1.5 py-0.2 rounded bg-surface-container-highest text-[10px] text-on-surface font-medium">
                              Tú
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-on-surface-variant">
                          Registrado: {u.created_at}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${u.role === 'admin'
                            ? 'bg-primary-fixed text-on-primary-fixed'
                            : 'bg-surface-container text-on-surface-variant'
                          }`}
                      >
                        {u.role === 'admin' ? 'Administrador' : 'Usuario'}
                      </span>

                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => handleEliminarUsuario(u.id, u.username)}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
                          title="Eliminar usuario"
                        >
                          <span className="material-symbols-outlined text-[18px]">person_remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Toggle de Auditoría de Seguridad */}
          <div className="pt-2 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">security</span>
              <span>{showLogs ? 'Ocultar registro de auditoría de seguridad' : 'Ver registro de auditoría de seguridad y accesos'}</span>
            </button>

            {showLogs && (
              <div className="mt-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/40 space-y-2 max-h-64 overflow-y-auto">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
                  Últimos 50 Eventos de Seguridad
                </span>
                <div className="space-y-1 font-mono text-[11px]">
                  {securityLogs.length === 0 ? (
                    <p className="text-on-surface-variant">Sin eventos registrados aún.</p>
                  ) : (
                    securityLogs.map((log) => (
                      <div key={log.id} className="p-2 rounded bg-surface-container-lowest flex items-start justify-between gap-2 border border-outline-variant/20">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${log.evento.includes('SUCCESS') ? 'bg-primary' : log.evento.includes('LOCKED') || log.evento.includes('FAILED') ? 'bg-error' : 'bg-secondary'
                            }`}></span>
                          <div>
                            <span className="font-bold text-on-surface">{log.evento}</span>: <span className="text-on-surface-variant">{log.detalles}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-outline shrink-0 text-right">
                          <span>IP: {log.ip}</span>
                          <div>{log.created_at}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card: Estado del Modelo Gemini */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">smart_toy</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-on-surface">Motor Neuronal Gemini</h3>
              <p className="text-xs text-on-surface-variant">Redacción técnica y extracción estructurada</p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${config.hasGeminiKey
                ? 'bg-primary-fixed text-on-primary-fixed'
                : 'bg-surface-container text-on-surface-variant'
              }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${config.hasGeminiKey ? 'bg-primary animate-pulse' : 'bg-outline'}`}
            ></span>
            {config.hasGeminiKey ? 'Gemini 2.5 Flash Conectado' : 'Modo Simulación Local'}
          </span>
        </div>

        {/* API Key Form (Sólo Admin puede actualizarla) */}
        {isAdmin ? (
          <form onSubmit={handleSaveKey} className="space-y-3 pt-2">
            <label className="block text-xs font-medium text-on-surface-variant" htmlFor="gemini-key">
              {config.hasGeminiKey ? 'Actualizar Clave de API de Gemini' : 'Ingresa tu Clave de API de Gemini (Google AI Studio)'}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="gemini-key"
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder={config.maskedKey ? `Clave actual: ${config.maskedKey}` : 'AIzaSy...'}
                className="flex-1 bg-surface-container-low text-xs px-4 py-3 rounded-xl border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary font-mono"
              />
              <button
                type="submit"
                disabled={!newKey.trim() || isSavingKey}
                className="px-5 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-medium transition-all disabled:opacity-50 shrink-0"
              >
                {isSavingKey ? 'Guardando...' : 'Guardar y Activar'}
              </button>
            </div>

            {config.maskedKey && (
              <p className="text-[11px] text-on-surface-variant">
                Clave configurada: <span className="font-mono">{config.maskedKey}</span>
              </p>
            )}

            {keyStatus && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${keyStatus.type === 'success'
                    ? 'bg-primary-fixed text-on-primary-fixed'
                    : 'bg-error-container text-on-error-container'
                  }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {keyStatus.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span>{keyStatus.msg}</span>
              </div>
            )}
          </form>
        ) : (
          <p className="text-xs text-on-surface-variant italic">
            La clave de API de Gemini es gestionada por el Administrador Principal.
          </p>
        )}
      </div>

      {/* Card: Almacenamiento & Parámetros Locales */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[22px]">database</span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-on-surface">Almacenamiento Local Seguro</h3>
            <p className="text-xs text-on-surface-variant">Base de datos SQLite sin fugas de datos en la nube</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-surface-container-low rounded-xl">
            <span className="text-[11px] text-on-surface-variant block">Motor SQLite</span>
            <span className="text-sm font-semibold font-mono text-on-surface">better-sqlite3 v13</span>
          </div>
          <div className="p-3 bg-surface-container-low rounded-xl">
            <span className="text-[11px] text-on-surface-variant block">Protección de Datos</span>
            <span className="text-sm font-semibold font-mono text-on-surface">Cifrado scrypt (Tokens HMAC)</span>
          </div>
          <div className="p-3 bg-surface-container-low rounded-xl">
            <span className="text-[11px] text-on-surface-variant block">Archivo Local</span>
            <span className="text-sm font-semibold font-mono text-on-surface">backend/bitacora.db</span>
          </div>
        </div>
      </div>
    </div>
  );
}
