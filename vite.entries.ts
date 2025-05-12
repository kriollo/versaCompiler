import fs from 'fs';
import path from 'path';

const modulesDir = path.resolve(__dirname, 'src/js');
const entries: Record<string, string> = {};

fs.readdirSync(modulesDir).forEach(file => {
    if (file.endsWith('.ts') || file.endsWith('.vue')) {
        const name = path.basename(file, path.extname(file));
        entries[name] = path.resolve(modulesDir, file);
        console.log(`Entry added: ${name} -> ${entries[name]}`);
    }
});

export default entries;
