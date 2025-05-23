import { spawnSync } from 'node:child_process';
import { env } from 'process';
import { logger } from '../servicios/pino.ts';

export async function generateTailwindCSS(_filePath = null) {
    if (env.tailwindcss === 'false' || env.tailwindcss === undefined) {
        return false;
    }
    try {
        const tailwindcssConfig = JSON.parse(env.tailwindcss);
        if (
            !tailwindcssConfig ||
            !tailwindcssConfig.input ||
            !tailwindcssConfig.output ||
            !tailwindcssConfig.cli
        ) {
            return false;
        }

        const cli = tailwindcssConfig.cli || 'npx tailwindcss';
        const arg = [
            '-i',
            ' ',
            tailwindcssConfig.input,
            ' ',
            '-o',
            tailwindcssConfig.output,
        ];
        const pressTailwind = spawnSync(cli, arg, {
            stdio: ['ignore', 'ignore', 'ignore'],
            shell: true,
        });
        if (pressTailwind.error) {
            throw pressTailwind.error;
        }
        return true;
    } catch (err) {
        logger.error('❌ :Error al compilar Tailwind:', err.stderr || err);
        throw err;
    }
}
