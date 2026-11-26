// Helper para peticiones HTTP con token de autorización automático
export async function authFetch(url, options = {}) {
  const token = localStorage.getItem('bitacora_token');
  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Si no es FormData, asegurar content-type json si hay body
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  // Si la sesión expiró o fue revocada
  if (res.status === 401) {
    localStorage.removeItem('bitacora_token');
    localStorage.removeItem('bitacora_user');
    window.location.reload();
  }

  return res;
}

