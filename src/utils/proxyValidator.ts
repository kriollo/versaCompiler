import { get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';
import { URL } from 'node:url';

/**
 * Valida si un servidor proxy está disponible
 * @param proxyUrl URL del proxy a validar
 * @param timeout Timeout en milisegundos (default: 5000)
 * @returns Promise que resuelve a true si el proxy está disponible
 */
export async function validateProxyAvailability(
    proxyUrl: string,
    timeout: number = 5000,
): Promise<boolean> {
    return new Promise(resolve => {
        try {
            const url = new URL(proxyUrl);
            const isHttps = url.protocol === 'https:';
            const requestMethod = isHttps ? httpsGet : httpGet;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: '/',
                method: 'HEAD',
                timeout: timeout,
                headers: {
                    'User-Agent': 'VersaCompiler-ProxyValidator/1.0',
                },
            };
            const req = requestMethod(options, _res => {
                // Cualquier respuesta HTTP (incluso errores 4xx/5xx) indica que el servidor está arriba
                resolve(true);
            });

            req.on('error', () => {
                resolve(false);
            });

            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            req.setTimeout(timeout);
            req.end();
        } catch {
            // Error al parsear URL o crear request
            resolve(false);
        }
    });
}

/**
 * Extrae información legible del proxy URL para mostrar al usuario
 * @param proxyUrl URL del proxy
 * @returns Objeto con información del proxy
 */
export function getProxyInfo(proxyUrl: string): {
    host: string;
    port: string;
    protocol: string;
} {
    try {
        const url = new URL(proxyUrl);
        return {
            host: url.hostname,
            port: url.port || (url.protocol === 'https:' ? '443' : '80'),
            protocol: url.protocol.replace(':', ''),
        };
    } catch {
        return {
            host: 'unknown',
            port: 'unknown',
            protocol: 'unknown',
        };
    }
}
