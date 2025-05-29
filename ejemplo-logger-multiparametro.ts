// Ejemplos de uso del Logger con múltiples parámetros
import { logger } from './dist/servicios/logger';

console.log('=== Ejemplos del Logger Modificado ===\n');

// Uso básico - un solo parámetro
logger.info('Aplicación iniciada');

// Múltiples strings
logger.info('Usuario logueado:', 'admin', 'con rol:', 'administrator');

// Combinando diferentes tipos de datos
const usuario = { id: 123, nombre: 'Juan Pérez', email: 'juan@example.com' };
const timestamp = new Date();
logger.info('Datos del usuario:', usuario, 'timestamp:', timestamp);

// Arrays y objetos
const configuracion = { timeout: 5000, retries: 3, debug: true };
const modulos = ['auth', 'database', 'api'];
logger.debug('Configuración:', configuracion, 'módulos cargados:', modulos);

// Warnings con contexto
logger.warn(
    'Archivo no encontrado:',
    '/path/to/file.txt',
    'usando fallback:',
    '/path/to/default.txt',
);

// Errores con objetos de error
const error = new Error('Conexión fallida');
const intentos = 3;
logger.error(
    'Error de conexión:',
    error.message,
    'intentos realizados:',
    intentos,
);

// Datos numéricos y booleanos
const puerto = 3000;
const https = false;
const memoria = { used: 512, total: 1024 };
logger.info(
    'Servidor iniciado en puerto:',
    puerto,
    'HTTPS:',
    https,
    'memoria:',
    memoria,
);

// Funciones con contexto complejo
function procesarPedido(id, usuario, items) {
    logger.debug(
        'Procesando pedido:',
        id,
        'para usuario:',
        usuario.nombre,
        'items:',
        items.length,
    );

    try {
        // Simulación de procesamiento
        const total = items.reduce((sum, item) => sum + item.precio, 0);
        logger.info(
            'Pedido procesado exitosamente:',
            id,
            'total:',
            total,
            'moneda:',
            'USD',
        );
    } catch (err) {
        logger.error(
            'Error procesando pedido:',
            id,
            'error:',
            err.message,
            'usuario:',
            usuario.id,
        );
    }
}

// Ejemplo de uso
const pedido = {
    items: [
        { nombre: 'Producto A', precio: 25.99 },
        { nombre: 'Producto B', precio: 15.5 },
    ],
};

procesarPedido('PED-001', usuario, pedido.items);

console.log('\n=== Fin de los Ejemplos ===');
