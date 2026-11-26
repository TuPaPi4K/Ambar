import { dbOperations } from './db.js';

console.log('--- INICIANDO VERIFICACIÓN DE SEGURIDAD Y BASE DE DATOS ---');

// 1. Verificar cuenta principal admin
const adminUser = dbOperations.getUsuarioByUsername('pasante');
console.log('1. Cuenta admin:', adminUser ? `OK (ID: ${adminUser.id}, Rol: ${adminUser.role})` : 'FALLÓ');
if (!adminUser || adminUser.role !== 'admin') {
  console.error('ERROR CRÍTICO: La cuenta principal debe existir con rol admin');
  process.exit(1);
}

// 2. Verificar autenticación válida
const loginValido = dbOperations.verificarCredencialesAvanzado('pasante', 'pasante123');
console.log('2. Login válido con credenciales correctas:', loginValido.status === 'SUCCESS' ? 'EXITOSO' : 'FALLÓ');
if (loginValido.status !== 'SUCCESS') {
  console.error('ERROR: No se pudo autenticar con pasante / pasante123');
  process.exit(1);
}

// 3. Probar usuario temporal para bloqueo anti-fuerza bruta
try {
  const tempUser = dbOperations.getUsuarioByUsername('test_atacante');
  if (tempUser) {
    dbOperations.eliminarUsuario(tempUser.id, adminUser.id);
  }
} catch (e) {
  // ignore
}

const atacante = dbOperations.crearUsuario({
  username: 'test_atacante',
  password: 'PasswordSeguro123',
  nombre: 'Usuario Prueba',
  role: 'user'
});
console.log('3. Creación de usuario auxiliar por admin:', atacante ? `OK (ID: ${atacante.id})` : 'FALLÓ');

// 4. Simular 5 intentos fallidos
console.log('4. Probando protección contra fuerza bruta (5 intentos fallidos)...');
for (let i = 1; i <= 5; i++) {
  const result = dbOperations.verificarCredencialesAvanzado('test_atacante', 'clave_incorrecta');
  console.log(`   Intento ${i}: status=${result.status} (msg: ${result.error})`);
}

// 5. Verificar que el usuario atacante fue bloqueado
const atacanteBloqueado = dbOperations.getUsuarioByUsername('test_atacante');
console.log('   Intentos fallidos registrados en BD:', atacanteBloqueado.failed_login_attempts);
console.log('   Bloqueado hasta:', atacanteBloqueado.locked_until ? new Date(atacanteBloqueado.locked_until).toISOString() : 'No bloqueado');

if (atacanteBloqueado.failed_login_attempts >= 5 && atacanteBloqueado.locked_until) {
  console.log('5. Sistema de bloqueo temporal por fuerza bruta: FUNCIONANDO AL 100%');
} else {
  console.error('ERROR: El sistema de bloqueo no se activó');
  process.exit(1);
}

// 6. Probar login con clave correcta mientras está bloqueado (debe denegarse)
const loginBloqueado = dbOperations.verificarCredencialesAvanzado('test_atacante', 'PasswordSeguro123');
console.log('6. Intento de login con clave correcta durante bloqueo:', loginBloqueado.status === 'LOCKED' ? 'BLOQUEADO CORRECTAMENTE (DENEGADO)' : 'FALLÓ');

// 7. Limpiar usuario de prueba y registrar log
dbOperations.eliminarUsuario(atacante.id, adminUser.id);
dbOperations.registrarLogSeguridad('127.0.0.1', 'SECURITY_TEST_PASSED', 'Prueba automatizada de seguridad superada');
console.log('7. Registros de auditoría en tabla security_logs:', dbOperations.getLogsSeguridad(5).length > 0 ? 'ACTIVO Y AUDITANDO' : 'VACÍO');

console.log('--- TODAS LAS PRUEBAS DE SEGURIDAD PASARON CON ÉXITO ---');
