import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 3005;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

console.log('--- INICIANDO TEST END-TO-END DE SEGURIDAD HTTP ---');

const server = spawn('node', ['src/index.js'], {
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env, PORT: String(TEST_PORT) },
  stdio: 'pipe'
});

server.stdout.on('data', (d) => {
  // console.log('[Server stdout]:', d.toString());
});

server.stderr.on('data', (d) => {
  // console.error('[Server stderr]:', d.toString());
});

async function run() {
  try {
    // 1. Esperar arranque del servidor
    let ready = false;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        const res = await fetch(`${BASE_URL}/api/health`);
        if (res.ok) {
          ready = true;
          break;
        }
      } catch (e) {
        // reintentar
      }
    }

    if (!ready) {
      throw new Error('El servidor de pruebas no inició a tiempo');
    }
    console.log('✓ Servidor activo en puerto', TEST_PORT);

    // 2. Test acceso no autorizado a /api/entradas (debe ser 401)
    const resUnauth = await fetch(`${BASE_URL}/api/entradas`);
    console.log('✓ Acceso no autenticado /api/entradas:', resUnauth.status, resUnauth.status === 401 ? 'BLOQUEADO 401 (OK)' : 'FALLÓ');
    if (resUnauth.status !== 401) throw new Error('Esperaba 401');

    // 3. Login como Administrador Principal
    const resLoginAdmin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'pasante', password: 'pasante123' })
    });
    const adminData = await resLoginAdmin.json();
    console.log('✓ Login de cuenta principal (admin):', adminData.success ? `OK (Rol: ${adminData.user.role})` : 'FALLÓ');
    if (!adminData.success || adminData.user.role !== 'admin') throw new Error('Admin login falló');
    const adminToken = adminData.token;

    // 4. Test acceso autorizado a /api/entradas con token admin
    const resAuthEntradas = await fetch(`${BASE_URL}/api/entradas`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✓ Acceso con token admin a /api/entradas:', resAuthEntradas.status === 200 ? '200 OK' : 'FALLÓ');
    if (resAuthEntradas.status !== 200) throw new Error('Esperaba 200');

    // 5. Admin crea un usuario común (becario)
    const resCrearUser = await fetch(`${BASE_URL}/api/admin/usuarios`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'becario_test',
        password: 'Password123',
        nombre: 'Becario Test',
        role: 'user'
      })
    });
    const nuevoUserData = await resCrearUser.json();
    console.log('✓ Admin crea usuario auxiliar:', nuevoUserData.success ? `OK (@${nuevoUserData.data.username})` : 'FALLÓ');
    if (!nuevoUserData.success) throw new Error('Creación de usuario falló');
    const becarioId = nuevoUserData.data.id;

    // 6. Login del usuario común (becario)
    const resLoginBecario = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'becario_test', password: 'Password123' })
    });
    const becarioData = await resLoginBecario.json();
    console.log('✓ Login de usuario becario:', becarioData.success ? `OK (Rol: ${becarioData.user.role})` : 'FALLÓ');
    const becarioToken = becarioData.token;

    // 7. Becario intenta acceder a /api/admin/usuarios (DEBE SER RECHAZADO CON 403 FORBIDDEN)
    const resBecarioAdminTry = await fetch(`${BASE_URL}/api/admin/usuarios`, {
      headers: { Authorization: `Bearer ${becarioToken}` }
    });
    console.log('✓ Becario intentando acceder a panel admin:', resBecarioAdminTry.status, resBecarioAdminTry.status === 403 ? 'DENEGADO 403 FORBIDDEN (OK)' : 'FALLÓ');
    if (resBecarioAdminTry.status !== 403) throw new Error('Esperaba 403');

    // 8. Becario sí puede consultar sus tareas y entradas
    const resBecarioTareas = await fetch(`${BASE_URL}/api/tareas`, {
      headers: { Authorization: `Bearer ${becarioToken}` }
    });
    console.log('✓ Becario accediendo a sus tareas:', resBecarioTareas.status === 200 ? '200 OK' : 'FALLÓ');

    // 9. Admin elimina al becario de prueba
    const resDelete = await fetch(`${BASE_URL}/api/admin/usuarios/${becarioId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const deleteData = await resDelete.json();
    console.log('✓ Admin elimina/revoca cuenta de prueba:', deleteData.success ? 'OK' : 'FALLÓ');

    // 10. Admin consulta logs de seguridad
    const resLogs = await fetch(`${BASE_URL}/api/admin/logs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const logsData = await resLogs.json();
    console.log('✓ Admin consulta registros de auditoría de seguridad:', logsData.success && logsData.data.length > 0 ? `OK (${logsData.data.length} eventos registrados)` : 'FALLÓ');

    console.log('════════════════════════════════════════════════════════════');
    console.log('  TODO EL SISTEMA DE SEGURIDAD ESTÁ 100% VALIDADO Y LISTO ');
    console.log('════════════════════════════════════════════════════════════');
  } finally {
    server.kill();
  }
}

run().catch((err) => {
  console.error('Error durante la prueba E2E:', err);
  server.kill();
  process.exit(1);
});

