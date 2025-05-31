# 🔧 API Reference

## Introducción

Esta documentación cubre todas las APIs públicas de VersaCompiler, incluyendo funciones, interfaces, tipos y utilidades disponibles para desarrolladores.

## Core API

### `defineConfig()`

Define la configuración de VersaCompiler.

```typescript
function defineConfig(
  config: UserConfig | ((env: ConfigEnv) => UserConfig)
): UserConfig
```

**Parámetros:**
- `config`: Objeto de configuración o función que retorna configuración

**Ejemplo:**
```typescript
import { defineConfig } from 'versacompiler';

export default defineConfig({
  sourceRoot: './src',
  outDir: './dist'
});

// O con función
export default defineConfig(({ command, mode }) => ({
  build: {
    minify: mode === 'production'
  }
}));
```

### `createCompiler()`

Crea una instancia del compilador programáticamente.

```typescript
function createCompiler(config?: UserConfig): Promise<VersaCompiler>
```

**Ejemplo:**
```typescript
import { createCompiler } from 'versacompiler';

const compiler = await createCompiler({
  sourceRoot: './src',
  outDir: './dist'
});

await compiler.build();
await compiler.close();
```

## Interfaces y Tipos

### `UserConfig`

Configuración principal de VersaCompiler.

```typescript
interface UserConfig {
  /** Directorio de archivos fuente */
  sourceRoot?: string;
  
  /** Directorio de salida */
  outDir?: string;
  
  /** Aliases para imports */
  alias?: Record<string, string>;
  
  /** Configuración del servidor de desarrollo */
  server?: ServerConfig;
  
  /** Configuración de Vue.js */
  vue?: VueConfig;
  
  /** Configuración de TypeScript */
  typescript?: TypeScriptConfig;
  
  /** Configuración de build */
  build?: BuildConfig;
  
  /** Configuración de linting */
  linter?: LinterConfig;
  
  /** Configuración de TailwindCSS */
  tailwind?: TailwindConfig;
  
  /** Configuración de cache */
  cache?: CacheConfig;
  
  /** Configuración de logging */
  logging?: LoggingConfig;
}
```

### `ServerConfig`

Configuración del servidor de desarrollo.

```typescript
interface ServerConfig {
  /** Puerto del servidor */
  port?: number;
  
  /** Host del servidor */
  host?: string;
  
  /** Configuración de proxy */
  proxy?: ProxyConfig;
  
  /** Opciones de BrowserSync */
  browserSync?: BrowserSyncConfig;
  
  /** Configuración de HMR */
  hmr?: HMRConfig;
}
```

### `VueConfig`

Configuración específica para Vue.js.

```typescript
interface VueConfig {
  /** Versión de Vue */
  version?: 2 | 3;
  
  /** Configuración del compilador de templates */
  template?: {
    transformAssetUrls?: boolean | Record<string, string[]>;
    compilerOptions?: CompilerOptions;
  };
  
  /** Configuración de scripts */
  script?: {
    defineModel?: boolean;
    propsDestructure?: boolean;
  };
  
  /** Configuración de estilos */
  style?: {
    preprocessLang?: 'scss' | 'sass' | 'less' | 'stylus';
    scoped?: boolean;
  };
}
```

### `TypeScriptConfig`

Configuración de TypeScript.

```typescript
interface TypeScriptConfig {
  /** Modo estricto */
  strict?: boolean;
  
  /** Generar source maps */
  sourceMap?: boolean;
  
  /** Target de compilación */
  target?: ScriptTarget;
  
  /** Tipo de módulo */
  module?: ModuleKind;
  
  /** Configuración de paths */
  paths?: Record<string, string[]>;
  
  /** Opciones adicionales del compilador */
  compilerOptions?: CompilerOptions;
}
```

### `BuildConfig`

Configuración de build y optimización.

```typescript
interface BuildConfig {
  /** Minificar código */
  minify?: boolean;
  
  /** Generar source maps */
  sourceMaps?: boolean;
  
  /** Compilación paralela */
  parallel?: boolean;
  
  /** Número de workers */
  workers?: number;
  
  /** Usar cache */
  cache?: boolean;
  
  /** Target de navegadores */
  target?: string[];
  
  /** Optimizaciones */
  optimization?: OptimizationConfig;
}
```

### `LinterConfig`

Configuración de linting.

