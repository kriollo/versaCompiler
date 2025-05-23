import { OxlintNode } from '@teambit/oxc.linter.oxlint-node';
import chalk from 'chalk';
import { spawnSync } from 'node:child_process';
export const linter = async filePath => {
    // 1. Calcula la ruta del binario
    const oxlintExe = 'npx oxlint';
    const args = filePath ? [filePath] : [];
    const processOXC = spawnSync(oxlintExe, args, {
        stdio: 'pipe',
        encoding: 'utf-8',
        shell: true,
    });
    if (processOXC.error) {
        console.error(
            chalk.red('🚨 Error ejecutando oxlint:', processOXC.error),
        );
        return false;
    }

    const output = processOXC.stdout.trim();
    if (!output) {
        console.log(chalk.green('✅ No se encontraron errores de linting.'));
        return true;
    }

    // Regex optimizado (unificado)
    const LINT_REGEX =
        /([×x!]|warning)\s+([^:]+):\s+([^\n]+)\n\s+[,╭][-─]\[([^\]]+)\][\s\S]+?help:\s+([^\n]+)/gi;
    const matches = output.matchAll(LINT_REGEX);
    let errorFiles = 0; // Reiniciar el contador de archivos con errores
    const errorList = []; // Lista de errores
    for (const match of matches) {
        const [_, severitySymbol, ruleId, message, filePath, help] = match;
        const normalizedPath = filePath.trim().replace(/\\/g, '/');

        errorFiles++;
        errorList.push({
            file: normalizedPath,
            error: `${ruleId}: ${message.trim()}`,
            proceso: 'Linting',
            help: help.trim(),
            severity: severitySymbol === '!' ? 'warning' : 'error',
        });
    }

    return {
        error: errorFiles > 0,
        errorFiles,
        errorList,
    };
};

export async function OxLint() {
    const oxlintNodes = await OxlintNode.create({
        formats: ['json', 'default'],
        configPath: './.oxlintrc.json',
    });
    try {
        await oxlintNodes.run(['src']);
    } catch (error) {
        return error.stdout;
    }
}
