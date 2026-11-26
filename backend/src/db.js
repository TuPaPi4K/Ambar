import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Funciones de hash seguras con módulo nativo de Node.js (scrypt)
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidateHash = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidateHash, 'hex'));
  } catch {
    return false;
  }
}

// El archivo bitacora.db se ubica en la raíz de /backend (o en la ruta DB_PATH si se monta un volumen persistente)
const dbPath = process.env.DB_PATH || path.resolve(__dirname, '..', 'bitacora.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

// Modo WAL para óptimo rendimiento y concurrencia
db.pragma('journal_mode = WAL');

// Inicializar tablas si no existen
const initSchema = () => {
  const query = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT,
      evento TEXT NOT NULL,
      detalles TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS tareas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      texto TEXT NOT NULL,
      completada INTEGER NOT NULL DEFAULT 0,
      fecha TEXT NOT NULL DEFAULT (date('now', 'localtime')),
      prioridad TEXT DEFAULT 'normal',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS entradas_bitacora (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL DEFAULT (date('now', 'localtime')),
      titulo TEXT NOT NULL,
      horas_trabajadas REAL NOT NULL DEFAULT 0,
      actividades TEXT NOT NULL,
      tecnologias_usadas TEXT,
      aprendizaje_clave TEXT,
      audio_duracion INTEGER DEFAULT 0,
      transcripcion_original TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `;
  db.exec(query);

  // Migraciones dinámicas para tablas existentes
  const colsUsuarios = db.prepare('PRAGMA table_info(usuarios)').all().map(c => c.name);
  if (!colsUsuarios.includes('role')) {
    db.exec("ALTER TABLE usuarios ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
  }
  if (!colsUsuarios.includes('failed_login_attempts')) {
    db.exec("ALTER TABLE usuarios ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0");
  }
  if (!colsUsuarios.includes('locked_until')) {
    db.exec("ALTER TABLE usuarios ADD COLUMN locked_until TEXT DEFAULT NULL");
  }

  // Sembrar usuario principal si no existe ninguno
  const checkUser = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
  if (checkUser.count === 0) {
    const defaultHash = hashPassword('pasante123');
    db.prepare(`
      INSERT INTO usuarios (username, password_hash, nombre, role)
      VALUES (?, ?, ?, 'admin')
    `).run('pasante', defaultHash, 'Pasante Principal');
    console.log('[DB] Cuenta Principal Administradora creada: usuario="pasante", contraseña="pasante123", rol="admin"');
  } else {
    // Asegurar que la primera cuenta sea siempre Administrador Principal
    db.exec("UPDATE usuarios SET role = 'admin' WHERE id = 1 OR username = 'pasante'");
  }

  console.log(`[DB] Base de datos inicializada con módulos de seguridad en: ${dbPath}`);
};

initSchema();

// Métodos auxiliares de acceso a datos (sin ORM, SQL nativo)
export const dbOperations = {
  // --- MÓDULO DE SEGURIDAD Y AUDITORÍA ---
  registrarLogSeguridad: (ip, evento, detalles) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO security_logs (ip, evento, detalles)
        VALUES (?, ?, ?)
      `);
      stmt.run(ip || '127.0.0.1', evento, typeof detalles === 'object' ? JSON.stringify(detalles) : String(detalles));
    } catch (e) {
      console.error('[DB Security Log Error]:', e);
    }
  },

  getLogsSeguridad: (limit = 50) => {
    return db.prepare('SELECT * FROM security_logs ORDER BY id DESC LIMIT ?').all(limit);
  },

  // Autenticación Segura con Protección Anti Fuerza Bruta
  getUsuarioByUsername: (username) => {
    return db.prepare('SELECT id, username, password_hash, nombre, role, failed_login_attempts, locked_until, created_at FROM usuarios WHERE username = ?').get(username.trim().toLowerCase());
  },

  getUsuarioById: (id) => {
    return db.prepare('SELECT id, username, nombre, role, created_at FROM usuarios WHERE id = ?').get(id);
  },

  getUsuariosTodos: () => {
    return db.prepare('SELECT id, username, nombre, role, created_at FROM usuarios ORDER BY id ASC').all();
  },

  crearUsuario: ({ username, password, nombre, role = 'user' }) => {
    const password_hash = hashPassword(password);
    const stmt = db.prepare(`
      INSERT INTO usuarios (username, password_hash, nombre, role)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(username.trim().toLowerCase(), password_hash, nombre.trim(), role);
    return dbOperations.getUsuarioById(info.lastInsertRowid);
  },

  eliminarUsuario: (id, requesterId) => {
    if (Number(id) === Number(requesterId)) {
      throw new Error('No puedes eliminar tu propia cuenta de Administrador Principal.');
    }
    const stmt = db.prepare('DELETE FROM usuarios WHERE id = ?');
    const info = stmt.run(Number(id));
    return info.changes > 0;
  },

  verificarCredencialesAvanzado: (username, password, ip) => {
    const cleanUser = username.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM usuarios WHERE username = ?').get(cleanUser);

    if (!user) {
      // Registrar intento fallido genérico para evitar enumeración de usuarios
      dbOperations.registrarLogSeguridad(ip, 'LOGIN_FAILED_UNKNOWN_USER', `Usuario inexistente: ${cleanUser}`);
      return { status: 'INVALID', error: 'Credenciales inválidas.' };
    }

    // 1. Verificar si la cuenta está bloqueada temporalmente
    if (user.locked_until) {
      const now = new Date();
      const lockDate = new Date(user.locked_until);
      if (now < lockDate) {
        const remainingMinutes = Math.ceil((lockDate - now) / 60000);
        dbOperations.registrarLogSeguridad(ip, 'LOGIN_BLOCKED_ATTEMPT', `Cuenta bloqueada intentó entrar: ${cleanUser}`);
        return {
          status: 'LOCKED',
          error: `Cuenta bloqueada temporalmente por seguridad debido a múltiples intentos fallidos. Intenta nuevamente en ${remainingMinutes} minutos.`
        };
      } else {
        // Bloqueo expiró: desbloquear automáticamente
        db.prepare('UPDATE usuarios SET locked_until = NULL, failed_login_attempts = 0 WHERE id = ?').run(user.id);
      }
    }

    // 2. Verificar contraseña con timing-safe compare
    const match = verifyPassword(password, user.password_hash);
    if (!match) {
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      let isNowLocked = false;

      if (newAttempts >= 5) {
        // Bloquear durante 15 minutos tras 5 intentos fallidos
        db.prepare("UPDATE usuarios SET failed_login_attempts = ?, locked_until = datetime('now', '+15 minutes') WHERE id = ?").run(newAttempts, user.id);
        isNowLocked = true;
        dbOperations.registrarLogSeguridad(ip, 'ACCOUNT_LOCKED', `Cuenta bloqueada por 15 min tras 5 intentos fallidos: ${cleanUser}`);
      } else {
        db.prepare('UPDATE usuarios SET failed_login_attempts = ? WHERE id = ?').run(newAttempts, user.id);
        dbOperations.registrarLogSeguridad(ip, 'LOGIN_FAILED_PASSWORD', `Contraseña errónea para ${cleanUser} (intento ${newAttempts}/5)`);
      }

      return {
        status: isNowLocked ? 'LOCKED' : 'INVALID',
        error: isNowLocked
          ? 'Has excedido el número máximo de intentos permitidos (5). La cuenta ha sido bloqueada temporalmente por 15 minutos.'
          : `Credenciales inválidas. Tienes ${5 - newAttempts} intentos restantes antes del bloqueo temporal.`
      };
    }

    // 3. Inicio exitoso: reiniciar contador de fallos
    db.prepare('UPDATE usuarios SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
    dbOperations.registrarLogSeguridad(ip, 'LOGIN_SUCCESS', `Inicio de sesión exitoso: ${cleanUser} (Rol: ${user.role})`);

    return {
      status: 'SUCCESS',
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        role: user.role || 'user',
        created_at: user.created_at
      }
    };
  },

  // Gestión de Tareas & Fechas (Stitch UI)
  getTareas: () => {
    return db.prepare('SELECT * FROM tareas ORDER BY completada ASC, id DESC').all();
  },

  crearTarea: ({ texto, fecha, prioridad = 'normal' }) => {
    const stmt = db.prepare(`
      INSERT INTO tareas (texto, fecha, prioridad)
      VALUES (?, COALESCE(?, date('now', 'localtime')), ?)
    `);
    const info = stmt.run(texto.trim(), fecha || null, prioridad);
    return db.prepare('SELECT * FROM tareas WHERE id = ?').get(info.lastInsertRowid);
  },

  toggleTarea: (id, completada) => {
    const stmt = db.prepare('UPDATE tareas SET completada = ? WHERE id = ?');
    stmt.run(completada ? 1 : 0, id);
    return db.prepare('SELECT * FROM tareas WHERE id = ?').get(id);
  },

  eliminarTarea: (id) => {
    const stmt = db.prepare('DELETE FROM tareas WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  },

  getEntradas: () => {
    const stmt = db.prepare('SELECT * FROM entradas_bitacora ORDER BY id DESC');
    const rows = stmt.all();
    return rows.map(row => ({
      ...row,
      actividades: safeJsonParse(row.actividades),
      tecnologias_usadas: safeJsonParse(row.tecnologias_usadas)
    }));
  },

  getEntradaById: (id) => {
    const stmt = db.prepare('SELECT * FROM entradas_bitacora WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    return {
      ...row,
      actividades: safeJsonParse(row.actividades),
      tecnologias_usadas: safeJsonParse(row.tecnologias_usadas)
    };
  },

  crearEntrada: ({
    fecha,
    titulo,
    horas_trabajadas = 0,
    actividades = [],
    tecnologias_usadas = [],
    aprendizaje_clave = '',
    audio_duracion = 0,
    transcripcion_original = ''
  }) => {
    const stmt = db.prepare(`
      INSERT INTO entradas_bitacora (
        fecha,
        titulo,
        horas_trabajadas,
        actividades,
        tecnologias_usadas,
        aprendizaje_clave,
        audio_duracion,
        transcripcion_original
      ) VALUES (
        COALESCE(?, date('now', 'localtime')),
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `);

    const actividadesStr = typeof actividades === 'string' ? actividades : JSON.stringify(actividades);
    const tecnologiasStr = typeof tecnologias_usadas === 'string' ? tecnologias_usadas : JSON.stringify(tecnologias_usadas);

    const info = stmt.run(
      fecha || null,
      titulo,
      Number(horas_trabajadas) || 0,
      actividadesStr,
      tecnologiasStr,
      aprendizaje_clave,
      Number(audio_duracion) || 0,
      transcripcion_original
    );

    return dbOperations.getEntradaById(info.lastInsertRowid);
  },

  eliminarEntrada: (id) => {
    const stmt = db.prepare('DELETE FROM entradas_bitacora WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  },

  generarMarkdownInforme: () => {
    const entradas = dbOperations.getEntradas();
    if (entradas.length === 0) {
      return '# Informe de Pasantías\n\nNo hay registros guardados en la bitácora todavía.';
    }

    const totalHoras = entradas.reduce((acc, curr) => acc + (Number(curr.horas_trabajadas) || 0), 0);
    const todasTecnologias = new Set();
    entradas.forEach(e => {
      if (Array.isArray(e.tecnologias_usadas)) {
        e.tecnologias_usadas.forEach(t => todasTecnologias.add(t));
      }
    });

    const primeraFecha = entradas[entradas.length - 1].fecha;
    const ultimaFecha = entradas[0].fecha;

    let md = `# Informe de Actividades de Pasantías\n\n`;
    md += `> **Generado el:** ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
    md += `> **Periodo cubierto:** ${primeraFecha} al ${ultimaFecha}\n`;
    md += `> **Total de horas acumuladas:** ${totalHoras.toFixed(1)} hrs\n`;
    md += `> **Tecnologías utilizadas:** ${Array.from(todasTecnologias).join(', ') || 'N/A'}\n\n`;
    md += `---\n\n`;
    md += `## Resumen Ejecutivo de la Bitácora\n\n`;
    md += `| Fecha | Título de la Jornada | Horas | Tecnologías Clave |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;

    entradas.forEach(e => {
      const techs = Array.isArray(e.tecnologias_usadas) ? e.tecnologias_usadas.slice(0, 3).join(', ') : '';
      md += `| ${e.fecha} | ${e.titulo} | ${e.horas_trabajadas} hrs | ${techs} |\n`;
    });

    md += `\n---\n\n`;
    md += `## Detalle Diario de Actividades\n\n`;

    entradas.forEach((e, idx) => {
      md += `### ${idx + 1}. [${e.fecha}] ${e.titulo}\n`;
      md += `- **Horas dedicadas:** ${e.horas_trabajadas} horas\n`;
      if (Array.isArray(e.tecnologias_usadas) && e.tecnologias_usadas.length > 0) {
        md += `- **Herramientas & Tecnologías:** ${e.tecnologias_usadas.map(t => `\`${t}\``).join(' ')}\n`;
      }
      md += `\n**Actividades desarrolladas:**\n`;
      if (Array.isArray(e.actividades)) {
        e.actividades.forEach(act => {
          md += `- ${act}\n`;
        });
      } else {
        md += `${e.actividades}\n`;
      }

      if (e.aprendizaje_clave) {
        md += `\n**Aprendizaje clave & Reflexión:**\n`;
        md += `> *${e.aprendizaje_clave}*\n`;
      }

      md += `\n---\n\n`;
    });

    return md;
  }
};

function safeJsonParse(val) {
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

export default db;

