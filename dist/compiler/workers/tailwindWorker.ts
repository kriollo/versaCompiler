import { parentPort } from 'node:worker_threads';
import { generateTailwindCSS } from '../tailwindcss.ts';

async function run() {
    try {
        await generateTailwindCSS();

        parentPort?.postMessage({ success: true });
    } catch (error: any) {
        parentPort?.postMessage({ success: false, error: error.message });
    }
}

run();
