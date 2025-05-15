import { transformStaticImports } from './utils.js';
import fs from 'fs';

const input = fs.readFileSync('./sampleInput.js', 'utf-8');
console.log('--- INPUT ---');
console.log(input);
console.log('\n--- OUTPUT ---');
console.log(transformStaticImports(input));
