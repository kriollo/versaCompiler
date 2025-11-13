import { showTimingForHumans } from '../src/utils/utils';
import { getProxyInfo } from '../src/utils/proxyValidator';

// Declaraciones de tipos para los globals de Vitest
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: (value: unknown) => {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
};

describe('Utils - Funciones de utilidad', () => {
    describe('showTimingForHumans', () => {
        it('debe mostrar milisegundos para valores menores a 1000', () => {
            expect(showTimingForHumans(500)).toBe('500 ms');
            expect(showTimingForHumans(999)).toBe('999 ms');
            expect(showTimingForHumans(0)).toBe('0 ms');
        });

        it('debe mostrar segundos para valores entre 1000 y 59999', () => {
            expect(showTimingForHumans(1000)).toBe('1 s');
            expect(showTimingForHumans(1500)).toBe('1.5 s');
            expect(showTimingForHumans(59999)).toBe('59.999 s');
        });

        it('debe mostrar minutos para valores entre 60000 y 3599999', () => {
            expect(showTimingForHumans(60000)).toBe('1 min');
            expect(showTimingForHumans(120000)).toBe('2 min');
            expect(showTimingForHumans(3599999)).toBe('59.99998333333333 min');
        });

        it('debe mostrar horas para valores mayores o iguales a 3600000', () => {
            expect(showTimingForHumans(3600000)).toBe('1 h');
            expect(showTimingForHumans(7200000)).toBe('2 h');
            expect(showTimingForHumans(3660000)).toBe('1.0166666666666666 h');
        });
    });

    describe('getProxyInfo', () => {
        it('debe extraer información correcta de una URL HTTP válida', () => {
            const result = getProxyInfo('http://proxy.example.com:8080');
            expect(result).toEqual({
                host: 'proxy.example.com',
                port: '8080',
                protocol: 'http',
            });
        });

        it('debe extraer información correcta de una URL HTTPS válida', () => {
            const result = getProxyInfo(
                'https://secure-proxy.example.com:8443',
            );
            expect(result).toEqual({
                host: 'secure-proxy.example.com',
                port: '8443',
                protocol: 'https',
            });
        });

        it('debe usar puerto por defecto para HTTP cuando no se especifica', () => {
            const result = getProxyInfo('http://proxy.example.com');
            expect(result).toEqual({
                host: 'proxy.example.com',
                port: '80',
                protocol: 'http',
            });
        });

        it('debe usar puerto por defecto para HTTPS cuando no se especifica', () => {
            const result = getProxyInfo('https://secure-proxy.example.com');
            expect(result).toEqual({
                host: 'secure-proxy.example.com',
                port: '443',
                protocol: 'https',
            });
        });

        it('debe devolver valores unknown para URLs inválidas', () => {
            const result = getProxyInfo('invalid-url');
            expect(result).toEqual({
                host: 'unknown',
                port: 'unknown',
                protocol: 'unknown',
            });
        });

        it('debe manejar URLs malformadas', () => {
            const result = getProxyInfo('not-a-url-at-all');
            expect(result).toEqual({
                host: 'unknown',
                port: 'unknown',
                protocol: 'unknown',
            });
        });
    });
});
