// Test del logger modificado para múltiples parámetros
const { logger } = require('./dist/servicios/logger.ts');

console.log('=== Pruebas del Logger Modificado ===\n');

// Pruebas con diferentes tipos y cantidades de argumentos
logger.info('Mensaje simple');
logger.info('Usuario:', 'Juan', 'ID:', 123);
logger.info('Datos complejos:', { name: 'Ana', age: 25 }, [1, 2, 3]);

logger.warn('Advertencia con datos:', 'archivo.txt', 'no encontrado');
logger.error('Error con objeto:', { code: 404, message: 'Not Found' });

logger.debug(
    'Debug múltiple:',
    'variable1:',
    42,
    'variable2:',
    true,
    'variable3:',
    null,
);

// Ejemplo con objetos y arrays mezclados
const user = { name: 'Pedro', roles: ['admin', 'user'] };
const config = { timeout: 5000, retries: 3 };
logger.info('Configuración de usuario:', user, 'con config:', config);

console.log('\n=== Fin de las Pruebas ===');
