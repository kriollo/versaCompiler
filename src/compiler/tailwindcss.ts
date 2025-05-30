import { env } from 'node:process';

import { logger } from '../servicios/logger';
import { TailwindNode } from '../wrappers/tailwind-node';
export async function generateTailwindCSS() {
    if (
        env.tailwindcss === 'false' ||
        env.tailwindcss === undefined ||
        env.TAILWIND === 'false'
    ) {
        return false;
    }
    try {
        const tailwindcssConfig = JSON.parse(env.tailwindcss);
        if (
            !tailwindcssConfig ||
            !tailwindcssConfig.input ||
            !tailwindcssConfig.output ||
            !tailwindcssConfig.bin
        ) {
            return false;
        }

        const tnode = await new TailwindNode({
            binPath: tailwindcssConfig.bin,
            input: tailwindcssConfig.input,
            output: tailwindcssConfig.output,
            minify: env.isProd === 'true',
        });
        return await tnode.run();
    } catch (err) {
        // Si es un error de JSON parse, devolver false en lugar de lanzar error
        const errorMessage =
            err instanceof Error
                ? (err as any).stderr || err.message
                : String(err);
        logger.error('❌ :Error al compilar Tailwind:', errorMessage);
        if (err instanceof SyntaxError && err.message.includes('JSON')) {
            return false;
        }
        // Para otros errores (como errores de ejecución de TailwindCSS), loggear y relanzar
        throw err;
    }
}