```typescript
interface LinterConfig {
  /** Configuración de ESLint */
  eslint?: {
    enabled?: boolean;
    configFile?: string;
    extensions?: string[];
    fix?: boolean;
    cache?: boolean;
  };
  
  /** Configuración de OxLint */
  oxlint?: {
    enabled?: boolean;
    configFile?: string;
    fix?: boolean;
  };
  
  /** Corregir al guardar */
  fixOnSave?: boolean;
  
  /** Fallar en errores */
  failOnError?: boolean;
  
  /** Tratar warnings como errores */
  warningsAsErrors?: boolean;
}
```

## Compiler API

### `VersaCompiler`

Clase principal del compilador.

```typescript
class VersaCompiler {
  /** Configuración actual */
  config: ResolvedConfig;
  
  /** Compilar todos los archivos */
  build(): Promise<BuildResult>;
  
  /** Iniciar modo watch */
  watch(): Promise<Watcher>;
  
  /** Iniciar servidor de desarrollo */
  serve(): Promise<DevServer>;
  
  /** Ejecutar linter */
  lint(): Promise<LintResult>;
  
  /** Limpiar cache y output */
  clean(): Promise<void>;
  
  /** Cerrar compilador */
  close(): Promise<void>;
}
```

### `BuildResult`

Resultado de la compilación.

```typescript
interface BuildResult {
  /** Archivos compilados exitosamente */
  success: string[];
  
  /** Archivos con errores */
  errors: CompileError[];
  
  /** Archivos desde cache */
  cached: string[];
  
  /** Tiempo total de compilación */
  duration: number;
  
  /** Métricas detalladas */
  metrics: BuildMetrics;
}
```

### `CompileError`

Error de compilación.

```typescript
interface CompileError {
  /** Archivo con error */
  file: string;
  
  /** Etapa donde ocurrió el error */
  stage: 'parse' | 'transform' | 'compile' | 'optimize';
  
  /** Mensaje de error */
  message: string;
  
  /** Código de error (opcional) */
  code?: string;
  
  /** Línea del error */
  line?: number;
  
  /** Columna del error */
  column?: number;
  
  /** Stack trace */
  stack?: string;
}
```

## Plugin API

### `Plugin`

Interface para crear plugins.

```typescript
interface Plugin {
  /** Nombre del plugin */
  name: string;
  
  /** Configuración aplicada */
  config?: (config: UserConfig) => UserConfig | void;
  
  /** Configuración resuelta */
  configResolved?: (config: ResolvedConfig) => void;
  
  /** Antes de compilar */
  beforeCompile?: (files: string[]) => void | Promise<void>;
  
  /** Transformar código */
  transform?: (code: string, file: string) => string | Promise<string>;
  
  /** Después de compilar */
  afterCompile?: (result: BuildResult) => void | Promise<void>;
  
  /** Cerrar plugin */
  close?: () => void | Promise<void>;
}
```

### `createPlugin()`

Crear un plugin personalizado.

```typescript
function createPlugin(plugin: Plugin): Plugin
```

**Ejemplo:**
```typescript
import { createPlugin } from 'versacompiler';

const miPlugin = createPlugin({
  name: 'mi-plugin',
  transform(code, file) {
    // Transformar código
    return code.replace(/OLD_SYNTAX/g, 'NEW_SYNTAX');
  }
});

export default defineConfig({
  plugins: [miPlugin]
});
```

## Utilities API

### `resolveModule()`

Resolver un módulo según la configuración de aliases.

```typescript
function resolveModule(
  id: string, 
  importer?: string, 
  config?: ResolvedConfig
): Promise<string | null>
```

### `transformImports()`

Transformar imports en código.

```typescript
function transformImports(
  code: string, 
  file: string, 
  config: ResolvedConfig
): Promise<string>
```

### `parseVue()`

Parsear un archivo Vue SFC.

```typescript
function parseVue(code: string): {
  descriptor: SFCDescriptor;
  errors: string[];
}
```

### `compileTypeScript()`

Compilar código TypeScript.

```typescript
function compileTypeScript(
  code: string, 
  file: string, 
  options?: CompilerOptions
): {
  code: string;
  sourceMap?: string;
  diagnostics: Diagnostic[];
}
```

### `minifyCode()`

Minificar código JavaScript.

