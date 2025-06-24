import {
    getProxyInfo,
    validateProxyAvailability,
} from '../src/utils/proxyValidator';

describe('Proxy Validation', () => {
    describe('validateProxyAvailability', () => {
        it('should return false for non-existent server', async () => {
            const result = await validateProxyAvailability(
                'http://localhost:9999',
                2000,
            );
            expect(result).toBe(false);
        }, 10000);

        it('should return false for invalid URL', async () => {
            const result = await validateProxyAvailability('invalid-url', 2000);
            expect(result).toBe(false);
        }, 10000);

        it('should return true for valid reachable server (google.com)', async () => {
            const result = await validateProxyAvailability(
                'https://www.google.com',
                5000,
            );
            expect(result).toBe(true);
        }, 10000);
    });

    describe('getProxyInfo', () => {
        it('should extract correct info from HTTP URL', () => {
            const info = getProxyInfo('http://localhost:3000');
            expect(info.host).toBe('localhost');
            expect(info.port).toBe('3000');
            expect(info.protocol).toBe('http');
        });

        it('should extract correct info from HTTPS URL', () => {
            const info = getProxyInfo('https://example.com:8080');
            expect(info.host).toBe('example.com');
            expect(info.port).toBe('8080');
            expect(info.protocol).toBe('https');
        });

        it('should use default ports', () => {
            const httpInfo = getProxyInfo('http://example.com');
            expect(httpInfo.port).toBe('80');

            const httpsInfo = getProxyInfo('https://example.com');
            expect(httpsInfo.port).toBe('443');
        });

        it('should handle invalid URLs gracefully', () => {
            const info = getProxyInfo('invalid-url');
            expect(info.host).toBe('unknown');
            expect(info.port).toBe('unknown');
            expect(info.protocol).toBe('unknown');
        });
    });
});
