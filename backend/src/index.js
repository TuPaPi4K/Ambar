import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import { dbOperations } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const AUTH_SECRET = process.env.AUTH_SECRET || 'bitacora_jwt_secret_pasantias_2026';

// Generación y verificación de tokens de sesión basados en HMAC
function generateAuthToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    nombre: user.nombre,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30 // 30 días
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyAuthToken(token) {
  if (!token || !token.includes('.')) return null;
  const [data, signature] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Middlewares de seguridad HTTP
app.set('trust proxy', 1); // Necesario detrás de proxy inverso (Railway/Render) para leer IP real del cliente
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Rate Limiting en memoria para intentos de autenticación por IP
const ipLoginAttempts = new Map();

function rateLimitLogin(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  const maxAttempts = 10;

  const userAttempts = ipLoginAttempts.get(ip) || [];
  const recentAttempts = userAttempts.filter(timestamp => now - timestamp < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    dbOperations.registrarLogSeguridad(ip, 'RATE_LIMIT_EXCEEDED', `Límite de peticiones por minuto superado`);
    return res.status(429).json({
      success: false,
      error: 'Demasiadas solicitudes de inicio de sesión desde esta IP. Por favor espera 1 minuto antes de reintentar.'
    });
  }

  recentAttempts.push(now);
  ipLoginAttempts.set(ip, recentAttempts);
  next();
}

// Middleware de autenticación obligatoria (JWT/Token)
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.split(' ')[1]
    : (req.query && req.query.token ? req.query.token : null);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Acceso no autorizado: debes iniciar sesión.'
    });
  }

  const decoded = verifyAuthToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Sesión expirada o token inválido.'
    });
  }

  const user = dbOperations.getUsuarioById(decoded.id);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'El usuario ya no existe.'
    });
  }

  req.user = user;
  next();
}

// Middleware de Administrador Principal Obligatorio
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    dbOperations.registrarLogSeguridad(
      req.ip,
      'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
      `Usuario ${req.user?.username || 'desconocido'} intentó acceder a funciones de admin`
    );
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado: Únicamente la Cuenta Principal (Administrador) puede realizar esta acción.'
    });
  }
  next();
}

// Configuración de Multer para recibir audios en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB máximo
});

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Bitácora de Pasantías Backend'
  });
});

// --- AUTENTICACIÓN SEGURA ---

// POST /api/auth/login - Con protección Anti Fuerza Bruta y bloqueo de cuenta
app.post('/api/auth/login', rateLimitLogin, (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Debes proporcionar usuario y contraseña.'
      });
    }

    const resultado = dbOperations.verificarCredencialesAvanzado(username, password, clientIp);

    if (resultado.status === 'LOCKED') {
      return res.status(429).json({
        success: false,
        error: resultado.error
      });
    }

    if (resultado.status !== 'SUCCESS') {
      return res.status(401).json({
        success: false,
        error: resultado.error
      });
    }

    const token = generateAuthToken(resultado.user);
    res.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      token,
      user: resultado.user
    });
  } catch (error) {
    console.error('[Error POST /api/auth/login]:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno en la autenticación'
    });
  }
});

// GET /api/auth/me - Obtener datos de la sesión actual
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// --- MÓDULO EXCLUSIVO DE ADMINISTRACIÓN (SOLO CUENTA PRINCIPAL) ---

