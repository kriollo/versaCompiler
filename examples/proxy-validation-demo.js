#!/usr/bin/env node

/**
 * Demo script para probar la validación de proxy de BrowserSync
 *
 * Este script simula diferentes escenarios de configuración de proxy
 * para demostrar cómo funciona la validación integrada.
 */

import {
    getProxyInfo,
    validateProxyAvailability,
} from '../src/utils/proxyValidator.ts';

const chalk = (await import('chalk')).default;

async function demoProxyValidation() {
    console.log(chalk.blue('🔍 Demo de Validación de Proxy - VersaCompiler\n'));

    const testCases = [
        {
            name: 'Servidor local no disponible',
            url: 'http://localhost:8080',
            description: 'Simula un servidor local que no está ejecutándose',
        },
        {
            name: 'Servidor externo disponible',
            url: 'https://httpbin.org',
            description: 'Servidor de pruebas HTTP disponible',
        },
        {
            name: 'URL inválida',
            url: 'invalid-url-format',
            description: 'URL con formato inválido',
        },
    ];

    for (const testCase of testCases) {
        console.log(chalk.yellow(`\n📋 Caso de prueba: ${testCase.name}`));
        console.log(chalk.gray(`   Descripción: ${testCase.description}`));
        console.log(chalk.gray(`   URL: ${testCase.url}`));

        console.log(chalk.cyan('   🔍 Validando disponibilidad...'));

        const startTime = Date.now();
        const isAvailable = await validateProxyAvailability(testCase.url, 5000);
        const endTime = Date.now();

        if (isAvailable) {
            console.log(
                chalk.green(
                    `   ✅ Servidor disponible (${endTime - startTime}ms)`,
                ),
            );
        } else {
            console.log(
                chalk.red(
                    `   ❌ Servidor no disponible (${endTime - startTime}ms)`,
                ),
            );

            const proxyInfo = getProxyInfo(testCase.url);
            console.log(chalk.red(`   📍 Host: ${proxyInfo.host}`));
            console.log(chalk.red(`   🔌 Puerto: ${proxyInfo.port}`));
            console.log(chalk.red(`   🔒 Protocolo: ${proxyInfo.protocol}`));

            // Simular la pregunta al usuario (sin esperar respuesta real)
            console.log(
                chalk.yellow(
                    '\n   ❓ En el flujo real, aquí se preguntaría al usuario:',
                ),
            );
            console.log(
                chalk.gray(
                    '   "¿Desea continuar de todos modos? El modo proxy podría no funcionar correctamente. (s/n):"',
                ),
            );
        }

        console.log(chalk.white('   ─'.repeat(60)));
    }

    console.log(chalk.green('\n🎉 Demo completado exitosamente!'));
    console.log(chalk.blue('\n📝 Resumen de la funcionalidad:'));
    console.log(
        chalk.white(
            '   • Valida la disponibilidad del servidor proxy antes de iniciar BrowserSync',
        ),
    );
    console.log(
        chalk.white(
            '   • Extrae información legible del proxy para mostrar al usuario',
        ),
    );
    console.log(
        chalk.white(
            '   • Permite al usuario decidir si continuar cuando el proxy no está disponible',
        ),
    );
    console.log(
        chalk.white('   • Integrado en el flujo de browserSyncServer()'),
    );
}

// Ejecutar demo
demoProxyValidation().catch(console.error);
