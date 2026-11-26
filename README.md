# 🎙️ Bitácora (PWA + IA)

Aplicación Web Progresiva (PWA) moderna, minimalista y segura para registrar y estructurar actividades diarias, proyectos o jornadas de trabajo mediante **notas de voz o texto asistidas por IA (Gemini 2.5 Flash)**, con persistencia local en **SQLite (`better-sqlite3`)** y diseño responsivo.

---

## ✨ Funcionalidades Principales

- **Registro por Voz o Texto con IA:** Graba notas de voz desde el navegador o escribe un resumen libre; **Gemini 2.5 Flash** lo estructura automáticamente en título, horas dedicadas, lista de actividades, herramientas/tecnologías utilizadas, aprendizaje clave y transcripción limpia. *(Si no se configura una API Key, funciona en modo de prueba generando una entrada de muestra).*
- **Gestión de Tareas:** Lista de tareas pendientes con fecha, prioridad y estado completado.
- **Exportación a Markdown:** Genera y descarga un informe consolidado de todas tus entradas en formato `.md`.
- **Instalable como PWA:** Funciona en escritorio y dispositivos móviles con acceso seguro al micrófono vía HTTPS local.

---

## 🔒 Modelo de Seguridad y Control de Cuentas

Para proteger la integridad de los registros y evitar accesos no autorizados:

1. **Cuenta Maestra Única (Administrador Principal):**
   - **Usuario inicial por defecto:** `pasante`
   - **Contraseña inicial por defecto:** `pasante123`
   - **Rol:** `admin` (Única cuenta autorizada para crear o revocar cuentas, actualizar la API Key de Gemini desde la interfaz y consultar los logs de seguridad).
   > **Recomendación:** Cambia o crea tu propia cuenta administradora personalizada tras el primer inicio de sesión.
2. **Sin Auto-Registro Público:**
   - La pantalla de inicio de sesión no permite registro libre. Todo usuario adicional debe ser creado por el administrador desde **Ajustes**.
3. **Protección Anti Fuerza Bruta (Brute-Force Lockout):**
   - Máximo **5 intentos fallidos** de contraseña por usuario.
   - Al superar el límite, la cuenta queda **bloqueada temporalmente durante 15 minutos**.
   - Contraseñas almacenadas con salt aleatorio y `crypto.scryptSync` + comparación en tiempo constante (`crypto.timingSafeEqual`).
4. **Sesiones, Rate Limiting y Cabeceras de Seguridad:**
   - Autenticación por token firmado con HMAC-SHA256 (`AUTH_SECRET`).
   - Límite de **10 intentos por minuto** por dirección IP en `/api/auth/login`.
   - Cabeceras HTTP: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-XSS-Protection: 1; mode=block`.
5. **Auditoría de Seguridad:**
   - Los eventos relevantes (inicios de sesión, intentos fallidos, bloqueos, gestión de usuarios y cambios de API Key) se registran en la tabla `security_logs`, visible para el administrador.

---

## 📦 Instalación y Ejecución

### 1. Instalar dependencias

Desde la raíz del proyecto:

```bash
npm --prefix backend install
npm --prefix frontend install --include=dev
```

*(O bien `npm run build`, que instala dependencias en ambos paquetes y compila el frontend).*

### 2. Desarrollo (Un Solo Comando)

Desde la raíz del proyecto, ejecuta:

```bash
npm run dev
```

Esto iniciará en simultáneo:
- **Backend:** `http://localhost:3001` (Node.js + Express + SQLite + Gemini)
- **Frontend PWA:** `https://localhost:5173` y `https://<TU-IP-LOCAL>:5173` (React 18 + Vite con HTTPS)

### 3. Producción

Compila el frontend y sirve todo desde el servidor backend:

```bash
npm run build
npm start
```

---

## 📱 Acceso desde Teléfono Móvil Android

Para grabar notas de voz desde un smartphone Android en la misma red Wi-Fi:

1. Revisa la IP local que muestra Vite en la terminal al ejecutar `npm run dev` (por ejemplo: `https://192.168.1.X:5173`).
2. Abre Google Chrome en tu dispositivo e ingresa a esa dirección `https://...`.
3. Al tratarse de un certificado de desarrollo autofirmado, pulsa **Opciones avanzadas > Continuar al sitio**.
4. ¡Listo! Al usar HTTPS, Chrome permite el acceso al **micrófono (`getUserMedia`)** y la instalación como **PWA** en la pantalla de inicio.

---

## 🔑 Configuración de Gemini 2.5 Flash

Puedes configurar tu API Key de Google Gemini de dos formas:

1. **Desde la Interfaz Web:** Inicia sesión como administrador, ve a la pestaña **Ajustes**, introduce tu API Key y guárdala.
2. **Archivo `.env` en `backend/.env`:** Puedes usar `backend/.env.example` como plantilla:
   ```env
   PORT=3001
   GEMINI_API_KEY=tu_api_key_aqui
   NODE_ENV=development
   ```
   *(Opcionalmente define `AUTH_SECRET` y `DB_PATH` en producción).*

*(Obtén tu API key en [Google AI Studio](https://aistudio.google.com/app/apikey)).*

---

## 🛠️ Stack Tecnológico

- **Lenguaje:** JavaScript ES6+ (ES Modules, sin TypeScript ni ORM).
- **Frontend:** React 18, Vite 6, Tailwind CSS, `@vitejs/plugin-basic-ssl`, `vite-plugin-pwa`, `lucide-react`.
- **Backend:** Node.js, Express, Multer, `better-sqlite3`, `@google/genai`.
- **Almacenamiento:** SQLite en modo WAL (`backend/bitacora.db`).
- **Pruebas de Seguridad:** `npm --prefix backend run test:security`