// GET /api/admin/usuarios - Listar todas las cuentas existentes
app.get('/api/admin/usuarios', requireAuth, requireAdmin, (req, res) => {
  try {
    const usuarios = dbOperations.getUsuariosTodos();
    res.json({ success: true, data: usuarios });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/usuarios - Crear nueva cuenta (SOLO LA CUENTA PRINCIPAL PUEDE CREARLAS)
app.post('/api/admin/usuarios', requireAuth, requireAdmin, (req, res) => {
  try {
    const { username, password, nombre, role = 'user' } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de usuario y la contraseña son obligatorios.'
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de usuario debe tener mínimo 3 caracteres.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Por seguridad, la contraseña debe tener al menos 6 caracteres.'
      });
    }

    const existing = dbOperations.getUsuarioByUsername(cleanUsername);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una cuenta con ese nombre de usuario.'
      });
    }

    const nuevoUsuario = dbOperations.crearUsuario({
      username: cleanUsername,
      password,
      nombre: (nombre || cleanUsername).trim(),
      role: role === 'admin' ? 'admin' : 'user'
    });

    dbOperations.registrarLogSeguridad(
      clientIp,
      'USER_CREATED_BY_ADMIN',
      `Admin @${req.user.username} creó la cuenta @${nuevoUsuario.username} (Rol: ${nuevoUsuario.role})`
    );

    res.status(201).json({
      success: true,
      message: `Cuenta @${nuevoUsuario.username} creada exitosamente.`,
      data: nuevoUsuario
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/usuarios/:id - Revocar/eliminar cuenta de acceso
app.delete('/api/admin/usuarios/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const clientIp = req.ip || req.socket.remoteAddress;

    dbOperations.eliminarUsuario(id, req.user.id);
    dbOperations.registrarLogSeguridad(
      clientIp,
      'USER_DELETED_BY_ADMIN',
      `Admin @${req.user.username} eliminó el usuario ID ${id}`
    );

    res.json({ success: true, message: 'Usuario revocado y eliminado exitosamente.' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/admin/logs - Ver registros de auditoría de seguridad
app.get('/api/admin/logs', requireAuth, requireAdmin, (req, res) => {
  try {
    const logs = dbOperations.getLogsSeguridad(50);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- ENDPOINTS PROTEGIDOS DE LA BITÁCORA ---

// 1. GET /api/entradas - Obtener historial de registros
app.get('/api/entradas', requireAuth, (req, res) => {
  try {
    const entradas = dbOperations.getEntradas();
    res.json({
      success: true,
      count: entradas.length,
      data: entradas
    });
  } catch (error) {
    console.error('[Error GET /api/entradas]:', error);
    res.status(500).json({
      success: false,
      error: 'Error al consultar las entradas de la bitácora',
      details: error.message
    });
  }
});

// 2. POST /api/procesar-voz - Procesar audio con Gemini y guardar en SQLite
app.post('/api/procesar-voz', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    const audioFile = req.file;
    const duracion = req.body.duracion ? Number(req.body.duracion) : 0;
    const textoManual = req.body.texto;

    if (!audioFile && !textoManual) {
      return res.status(400).json({
        success: false,
        error: 'No se recibió ningún archivo de audio ni texto para procesar.'
      });
    }

    let resultadoProcesado;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim() !== '' && apiKey !== 'tu_api_key_aqui') {
      console.log('[Gemini] Procesando entrada con Gemini 2.5 Flash...');
      const ai = new GoogleGenAI({ apiKey });

      const promptInstrucciones = `
Eres un asistente de ingeniería de software y redactor técnico experto para un estudiante en pasantías profesionales.
Analiza el siguiente audio (o texto transcrito) donde el pasante describe de forma natural y coloquial lo que hizo en su día laboral.

Debes generar un objeto JSON ESTRICTO con la siguiente estructura:
{
  "titulo": "Título profesional, claro y descriptivo del día (máx 8 palabras)",
  "horas_trabajadas": número decimal estimando las horas mencionadas (si no menciona horas, asume 8),
  "actividades": [
    "Lista de viñetas redactadas en lenguaje técnico formal, en tercera persona o infinitivo, detallando tareas logradas, depuración, diseño, reuniones, etc."
  ],
  "tecnologias_usadas": [
    "Nombres de tecnologías, herramientas, lenguajes, frameworks, librerías o metodologías mencionadas o implícitas (ej: React, Express, Docker, Git, SQLite)"
  ],
  "aprendizaje_clave": "Un párrafo reflexivo conciso que resuma el aprendizaje principal, reto superado o conclusión técnica del día",
  "transcripcion_original": "Transcripción textual limpia de lo que dijo el usuario"
}
`;

      const contents = [];
      const parts = [{ text: promptInstrucciones }];

      if (audioFile) {
        parts.push({
          inlineData: {
            mimeType: audioFile.mimetype || 'audio/webm',
            data: audioFile.buffer.toString('base64')
          }
        });
      } else if (textoManual) {
        parts.push({
          text: `Texto proporcionado por el usuario: "${textoManual}"`
        });
      }

      contents.push({ role: 'user', parts });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text;
      resultadoProcesado = JSON.parse(responseText);
    } else {
      console.warn('[Gemini] GEMINI_API_KEY no configurada. Generando entrada de muestra para pruebas.');
      resultadoProcesado = {
        titulo: 'Registro de actividades inicial (Modo prueba)',
        horas_trabajadas: 8,
        actividades: [
          'Configuración del entorno de desarrollo y estructura base del proyecto.',
          'Inicialización del servidor backend con Express y base de datos SQLite.',
          'Recepción y validación de notas de audio mediante Multer.'
        ],
        tecnologias_usadas: ['Node.js', 'Express', 'better-sqlite3', 'Multer', 'Gemini API'],
        aprendizaje_clave: 'Configuración exitosa de la arquitectura base de la bitácora. Se requiere configurar GEMINI_API_KEY en /backend/.env para procesamiento en tiempo real.',
        transcripcion_original: audioFile ? `Audio recibido (${audioFile.originalname || 'grabacion.webm'}, ${(audioFile.size / 1024).toFixed(1)} KB)` : textoManual
      };
    }

    // Persistir en SQLite con better-sqlite3
    const nuevaEntrada = dbOperations.crearEntrada({
      fecha: req.body.fecha || undefined,
      titulo: resultadoProcesado.titulo || 'Actividades de la jornada',
      horas_trabajadas: Number(resultadoProcesado.horas_trabajadas) || 0,
      actividades: resultadoProcesado.actividades || [],
      tecnologias_usadas: resultadoProcesado.tecnologias_usadas || [],
      aprendizaje_clave: resultadoProcesado.aprendizaje_clave || '',
      audio_duracion: duracion,
      transcripcion_original: resultadoProcesado.transcripcion_original || ''
    });

    res.status(201).json({
      success: true,
      message: 'Entrada procesada y guardada exitosamente.',
      data: nuevaEntrada
    });
  } catch (error) {
    console.error('[Error POST /api/procesar-voz]:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar la nota de voz',
      details: error.message
    });
  }
});

// 3. GET /api/exportar-markdown - Exportar informe completo en formato Markdown
app.get('/api/exportar-markdown', requireAuth, (req, res) => {
  try {
    const markdown = dbOperations.generarMarkdownInforme();
    if (req.query.download === 'true') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="informe_pasantias_bitacora.md"');
      return res.send(markdown);
    }
    res.json({
      success: true,
      markdown
    });
  } catch (error) {
    console.error('[Error GET /api/exportar-markdown]:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar el informe Markdown',
      details: error.message
    });
  }
});

// 4. DELETE /api/entradas/:id - Eliminar una entrada
app.delete('/api/entradas/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const deleted = dbOperations.eliminarEntrada(Number(id));
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Entrada no encontrada' });
    }
    res.json({ success: true, message: 'Entrada eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- GESTIÓN DE TAREAS & FECHAS (Stitch UI) ---

// GET /api/tareas
app.get('/api/tareas', requireAuth, (req, res) => {
  try {
    const tareas = dbOperations.getTareas();
    res.json({ success: true, data: tareas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tareas
app.post('/api/tareas', requireAuth, (req, res) => {
  try {
    const { texto, fecha, prioridad } = req.body;
    if (!texto || !texto.trim()) {
      return res.status(400).json({ success: false, error: 'El texto de la tarea es requerido.' });
    }
    const nuevaTarea = dbOperations.crearTarea({ texto, fecha, prioridad });
    res.status(201).json({ success: true, data: nuevaTarea });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/tareas/:id - Alternar estado completada
app.patch('/api/tareas/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { completada } = req.body;
    const actualizada = dbOperations.toggleTarea(Number(id), completada);
    res.json({ success: true, data: actualizada });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/tareas/:id
app.delete('/api/tareas/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const eliminada = dbOperations.eliminarTarea(Number(id));
    res.json({ success: true, eliminada });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- AJUSTES Y CONFIGURACIÓN DE IA ---

// GET /api/config
app.get('/api/config', requireAuth, (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey.trim() !== '' && apiKey !== 'tu_api_key_aqui');
  res.json({
    success: true,
    hasGeminiKey: isConfigured,
    model: 'gemini-2.5-flash',
    maskedKey: isConfigured ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : null
  });
});

// POST /api/config/key (SOLO ADMINISTRADOR)
app.post('/api/config/key', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ success: false, error: 'La API key no puede estar vacía.' });
    }
    process.env.GEMINI_API_KEY = apiKey.trim();
    dbOperations.registrarLogSeguridad(req.ip, 'GEMINI_KEY_UPDATED', `Admin @${req.user.username} actualizó la clave de Gemini`);
    res.json({ success: true, message: 'API Key actualizada correctamente para Gemini 2.5 Flash.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Servir frontend compilado en producción si existe frontend/dist
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  console.log(`[Producción] Sirviendo frontend estático desde: ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Inicializar servidor
app.listen(PORT, () => {
  console.log(`[Servidor] Bitácora Backend ejecutándose en http://localhost:${PORT}`);
});

