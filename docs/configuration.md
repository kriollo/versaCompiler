# 🔧 Guía de Configuración

## Tabla de Contenidos

1. [Archivo de Configuración](#-archivo-de-configuración)
2. [Helper `defineConfig`](#-helper-defineconfig)
3. [Referencia de Opciones](#-referencia-de-opciones)
    - [root](#root-requerido)
    - [build](#build-requerido)
    - [resolve](#resolve-requerido)
    - [server](#server-opcional)
    - [watch](#watch-opcional)
    - [tsconfig](#tsconfig-opcional)
    - [tailwindConfig](#tailwindconfig-opcional)
    - [linter](#linter-opcional)
    - [typeCheckOptions](#typecheckoptions-opcional)
    - [hmr](#hmr-opcional)
    - [hmrExclude](#hmrexclude-opcional)
    - [define](#define-opcional)
    - [vendor](#vendor-opcional)
    - [plugins](#plugins-opcional)
4. [Variables de entorno (.env)](#-variables-de-entorno-env)
5. [Ejemplo Completo](#-ejemplo-completo)
6. [Comandos CLI](#-comandos-cli)
7. [Troubleshooting](#-troubleshooting)

---

## 📄 Archivo de Configuración

Crea `versacompile.config.ts` en la raíz de tu proyecto. VersaCompiler lo detecta automáticamente.

```typescript
import { defineConfig } from 'versacompiler/config';

export default defineConfig({
    root: './src',
    build: {
        outDir: './dist',
    },
    resolve: {
        alias: {
            '@': 'src',
        },
    },
});
```

---

## 🛠️ Helper `defineConfig`

Importa `defineConfig` desde `versacompiler/config` para obtener **autocompletado TypeScript completo** en tu editor:

```typescript
import { defineConfig } from 'versacompiler/config';

export default defineConfig({
    // ← autocompletado y validación de tipos aquí
});
```

Si prefieres no usar el helper, también puedes exportar el objeto directamente:

```typescript
export default {
    root: './src',
    build: { outDir: './dist' },
    resolve: { alias: { '@': 'src' } },
};
```

---

## 📋 Referencia de Opciones

### `root` _(requerido)_

Directorio raíz de los archivos fuente. Todos los archivos `.vue`, `.ts` y `.js` dentro de esta carpeta son candidatos a compilación.

```typescript
root: './src',
```

---

### `build` _(requerido)_

Opciones de salida de la compilación.

```typescript
build: {
    outDir: './dist',   // directorio de salida (requerido)
},
```

#### `build.outDir`

Directorio donde se escriben los archivos compilados. Se crea automáticamente si no existe.

> **Nota:** VersaCompiler compila archivo a archivo y **no hace bundling**. La opción `build.bundlers` existe en el tipo de configuración pero **no está implementada**: no genera ningún bundle, así que no la uses. Si necesitas un bundle, usa un bundler externo (Rollup, esbuild, Vite) sobre `outDir`.

---

### `resolve` _(requerido)_

Resolución de módulos e imports.

```typescript
resolve: {
    alias: {
        '@': 'src',          // @/utils → src/utils
        'P@': 'public',      // P@/js → public/js
    },
},
```

#### `resolve.alias`

Mapa de prefijos de alias a rutas reales. La clave es el prefijo sin `/*`; VersaCompiler añade automáticamente el soporte de subpaths.

```typescript
// ✅ Correcto
alias: { '@': 'src', '@components': 'src/components' }

// ❌ No usar /* en la clave
alias: { '@/*': 'src/*' }
```

---

### `server` _(opcional)_

Configuración del servidor de desarrollo (BrowserSync).

```typescript
server: {
    proxyUrl: 'http://localhost:8080',  // proxy a backend ('' para deshabilitar)
    assetsOmit: true,                   // omitir assets del proxy
    watch: {
        additional: [                   // globs extra que disparan recarga
            './app/templates/**/*.twig',
            './resources/views/**/*.blade.php',
        ],
    },
},
```

| Campo              | Tipo       | Descripción                                                                 |
| ------------------ | ---------- | --------------------------------------------------------------------------- |
| `proxyUrl`         | `string`   | URL del backend a proxear. Vacío (`''`) para modo standalone                |
| `assetsOmit`       | `boolean`  | Si `true`, los assets estáticos no pasan por el proxy                       |
| `watch.additional` | `string[]` | Globs adicionales vigilados en modo `--watch` que disparan recarga completa |

---

### `watch` _(opcional)_

Alternativa a `server.watch` para proyectos sin servidor:

```typescript
watch: {
    additional: ['./templates/**/*.html'],
},
```

---

### `tsconfig` _(opcional)_

Ruta al `tsconfig.json` del proyecto. VersaCompiler lo usa para resolución de tipos y verificación TypeScript.

```typescript
tsconfig: './tsconfig.json',
```

---

### `tailwindConfig` _(opcional)_

Configuración de TailwindCSS. Usa `false` para deshabilitar:

```typescript
tailwindConfig: {
    bin: './node_modules/.bin/tailwindcss',
    input: './src/css/input.css',
    output: './public/css/output.css',
},
// o para deshabilitar:
tailwindConfig: false,
```

| Campo    | Tipo     | Descripción                            |
| -------- | -------- | -------------------------------------- |
| `bin`    | `string` | Ruta al binario de TailwindCSS         |
| `input`  | `string` | Archivo CSS con directivas `@tailwind` |
| `output` | `string` | Archivo CSS compilado de salida        |

---

### `linter` _(opcional)_

Array de configuraciones de linters. Usa `false` para deshabilitar todos:

```typescript
linter: [
    {
        name: 'eslint',
        bin: './node_modules/.bin/eslint',
        configFile: './eslint.config.js',
        fix: false,
        paths: ['src/'],
    },
    {
        name: 'oxlint',
        bin: './node_modules/.bin/oxlint',
        configFile: './.oxlintrc.json',
        fix: false,
        paths: ['src/'],
    },
],
```

#### Campos comunes

| Campo        | Tipo                   | Descripción                                |
| ------------ | ---------------------- | ------------------------------------------ |
| `name`       | `'eslint' \| 'oxlint'` | Identificador del linter                   |
| `bin`        | `string`               | Ruta al ejecutable                         |
| `configFile` | `string`               | Archivo de configuración del linter        |
| `fix`        | `boolean`              | Si `true`, auto-corrige errores detectados |
| `paths`      | `string[]`             | Rutas a analizar (ej: `['src/']`)          |

---

### `typeCheckOptions` _(opcional)_

Controla el pool de workers TypeScript usado para verificación de tipos.

```typescript
typeCheckOptions: {
    maxWorkers: 2,   // número máximo de worker threads
},
```

| Campo        | Tipo     | Descripción                                                         |
| ------------ | -------- | ------------------------------------------------------------------- |
| `maxWorkers` | `number` | Límite de workers paralelos. Por defecto depende del número de CPUs |

---

### `hmr` _(opcional)_

Controla si VersaCompiler inyecta el **shim HMR** en los archivos `.js` compilados durante el modo `--watch`.

```typescript
hmr: true,   // por defecto — todos los archivos reciben el shim
hmr: false,  // deshabilita la inyección globalmente
```

**Cuándo usar `hmr: false`:**

- Builds de librería Node.js (sin browser)
- Proyectos donde ningún archivo se carga como módulo ES6
- Entornos donde `import.meta` no está disponible

> **Nota:** Para deshabilitar HMR solo en archivos puntuales sin afectar al resto, usa [`hmrExclude`](#hmrexclude-opcional).

**Por defecto:** `true`

---

### `hmrExclude` _(opcional)_

Lista de patrones de archivos de **salida** que no recibirán el shim HMR. El resto de archivos sigue recibiendo HMR normalmente.

```typescript
hmrExclude: [
    'early-init.js',       // nombre exacto del archivo
    'js/vendor.js',        // sufijo de ruta
    '*.legacy.js',         // glob simple con *
],
```

**Cuándo usarlo:**

Cuando un archivo compilado se carga con `<script src="...">` (sin `type="module"`), el shim HMR introduce `import.meta` que causa:

```
SyntaxError: Cannot use 'import.meta' outside a module
```

Añadir ese archivo a `hmrExclude` evita la inyección del shim solo en él.

#### Patrones aceptados

| Tipo              | Ejemplo              | Coincide con                                      |
| ----------------- | -------------------- | ------------------------------------------------- |
| Nombre exacto     | `'early-init.js'`    | Cualquier archivo cuyo nombre sea exactamente ese |
| Sufijo de ruta    | `'js/early-init.js'` | Archivos cuya ruta termina con ese sufijo         |
| Glob simple (`*`) | `'*.legacy.js'`      | Archivos que coinciden con el patrón              |

#### Log de confirmación

Al iniciar en modo `--watch` con entradas en `hmrExclude`, VersaCompiler muestra en consola:

```
[HMR] Exclusiones activas: ['early-init.js', '*.legacy.js']
```

Esto confirma que la config fue leída correctamente. Si no aparece el mensaje, revisa que tu config use el formato Vite-style (con `root`, `build`, `resolve`).

**Por defecto:** `[]`

---

### `define` _(opcional)_

Reemplaza identificadores o expresiones por valores en tiempo de compilación, igual que `define` en Vite. Cada valor es una **expresión de JavaScript**, por eso los strings deben ir con `JSON.stringify` o con comillas dentro del string:

```typescript
define: {
    __APP_VERSION__: JSON.stringify('1.2.0'),   // → "1.2.0"
    __DEBUG__: 'false',                          // → false
    'process.env.NODE_ENV': '"production"',      // claves con punto: soportadas
},
```

- El reemplazo se hace sobre el AST: no toca el contenido de strings ni comentarios.
- Úsalo para constantes de build. Para variables de entorno de la app prefiere [`import.meta.env`](#-variables-de-entorno-env).

**Por defecto:** `{}`

---

### `vendor` _(opcional)_

Controla la salida autocontenida de `--prod`. En producción, los imports de `/node_modules/<ruta>` se reescriben a `/<outDir>/vendor/<ruta>` y los archivos (junto con sus imports relativos) se **copian** a esa carpeta. Así no necesitas desplegar `node_modules`.

```typescript
vendor: false,   // desactiva la copia de dependencias en --prod
```

- Es **copia de archivos, no bundling**: funciona con builds ESM para navegador (por ejemplo `vue.esm-browser.prod.js`, pinia, vue-router).
- Si un archivo vendorizado contiene un import "bare" (ej. `import 'lodash'`), VersaCompiler muestra una advertencia, porque ese import no se puede resolver en el navegador.

**Por defecto:** activado en `--prod`.

---

### `plugins` _(opcional)_

Array de plugins. Un plugin es un objeto con un `name` y los hooks que necesite:

| Hook          | Cuándo se ejecuta                         |
| ------------- | ----------------------------------------- |
| `onResolve`   | Al resolver un import                     |
| `onLoad`      | Al leer el contenido de un archivo        |
| `onTransform` | Al transformar el contenido de un archivo |
| `onHotUpdate` | Cuando cambia un archivo en `--watch`     |
| `onEnd`       | Al terminar la compilación                |

El campo opcional **`enforce`** decide en qué orden corre el plugin dentro de `onTransform`:

- `enforce: 'pre'`: corre **antes** de los plugins core (vue, ts, transforms), así que recibe el fuente original (`.vue`, `.ts`).
- Sin `enforce`: corre **después**, sobre el JS ya compilado.

```typescript
import { defineConfig } from 'versacompiler/config';
import type { Plugin } from 'versacompiler';

const addBuildStamp: Plugin = {
    name: 'add-build-stamp',
    onTransform({ loader, contents }) {
        // Sin enforce: 'pre', aquí el contenido ya es JS compilado
        if (loader !== 'js') return {};
        return {
            contents: `/* built: ${new Date().toISOString()} */\n${contents}`,
        };
    },
};

export default defineConfig({
    // ...
    plugins: [addBuildStamp],
});
```

Los tipos (`Plugin`, `TransformArgs`, `TransformResult`, `LoadArgs`, `LoadResult`, etc.) se exportan desde `versacompiler`. Un hook devuelve solo lo que cambia: `contents` para reemplazar el código, `errors` para reportar problemas.

**Por defecto:** `[]`

---

## 🔐 Variables de entorno (.env)

VersaCompiler lee archivos `.env` y expone a tu código las variables con prefijo `VERSA_` a través de `import.meta.env`.

### Archivos y prioridad

| Archivo             | Cuándo se lee        |
| ------------------- | -------------------- |
| `.env`              | Siempre              |
| `.env.local`        | Siempre              |
| `.env.<mode>`       | Según el modo activo |
| `.env.<mode>.local` | Según el modo activo |

Si una variable aparece en varios archivos, **gana el último** de la lista. Las variables del **entorno del proceso** (por ejemplo `VERSA_API_URL=... pnpm build`) ganan sobre los archivos.

### Modo (`--mode`)

- `--mode <nombre>` (CLI) o `mode` (API) selecciona el archivo `.env.<nombre>`.
- Sin `--mode`: el modo es `production` con `--prod`, y `development` en el resto de casos.

```bash
pnpm exec versacompiler --all --prod --mode staging   # lee .env.staging
```

### Uso en el código

```env
# .env
VERSA_API_URL=https://api.example.com
DB_PASSWORD=no-llega-al-navegador
```

```typescript
const api = import.meta.env.VERSA_API_URL;

if (import.meta.env.DEV) {
    console.log('Modo desarrollo');
}

console.log(import.meta.env.MODE); // 'production', 'development' o el nombre de --mode
console.log(import.meta.env.PROD); // boolean
```

- Solo las variables con prefijo `VERSA_` llegan al navegador. El resto **nunca** se incluye en la salida.
- Los valores se reemplazan en tiempo de compilación por literales. Por eso `if (import.meta.env.DEV) { ... }` desaparece por completo en `--prod`.
- `MODE`, `PROD` y `DEV` están siempre disponibles.
- Los tipos (`ImportMetaEnv`) se generan en `src/types/global.d.ts`.

---

## 📝 Ejemplo Completo

```typescript
import { defineConfig } from 'versacompiler/config';

export default defineConfig({
    root: './src',
    build: {
        outDir: './dist',
    },
    resolve: {
        alias: {
            '@': 'src',
            'P@': 'public',
        },
    },
    server: {
        proxyUrl: 'http://localhost:8080',
        assetsOmit: true,
        watch: {
            additional: ['./app/templates/**/*.twig'],
        },
    },
    tsconfig: './tsconfig.json',
    tailwindConfig: {
        bin: './node_modules/.bin/tailwindcss',
        input: './src/css/input.css',
        output: './public/css/output.css',
    },
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './eslint.config.js',
            fix: false,
            paths: ['src/'],
        },
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: false,
            paths: ['src/'],
        },
    ],
    typeCheckOptions: {
        maxWorkers: 2,
    },
    define: {
        __APP_VERSION__: JSON.stringify('1.2.0'),
    },
    vendor: true,
    plugins: [],
    hmr: true,
    hmrExclude: ['early-init.js', '*.legacy.js'],
});
```

---

## 🖥️ Comandos CLI

| Comando            | Alias | Descripción                                                        |
| ------------------ | ----- | ------------------------------------------------------------------ |
| `--init`           |       | Inicializar configuración del proyecto                             |
| `--watch`          | `-w`  | Modo observación con HMR y auto-recompilación                      |
| `--all`            |       | Compilar todos los archivos del proyecto                           |
| `--file <archivo>` | `-f`  | Compilar un archivo específico                                     |
| `[archivos...]`    |       | Compilar múltiples archivos específicos                            |
| `--prod`           | `-p`  | Modo producción con minificación                                   |
| `--verbose`        | `-v`  | Mostrar información detallada de compilación                       |
| `--cleanOutput`    | `-co` | Limpiar directorio de salida antes de compilar                     |
| `--cleanCache`     | `-cc` | Limpiar caché de compilación                                       |
| `--yes`            | `-y`  | Confirmar automáticamente todas las acciones                       |
| `--typeCheck`      | `-t`  | Habilitar verificación de tipos TypeScript                         |
| `--checkIntegrity` | `-ci` | Validar integridad del código compilado                            |
| `--tailwind`       |       | Habilitar compilación TailwindCSS                                  |
| `--linter`         |       | Ejecutar análisis de código                                        |
| `--silent`         |       | Solo advertencias y errores (una línea por error)                  |
| `--mode <nombre>`  |       | Modo para `.env.<nombre>` (ver [.env](#-variables-de-entorno-env)) |
| `--config <ruta>`  |       | Usar otro archivo de configuración                                 |
| `--help`           | `-h`  | Mostrar ayuda y opciones disponibles                               |

> **Notas:**
>
> - `--all` devuelve código de salida `1` si algún archivo falla o si un linter detiene el build. Antes siempre devolvía `0`, así que en CI ahora se detectan los builds rotos.
> - La barra de progreso solo aparece en una terminal interactiva. En CI, con salida redirigida o con `NO_COLOR`, los logs son líneas planas.

### Ejemplos de uso avanzado

```bash
# Desarrollo con análisis completo
pnpm exec versacompiler --watch --verbose --typeCheck

# Compilación específica de componente
pnpm exec versacompiler --file src/components/Dashboard.vue --typeCheck

# Build para producción con limpieza completa
pnpm exec versacompiler --all --prod --cleanOutput --cleanCache --yes

# Solo análisis de código
pnpm exec versacompiler --linter --verbose

# Compilación de múltiples archivos
pnpm exec versacompiler src/main.ts src/App.vue src/router.ts

# Build de staging con su archivo .env.staging, en silencio
pnpm exec versacompiler --all --prod --mode staging --silent

# Usar otro archivo de configuración
pnpm exec versacompiler --all --prod --config ./config/versacompile.prod.ts

# Build con validación de integridad (recomendado para deploy)
pnpm exec versacompiler --all --prod --checkIntegrity --yes
```

---

## 🚧 Troubleshooting

### Error de configuración no encontrada

```bash
# Verificar que el archivo existe en la raíz
ls versacompile.config.ts

# Inicializar configuración desde cero
versacompiler --init
```

### `hmrExclude` no tiene efecto

Verifica que tu config usa el **formato Vite-style** (`root`, `build`, `resolve`). Si usas el formato antiguo con `compilerOptions`, los campos `hmr`/`hmrExclude` son ignorados silenciosamente.

```typescript
// ✅ Formato correcto (Vite-style) — hmrExclude funciona
import { defineConfig } from 'versacompiler/config';
export default defineConfig({
    root: './src',
    build: { outDir: './dist' },
    resolve: { alias: { '@': 'src' } },
    hmrExclude: ['early-init.js'],
});
```

Al arrancar en `--watch` deberías ver en consola:

```
[HMR] Exclusiones activas: ['early-init.js']
```

### El shim HMR produce `SyntaxError: Cannot use 'import.meta' outside a module`

Usa `hmrExclude` para excluir el archivo afectado:

```typescript
hmrExclude: ['nombre-del-archivo.js'],
```

O deshabilita HMR globalmente si ningún archivo necesita HMR:

```typescript
hmr: false,
```

#### Cache corrupto o problemas de rendimiento

```bash
# Limpiar cache y recompilar
versacompiler --cleanCache --cleanOutput

# Limpiar solo cache de compilación
versacompiler --cleanCache

# Limpiar solo directorio de salida
versacompiler --cleanOutput
```

#### Linting muy lento

```bash
# Usar solo OxLint para máxima velocidad
pnpm exec versacompiler --linter --verbose
```

Para usar solo OxLint, deja únicamente ese linter en el array `linter` (ver "Para proyectos grandes" abajo).

#### Problemas de TypeScript

```bash
# Verificar configuración de decorators en tsconfig.json
{
    "compilerOptions": {
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true
    }
}

# Solo verificación de tipos con verbose
versacompiler --typeCheck --verbose
```

#### Errores de archivos Vue

```bash
# Compilar archivo Vue específico con debug
versacompiler --file src/components/Problem.vue --verbose

# Verificar tipos en archivo Vue
versacompiler --typeCheck --file src/components/Problem.vue
```

### Configuraciones de Performance

#### Para proyectos grandes

```typescript
import { defineConfig } from 'versacompiler/config';

export default defineConfig({
    root: './src',
    build: { outDir: './dist' },
    resolve: { alias: { '@': 'src' } },
    // Optimizaciones para proyectos grandes
    linter: [
        {
            name: 'oxlint', // Usar OxLint para velocidad
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            paths: ['src/'],
        },
    ],
    typeCheckOptions: {
        maxWorkers: 2, // Límite de workers de type checking
    },
});
```

#### Para desarrollo rápido

```typescript
export default {
    // Solo lo esencial para desarrollo
    linter: [
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            fix: true, // Auto-fix para desarrollo
            paths: ['src/'], // Solo directorio principal
        },
    ],
};
```

## Validación de Integridad

VersaCompiler incluye un sistema de validación de integridad que detecta automáticamente código corrupto durante la compilación. Esta característica es especialmente útil para builds de producción y deploy.

### ¿Qué Valida el Sistema de Integridad?

El validador verifica que el código compilado/minificado:

- ✅ **No esté vacío** - Previene archivos vacíos por errores de minificación
- ✅ **Preserve exports** - Asegura que los exports no se eliminen por error
- ✅ **Sea sintácticamente válido** - Detecta errores de sintaxis introducidos por transformaciones

> **Nota:** La verificación de estructura (paréntesis/llaves/corchetes) está suspendida, así que no se ejecuta.

### Uso del Flag --checkIntegrity / -ci

La validación de integridad es **opcional** y se activa con el flag CLI:

```bash
# Compilar con validación de integridad
pnpm exec versacompiler --all --prod --checkIntegrity

# O usar el shorthand
pnpm exec versacompiler --all --prod -ci

# En modo verbose para ver detalles de validación
pnpm exec versacompiler --all --prod --checkIntegrity --verbose
```

### ¿Cuándo Usar Validación de Integridad?

✅ **Recomendado:**

- Antes de hacer deploy a producción
- En pipelines CI/CD para validar builds
- Después de actualizar dependencias de minificación
- Cuando se introducen nuevas transformaciones de código

❌ **NO recomendado:**

- Durante desarrollo activo (agrega ~5ms por archivo)
- En modo watch (se ejecuta en cada cambio)
- Para iteraciones rápidas de desarrollo

### Comportamiento en Caso de Error

Si la validación detecta problemas:

- ❌ El build se **detiene inmediatamente** con código de error
- 📋 Se muestra en consola el archivo que falló y la razón
- 🚫 No se genera output corrupto

Ejemplo de salida en caso de error:

```
❌ Validación de integridad fallida para App.vue
   Error: Exports fueron eliminados o modificados incorrectamente

✖ Build failed - Integrity check error
```

### Performance

El sistema de validación de integridad está optimizado para mínimo impacto:

- ⚡ **<5ms por archivo** (típicamente 1-3ms)
- 💾 **Cache inteligente** - Validaciones repetidas son instantáneas
- 🎯 **Validación selectiva** - Skipea checks de sintaxis cuando es seguro
- 📊 **Métricas disponibles** en modo verbose

### Ejemplo de Uso en CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
    push:
        branches: [main]

jobs:
    build-and-deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - uses: pnpm/action-setup@v2

            # Instalar dependencias
            - run: pnpm install

            # Build con validación de integridad
            - run: pnpm exec versacompiler --all --prod --checkIntegrity

            # Solo hacer deploy si la validación pasa
            - run: pnpm deploy
```

### Package.json Scripts

```json
{
    "scripts": {
        "dev": "versacompiler --watch",
        "build": "versacompiler --all --prod",
        "build:deploy": "versacompiler --all --prod --checkIntegrity",
        "build:safe": "versacompiler --all --prod -ci --verbose"
    }
}
```

### Archivos de Configuración Relacionados

- `tsconfig.json`: Configuración de TypeScript
- `eslint.config.js`: Configuración de ESLint
- `.oxlintrc.json`: Configuración de OxLint
- `tailwind.config.js`: Configuración de TailwindCSS

## Estructura de Proyecto Típica

```
mi-proyecto/
├── src/                       # Código fuente
│   ├── components/            # Componentes Vue
│   ├── css/                   # Estilos
│   └── main.ts               # Punto de entrada
├── dist/                     # Archivos compilados
├── public/                   # Archivos estáticos
├── versacompile.config.ts    # Configuración VersaCompiler
├── tsconfig.json             # Configuración TypeScript
└── package.json
```

Para más información, consulta la [documentación completa](./getting-started.md).
