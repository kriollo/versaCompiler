import { exec as execCb } from 'child_process';
import { env } from 'process';
import { promisify } from 'util';
const exec = promisify(execCb);

export async function generateTailwindCSS(_filePath = null) {
    if (env.tailwindcss !== 'false') {
        return;
    }
    try {
        const tailwindcssConfig = JSON.parse(env.tailwindcss);
        console.log('Compilando TailwindCSS...');
        const { stdout } = await exec(
            `npx tailwindcss -i ${tailwindcssConfig.input} -o ${tailwindcssConfig.output}`,
        );
        console.log('Tailwind actualizado:', stdout);
    } catch (err) {
        console.error('Error al compilar Tailwind:', err.stderr || err);
        throw err;
    }
}
