import { env } from 'node:process';
import { OxlintNode } from './../wrappers/oxlint-node.ts';
// import { OxlintNode } from '@teambit/oxc.linter.oxlint-node';

// export async function OxLint() {
//     const oxlintNodes = await OxlintNode.create({
//         formats: ['json', 'default'],
//         configPath: './.oxlintrc.json',
//     });
//     try {
//         await oxlintNodes.run(['src']);
//     } catch (error) {
//         return error.stdout;
//     }
// }

export async function OxLint() {
    if (env.oxlint === 'false' || env.oxlint === undefined) {
        return false;
    }
    try {
        const oxlintConfig = JSON.parse(env.oxlint);
        if (!oxlintConfig || !oxlintConfig.bin || !oxlintConfig.configFile) {
            return false;
        }

        const oxlintRunner = new OxlintNode({
            fix: oxlintConfig?.fix || false, // Intentar arreglar problemas
            configFile: oxlintConfig.configFile, // Usar un archivo de configuración específico
            binPath: oxlintConfig.bin, // Ruta al binario de OxLint
            formats: ['json'], // Formatos de salida
        });

        return await oxlintRunner.run([env.PATH_SOURCE || './src']);
    } catch (err) {
        console.error('❌ :Error al compilar OxLint:', err);
        throw err;
    }
}
