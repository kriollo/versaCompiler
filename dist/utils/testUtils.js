import { showTimingForHumans, mapRuta, addImportEndJs, transformStaticImports } from './utils.js';
import path from 'node:path';

console.log('=== showTimingForHumans ===');
console.log('500:', showTimingForHumans(500)); // ms
console.log('2500:', showTimingForHumans(2500)); // s
console.log('120000:', showTimingForHumans(120000)); // min
console.log('7200000:', showTimingForHumans(7200000)); // h

console.log('\n=== mapRuta ===');
(async () => {
    const PATH_DIST = '/dist';
    const PATH_SOURCE = '/src';
    const ruta = '/src/js/archivo.js';
    const mapped = await mapRuta(ruta, PATH_DIST, PATH_SOURCE);
    console.log(`mapRuta('${ruta}', '${PATH_DIST}', '${PATH_SOURCE}') =>`, mapped);
})();

console.log('\n=== addImportEndJs ===');
(async () => {
    const input = `
import foo from "./bar";
import bar from "./baz.js";
import comp from "./comp.vue";
import tsmod from "./mod.ts";
import css from "./style.css";
import { x } from "./x";
import y from "vue";
import z from "@/alias/zzz";
`;
    const output = await addImportEndJs(input);
    console.log('INPUT:\n', input);
    console.log('OUTPUT:\n', output);
})();

console.log('\n=== transformStaticImports ===');
const input2 = `
import foo from "./bar.js";
import * as baz from "@/utils/baz.js";
import { qux, quux as quuz } from "../quux.js";
import { 
    removeScape,
    versaAlert,
    versaFetch,
} from '@/dashboard/js/functions.js';
import something from "vue";
import { ref, toRefs } from 'vue';
import router from 'vue-router';
import myStyle from './style.css';
`;
console.log('INPUT:\n', input2);
console.log('OUTPUT:\n', transformStaticImports(input2));
