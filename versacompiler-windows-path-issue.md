# VersaCompiler 2.6.7 rechaza su propia ruta de configuración en Windows

## Resumen

`versacompiler@2.6.7` falla al iniciar en Windows porque convierte la ruta de configuración a una ruta absoluta y luego la rechaza con su propio validador de seguridad.

## Entorno

- OS: Windows
- Node.js: `v24.15.0`
- pnpm: `12.3.4`
- VersaCompiler: `2.6.7`
- Proyecto: Vue + TypeScript + configuración `versacompile.config.ts`
- Ruta del proyecto reproducida: `C:\Users\jjarah\Documents\monidash\frontend`

## Reproducción

1. Crear una configuración válida en la raíz del proyecto:

```ts
import { defineConfig } from 'versacompiler/config';

export default defineConfig({
    root: './src',
});
```

2. Ejecutar en Windows:

```powershell
pnpm install
pnpm exec versacompiler --all --verbose --tailwind --linter --typeCheck --yes
```

## Resultado actual

```text
Ruta absoluta de Windows no permitida: C:\Users\jjarah\Documents\monidash\frontend\versacompile.config.ts
Error al leer el archivo C:\Users\jjarah\Documents\monidash\frontend\versacompile.config.ts:
Error: Ruta de configuración no válida: C:\Users\jjarah\Documents\monidash\frontend\versacompile.config.ts
```

La configuración no llega a importarse y la compilación termina con código `1`.

## Resultado esperado

El CLI debería leer `versacompile.config.ts` y comenzar la compilación. Una ruta absoluta generada internamente por el propio CLI no debería rechazarse, o el CLI debería conservar la ruta relativa antes de validarla.

## Causa probable

En `dist/main.js`, el CLI asigna una ruta absoluta:

```js
env.PATH_CONFIG_FILE = path.resolve(process.cwd(), 'versacompile.config.ts');
```

Después, `dist/servicios/readConfig.js` valida esa misma variable con:

```js
if (/^[A-Za-z]:[/\\]/.test(pathStr)) {
    logger.error(`Ruta absoluta de Windows no permitida: ${pathStr}`);
    return false;
}
```

Esto hace que el valor generado por `main.js` siempre falle en Windows. La posterior llamada a `pathToFileURL()` también indica que la ruta absoluta es un caso válido para la lectura del archivo.

## Corrección propuesta

Conservar la ruta relativa en `main.js` y dejar que `pathToFileURL()` la resuelva contra el directorio de trabajo:

```diff
- env.PATH_CONFIG_FILE = path.resolve(process.cwd(), 'versacompile.config.ts');
+ env.PATH_CONFIG_FILE = 'versacompile.config.ts';
```

Como alternativa, `validatePath()` podría permitir rutas absolutas únicamente cuando resuelvan dentro de `process.cwd()`, manteniendo la protección contra path traversal.

## Verificación

Aplicando el cambio anterior, el mismo proyecto ejecuta correctamente en Windows y `versacompiler --all ...` termina con código `0`.

## Impacto

Afecta cualquier proyecto Windows que use la configuración automática `versacompile.config.ts` con VersaCompiler `2.6.7`, independientemente de que el archivo de configuración sea válido.
