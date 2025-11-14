import process, { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';

import { logger } from '../servicios/logger';
export async function promptUser(
    question: string,
    timeout: number = 30000,
): Promise<string> {
    const rl = readline.createInterface({ input, output });

    return new Promise((resolve, reject) => {
        let isResolved = false;

        // Timeout para evitar espera infinita
        const timer = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                rl.close();
                reject(
                    new Error('Timeout: No se recibió respuesta del usuario'),
                );
            }
        }, timeout);

        // Manejar Ctrl+C
        const handleSigint = () => {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(timer);
                rl.close();
                logger.info('\n🛑 Operación cancelada por el usuario.');
                process.exit(0);
            }
        };

        process.on('SIGINT', handleSigint);

        rl.question(question)
            .then((answer: string) => {
                if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timer);
                    process.removeListener('SIGINT', handleSigint);
                    rl.close();
                    resolve(answer);
                }
            })
            .catch((error: Error) => {
                if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timer);
                    process.removeListener('SIGINT', handleSigint);
                    rl.close();
                    reject(error);
                }
            });
    });
}
