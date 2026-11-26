import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '  🚀 INICIANDO BITÁCORA DE PASANTÍAS (PWA + BACKEND)       ');
console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════\n');

const isWindows = process.platform === 'win32';

// 1. Iniciar Backend (Express + SQLite + Gemini)
const backend = spawn(isWindows ? 'cmd.exe' : 'node', isWindows ? ['/c', 'node --watch src/index.js'] : ['--watch', 'src/index.js'], {
  cwd: path.resolve(__dirname, 'backend'),
  stdio: 'pipe',
  env: process.env
});

backend.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[34m[BACKEND]\x1b[0m ${data.toString()}`);
});

backend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[BACKEND-ERR]\x1b[0m ${data.toString()}`);
});

// 2. Iniciar Frontend (Vite PWA)
const frontend = spawn(isWindows ? 'cmd.exe' : 'npm', isWindows ? ['/c', 'npm run dev'] : ['run', 'dev'], {
  cwd: path.resolve(__dirname, 'frontend'),
  stdio: 'pipe',
  env: process.env
});

frontend.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[32m[FRONTEND]\x1b[0m ${data.toString()}`);
});

frontend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[33m[FRONTEND-WARN]\x1b[0m ${data.toString()}`);
});

// Manejo de salida limpia
const cleanup = () => {
  console.log('\n\x1b[36m%s\x1b[0m', 'Deteniendo servidores...');
  backend.kill();
  frontend.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

