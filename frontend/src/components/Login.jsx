import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa usuario y contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Credenciales inválidas.');
      }

      // Guardar token y datos del usuario
      localStorage.setItem('bitacora_token', data.token);
      localStorage.setItem('bitacora_user', JSON.stringify(data.user));

      if (onLoginSuccess) {
        onLoginSuccess(data.user, data.token);
      }
    } catch (err) {
      console.error('Error de autenticación:', err);
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    setUsername('pasante');
    setPassword('pasante123');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans flex flex-col justify-between selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Mobile Top Header */}
      <header className="lg:hidden w-full pt-safe border-b border-outline-variant/30 bg-surface/80 backdrop-blur-md">
        <div className="flex items-center justify-between h-14 px-4 max-w-[680px] mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse"></div>
            <span className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant font-mono">
              Bitácora IA
            </span>
          </div>
          <span className="text-xs text-outline font-medium">Bóveda Privada</span>
        </div>
      </header>

      {/* Main Container: Split Desktop Layout & Centered Mobile Layout */}
      <main className="flex-1 w-full flex items-center justify-center py-8 lg:py-12 px-4 sm:px-8 lg:px-16">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left Column: Stitch Editorial Zen Zone (Visible on Desktop) */}
          <section className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 lg:pr-6 select-none">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                <span>Bitácora de Pasantías • Acceso Restringido</span>
              </div>

              <div className="space-y-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Cuaderno de Pensamiento & Trabajo
                </span>
                <blockquote className="text-3xl text-on-surface leading-tight font-normal">
                  “El silencio no es la ausencia de sonido, sino el espacio donde cada pensamiento recupera su propio peso.”
                </blockquote>
                <p className="text-sm text-on-surface-variant italic font-serif">
                  — Cuaderno de bitácora, entrada #01
                </p>
              </div>
            </div>

            {/* Visualizador acústico en reposo (Stitch Zen Asset) */}
            <div className="bg-surface-container-low rounded-2xl p-6 space-y-4 border border-outline-variant/30 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-medium">
                  Calibración Acústica de Entrada
                </span>
                <span className="text-xs text-primary font-mono font-medium">
                  0.0 dB • En Reposo
                </span>
              </div>

              {/* Acoustic Waveform Bars */}
              <div className="h-10 flex items-center justify-between gap-1 px-1">
                {[8, 14, 8, 22, 32, 16, 38, 20, 10, 26, 12, 8, 18, 8].map((h, i) => (
                  <span
                    key={i}
                    className="w-1.5 rounded-full bg-primary-container/60 transition-all duration-300"
                    style={{ height: `${h}px` }}
                  ></span>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between text-on-surface-variant text-xs border-t border-outline-variant/30">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                  Control de Acceso Estricto (RBAC)
                </span>
                <span className="text-outline text-[11px] font-mono">SQLite Cifrado Local</span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-on-surface-variant text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">shield</span>
                <span>Anti Fuerza Bruta (5 intentos máx)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">security</span>
                <span>Sin registro público libre</span>
              </div>
            </div>
          </section>

          {/* Right Column: Authentication Card (Mobile & Desktop) */}
          <section className="lg:col-span-6 w-full flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-outline-variant/30 space-y-6">
              {/* Card Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-[24px]">lock</span>
                  </div>
                  <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                    Bóveda Segura
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  <h1 className="text-2xl font-semibold text-on-surface tracking-tight">
                    Iniciar Sesión
                  </h1>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Ingresa con tu usuario y contraseña autorizados por el Administrador Principal.
                  </p>
                </div>
              </div>

              {/* Login Form (NO PUBLIC REGISTRATION) */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campo Usuario (SIN CORREO) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-on-surface-variant" htmlFor="username">
                    Nombre de Usuario
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-outline pointer-events-none">
                      person
                    </span>
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ej: pasante"
                      className="w-full bg-surface-container-low focus:bg-surface-container-lowest text-on-surface text-sm rounded-xl pl-11 pr-4 py-3 outline-none border border-outline-variant/40 focus:border-primary transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Campo Contraseña */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-on-surface-variant" htmlFor="password">
                      Contraseña
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-outline pointer-events-none">
                      key
                    </span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-container-low focus:bg-surface-container-lowest text-on-surface text-sm rounded-xl pl-11 pr-11 py-3 outline-none border border-outline-variant/40 focus:border-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-outline hover:text-on-surface p-1 rounded-md transition-colors"
                      title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Mensaje de error / Bloqueo */}
                {errorMessage && (
                  <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] shrink-0">warning</span>
                    <span className="leading-tight">{errorMessage}</span>
                  </div>
                )}

                {/* Botón Principal */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary-container text-on-primary font-medium text-sm py-3 px-4 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Verificando credenciales...</span>
                    </>
                  ) : (
                    <>
                      <span>Ingresar a la Bitácora</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* Botón de acceso de la Cuenta Principal / Pasante */}
              <div className="p-3 rounded-xl bg-surface-container-low border border-dashed border-outline-variant/60 flex items-center justify-between text-xs">
                <div className="flex flex-col">
                  <span className="font-semibold text-on-surface flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Cuenta Principal:
                  </span>
                  <span className="text-on-surface-variant font-mono text-[11px]">pasante / pasante123</span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  className="px-2.5 py-1 rounded-lg bg-surface-container text-primary hover:bg-surface-container-high font-medium transition-colors"
                >
                  Rellenar
                </button>
              </div>

              {/* Aviso de Seguridad Estricta */}
              <div className="p-3 rounded-xl bg-surface-container flex items-start gap-2.5 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">lock_clock</span>
                <p className="leading-tight text-[11px]">
                  <strong>Acceso Estricto:</strong> El registro público está deshabilitado. Las nuevas cuentas de usuario sólo pueden ser dadas de alta por la Cuenta Principal desde el panel de Ajustes.
                </p>
              </div>

              {/* Pie de privacidad local */}
              <div className="pt-2 border-t border-outline-variant/30 flex flex-col items-center gap-1 text-center">
                <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono">
                  <span>Protección Anti-Fuerza Bruta Activa</span>
                  <span>•</span>
                  <span>Sin Correo</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-on-surface-variant border-t border-outline-variant/30">
        Bitácora de Pasantías con IA • Acceso Protegido y Cifrado
      </footer>
    </div>
  );
}
