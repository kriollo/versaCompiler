import { env } from 'process';
import { logger } from '../servicios/pino.ts';
import { TailwindNode } from '../wrappers/tailwind-node.ts';
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
        logger.error('❌ :Error al compilar Tailwind:', err.stderr || err);
        throw err;
    }
}
