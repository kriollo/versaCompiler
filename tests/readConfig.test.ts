import { describe, expect, it } from 'vitest';
import { validateCommand, validatePath } from '../src/servicios/readConfig';

describe('Security - Path Validation', () => {
    describe('validatePath', () => {
        it('should reject path traversal attempts with ../', () => {
            expect(validatePath('../../../etc/passwd')).toBe(false);
            expect(validatePath('../../sensitive')).toBe(false);
            expect(validatePath('../config')).toBe(false);
        });

        it('should reject absolute paths outside workspace', () => {
            expect(validatePath('/etc/passwd')).toBe(false);
            expect(validatePath('C:\\Windows\\System32')).toBe(false);
        });

        it('should reject command injection attempts', () => {
            expect(validatePath('test; rm -rf /')).toBe(false);
            expect(validatePath('test | cat /etc/passwd')).toBe(false);
            expect(validatePath('test$(whoami)')).toBe(false);
            expect(validatePath('test`whoami`')).toBe(false);
            expect(validatePath('test && rm -rf /')).toBe(false);
            expect(validatePath('test || echo "hacked"')).toBe(false);
        });

        it('should reject paths with dangerous characters', () => {
            expect(validatePath('test\x00null')).toBe(false);
            expect(validatePath('test\nnewline')).toBe(false);
            expect(validatePath('test\rcarriage')).toBe(false);
        });

        it('should reject excessively long paths (>260 chars)', () => {
            const longPath = 'a'.repeat(300);
            expect(validatePath(longPath)).toBe(false);
        });

        it('should accept valid relative paths', () => {
            expect(validatePath('src/components')).toBe(true);
            expect(validatePath('./dist/output.js')).toBe(true);
            expect(validatePath('folder/subfolder/file.ts')).toBe(true);
        });

        it('should accept paths with spaces and common special chars', () => {
            expect(validatePath('my folder/file name.ts')).toBe(true);
            expect(validatePath('folder-name/file_name.ts')).toBe(true);
            expect(validatePath('folder.name/file.name.ts')).toBe(true);
        });

        it('should reject empty string or undefined', () => {
            expect(validatePath('')).toBe(false);
            expect(validatePath(undefined as any)).toBe(false);
        });
    });

    describe('validateCommand', () => {
        it('should reject commands with dangerous characters', () => {
            expect(validateCommand('test; rm -rf /')).toBe(false);
            expect(validateCommand('test | cat /etc/passwd')).toBe(false);
            expect(validateCommand('test$(whoami)')).toBe(false);
            expect(validateCommand('test`whoami`')).toBe(false);
            expect(validateCommand('test && malicious')).toBe(false);
            expect(validateCommand('test || echo hacked')).toBe(false);
        });

        it('should reject commands with null bytes', () => {
            expect(validateCommand('test\x00command')).toBe(false);
        });

        it('should reject simple commands without validation', () => {
            // validateCommand rechaza comandos que no pasan validación estricta
            expect(validateCommand('npm')).toBe(false);
            expect(validateCommand('node')).toBe(false);
        });

        it('should reject commands with potentially dangerous content', () => {
            expect(validateCommand('eslint --fix')).toBe(false);
            expect(validateCommand('npm install')).toBe(false);
        });

        it('should reject empty string or undefined', () => {
            expect(validateCommand('')).toBe(false);
            expect(validateCommand(undefined as any)).toBe(false);
        });
    });
});

// NOTA: loadConfig no está exportado, por lo que no se puede testear directamente
// Los tests de loadConfig se omiten porque la función es interna

describe('Configuration Security Edge Cases', () => {
    it('should handle null bytes in configuration', () => {
        const pathWithNull = 'test\x00malicious';
        expect(validatePath(pathWithNull)).toBe(false);
    });

    it('should handle unicode exploits in paths', () => {
        // Pruebas con caracteres unicode que podrían ser interpretados como /
        const unicodePath = 'test\u2044malicious'; // FRACTION SLASH
        expect(validatePath(unicodePath)).toBe(false); // Debería rechazar caracteres unicode especiales
    });

    it('should handle mixed separators in paths', () => {
        const mixedPath = 'folder/subfolder\\file.ts';
        expect(validatePath(mixedPath)).toBe(true); // Debería normalizar
    });

    it('should handle relative path components', () => {
        expect(validatePath('./folder/../other')).toBe(true); // Puede ser válido si se normaliza
        expect(validatePath('../../escape')).toBe(false); // Escape fuera del workspace
    });
});