```typescript
function minifyCode(
  code: string, 
  options?: MinifyOptions
): Promise<{
  code: string;
  sourceMap?: string;
}>
```

## CLI API

### Comandos Disponibles

#### `build`
```bash
versacompiler build [options]
```

Opciones:
- `--mode <mode>` - Modo de build (development/production)
- `--outDir <dir>` - Directorio de salida
- `--minify` - Minificar salida
- `--sourcemap` - Generar source maps

#### `dev`
```bash
versacompiler dev [options]
```

Opciones:
- `--port <port>` - Puerto del servidor
- `--host <host>` - Host del servidor
- `--open` - Abrir navegador automáticamente

#### `lint`
```bash
versacompiler lint [options]
```

Opciones:
- `--fix` - Corregir errores automáticamente
- `--cache` - Usar cache de linting

### Exit Codes

- `0` - Éxito
- `1` - Error general
- `2` - Error de configuración
- `3` - Error de compilación
- `4` - Error de linting

## Environment Variables

### Variables de Configuración

```bash
# Directorio de archivos fuente
VERSA_SOURCE_ROOT=./src

# Directorio de salida
VERSA_OUT_DIR=./dist

# Habilitar modo producción
VERSA_PROD=true

# Habilitar TailwindCSS
VERSA_TAILWIND=true

# Habilitar linter
VERSA_LINTER=true

# Nivel de logging
VERSA_LOG_LEVEL=info

# Puerto del servidor de desarrollo
VERSA_DEV_PORT=3000
```

### Variables de Sistema

```bash
# Número de workers para compilación paralela
VERSA_WORKERS=4

# Límite de memoria para Node.js
VERSA_MEMORY_LIMIT=4096

# Directorio de cache
VERSA_CACHE_DIR=./node_modules/.cache/versacompiler
```

## Hooks y Events

### Build Hooks

```typescript
// En plugin
export default createPlugin({
  name: 'mi-plugin',
  
  // Antes de iniciar build
  beforeCompile(files) {
    console.log(`Compilando ${files.length} archivos`);
  },
  
  // Después de completar build
  afterCompile(result) {
    console.log(`Compilación completada en ${result.duration}ms`);
  }
});
```

### Server Hooks

```typescript
// En configuración de servidor
export default defineConfig({
  server: {
    // Middleware personalizado
    middleware: [
      (req, res, next) => {
        // Lógica personalizada
        next();
      }
    ],
    
    // Eventos del servidor
    onStart: (server) => {
      console.log(`Servidor iniciado en puerto ${server.port}`);
    },
    
    onReload: (files) => {
      console.log(`Recargando por cambios en: ${files.join(', ')}`);
    }
  }
});
```

## Error Handling

### Manejo de Errores en Plugins

```typescript
export default createPlugin({
  name: 'mi-plugin',
  
  async transform(code, file) {
    try {
      return await miTransformacion(code);
    } catch (error) {
      // Crear error específico del compilador
      throw new CompileError(
        file,
        'transform',
        `Error en transformación: ${error.message}`,
        'TRANSFORM_ERROR'
      );
    }
  }
});
```

### Custom Error Types

```typescript
class CompileError extends Error {
  constructor(
    public file: string,
    public stage: 'parse' | 'transform' | 'compile' | 'optimize',
    message: string,
    public code?: string
  ) {
    super(`[${stage}] ${file}: ${message}`);
    this.name = 'CompileError';
  }
}

class ConfigError extends Error {
  constructor(message: string, public configPath?: string) {
    super(message);
    this.name = 'ConfigError';
  }
}
```

## Testing API

### Test Utilities

```typescript
import { createTestCompiler, mockConfig } from 'versacompiler/testing';

// Crear compilador para testing
const compiler = createTestCompiler({
  sourceRoot: './test-fixtures',
  outDir: './test-output'
});

// Mock de configuración
const config = mockConfig({
  build: { minify: false }
});
```

## Migration API

### Migrar desde otras herramientas

```typescript
import { migrateFromWebpack, migrateFromVite } from 'versacompiler/migrate';

// Migrar configuración de Webpack
const versaConfig = migrateFromWebpack('./webpack.config.js');

// Migrar configuración de Vite
const versaConfig = migrateFromVite('./vite.config.js');
```

Esta API reference cubre las funcionalidades principales. Para ejemplos específicos, consulta la [Guía de Ejemplos](./examples.md).
