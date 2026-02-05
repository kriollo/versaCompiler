# 🔧 API Reference

## Introducción

Esta documentación cubre las funciones principales disponibles en VersaCompiler y cómo utilizar la herramienta programáticamente.

## Configuración

### Archivo de Configuración

VersaCompiler utiliza un archivo `versacompile.config.ts` simple sin funciones helper:

```typescript
// versacompile.config.ts
export default {
    tsconfig: './tsconfig.json',
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@/*': ['src/*'],
        },
    },
    // ... resto de configuración
};
```

## CLI API

### Comandos Disponibles

| Comando            | Alias | Descripción                                      |
| ------------------ | ----- | ------------------------------------------------ |
| `--init`           |       | Inicializar configuración del proyecto           |
| `--watch`          | `-w`  | Modo observación con HMR y auto-recompilación    |
| `--all`            |       | Compilar todos los archivos del proyecto         |
| `--file <archivo>` | `-f`  | Compilar un archivo específico                   |
| `[archivos...]`    |       | Compilar múltiples archivos específicos          |
| `--prod`           | `-p`  | Modo producción con minificación                 |
| `--verbose`        | `-v`  | Mostrar información detallada de compilación     |
| `--cleanOutput`    | `-co` | Limpiar directorio de salida antes de compilar   |
| `--cleanCache`     | `-cc` | Limpiar caché de compilación                     |
| `--yes`            | `-y`  | Confirmar automáticamente todas las acciones     |
| `--typeCheck`      | `-t`  | Habilitar/deshabilitar verificación de tipos     |
| `--checkIntegrity` | `-ci` | Validar integridad del código compilado (deploy) |
| `--tailwind`       |       | Habilitar/deshabilitar compilación TailwindCSS   |
| `--linter`         |       | Habilitar/deshabilitar análisis de código        |
| `--help`           | `-h`  | Mostrar ayuda y opciones disponibles             |

### Ejemplos de Uso

```bash
# Desarrollo con auto-recompilación
versacompiler --watch

# Build para producción
versacompiler --all --prod

# Compilar archivo específico
versacompiler --file src/components/Button.vue

# Compilar múltiples archivos
versacompiler src/main.ts src/App.vue

# Solo linting
versacompiler --linter

# Solo verificación de tipos
versacompiler --typeCheck

# Build con limpieza completa
versacompiler --all --prod --cleanOutput --cleanCache --yes

# Solo linting
versacompiler --linter

# Con salida detallada
versacompiler --all --verbose
```

## Estructura de Configuración

### CompilerOptions

```typescript
interface CompilerOptions {
    sourceRoot: string; // Directorio fuente
    outDir: string; // Directorio de salida
    pathsAlias: Record<string, string[]>; // Aliases de paths
}
```

### ProxyConfig

```typescript
interface ProxyConfig {
    proxyUrl: string; // URL del proxy
    assetsOmit: boolean; // Omitir assets
}
```

### TailwindConfig

```typescript
interface TailwindConfig {
    bin: string; // Ruta al binario
    input: string; // Archivo CSS entrada
    output: string; // Archivo CSS salida
}
```

### LinterConfig

```typescript
interface LinterConfig {
    name: 'eslint' | 'oxlint'; // Nombre del linter
    bin: string; // Ruta al binario
    configFile: string; // Archivo de configuración
    fix?: boolean; // Auto-fix errores
    paths?: string[]; // Rutas a analizar
    // Configuración específica de ESLint
    eslintConfig?: {
        cache?: boolean; // Habilitar cache
        maxWarnings?: number; // Máximo warnings
        quiet?: boolean; // Solo errores
        formats?: ('json' | 'stylish' | 'compact')[]; // Formatos salida
        deny?: string[]; // Reglas a denegar
        allow?: string[]; // Reglas a permitir
        noIgnore?: boolean; // Deshabilitar .eslintignore
        ignorePath?: string; // Archivo ignore personalizado
        ignorePattern?: string[]; // Patrones a ignorar
    };
    // Configuración específica de OxLint
    oxlintConfig?: {
        rules?: Record<string, any>; // Reglas personalizadas
        plugins?: string[]; // Plugins de OxLint
        deny?: string[]; // Reglas a denegar
        allow?: string[]; // Reglas a permitir
        tsconfigPath?: string; // Ruta a tsconfig.json
        quiet?: boolean; // Solo errores
        noIgnore?: boolean; // Deshabilitar ignore files
        ignorePath?: string; // Archivo ignore personalizado
        ignorePattern?: string[]; // Patrones a ignorar
    };
}
```

### BundlerConfig

```typescript
interface BundlerConfig {
    name: string; // Nombre del bundle
    fileInput: string; // Archivo de entrada
    fileOutput: string; // Archivo de salida
}
```

## Configuración Completa

```typescript
interface VersaCompilerConfig {
    tsconfig?: string;
    compilerOptions?: CompilerOptions;
    proxyConfig?: ProxyConfig;
    aditionalWatch?: string[];
    tailwindConfig?: TailwindConfig;
    linter?: LinterConfig[];
    bundlers?: BundlerConfig[];
}
```

## Funcionalidades

### Compilación de Archivos

VersaCompiler puede compilar:

- ✅ **Archivos Vue (.vue)** - Single File Components
- ✅ **TypeScript (.ts)** - Transpilación a JavaScript
- ✅ **JavaScript (.js)** - Procesamiento y optimización

### Características de Desarrollo

- **Watch Mode**: Observación de archivos con auto-recompilación inteligente
- **HMR Support**: Hot Module Replacement con preservación de estado
- **Proxy Support**: Proxy para APIs backend durante desarrollo
- **TypeScript Workers**: Validación de tipos en threads separados
- **Cache System**: Sistema de cache multinivel para máximo rendimiento

### Build y Optimización

- **Minificación**: OxcMinify ultra-rápido para producción
- **Tree Shaking**: Eliminación de código no utilizado
- **Linting Dual**: ESLint y OxLint con múltiples formatos
- **TailwindCSS**: Compilación automática con purging
- **Source Maps**: Generación automática en desarrollo

### Funcionalidades Avanzadas

- **Decorator Support**: Soporte completo para TypeScript decorators
- **Vue 3.5 Support**: Última versión de Vue con todas sus características
- **CSS Modules**: Soporte nativo para CSS Modules
- **SCSS/Sass**: Preprocesadores CSS integrados
- **Custom Blocks**: Procesamiento de bloques personalizados en Vue SFC
- **Granular Compilation**: Compilación por archivo individual

## Integración

### Uso en Scripts NPM

```json
{
    "scripts": {
        "dev": "versacompiler --watch",
        "dev:verbose": "versacompiler --watch --verbose",
        "build": "versacompiler --all --prod",
        "build:clean": "versacompiler --all --prod --cleanOutput --cleanCache",
        "lint": "versacompiler --linter",
        "type-check": "versacompiler --typeCheck --all",
        "clean": "versacompiler --cleanOutput --cleanCache",
        "build:component": "versacompiler --file src/components/MyComponent.vue"
    }
}
```

### Integración con CI/CD

```bash
# Pipeline de verificación completo
versacompiler --linter --typeCheck     # 1. Verificar código y tipos
versacompiler --all --prod --yes       # 2. Build para producción

# Pipeline específico por etapas
versacompiler --linter                 # Solo linting
versacompiler --typeCheck --all        # Solo verificación de tipos
versacompiler --all --prod --cleanOutput # Build limpio para producción

# GitHub Actions example
versacompiler --all --prod --verbose --yes  # Build con logging detallado
```

## IntegrityValidator API (v2.3.5+)

### Introducción

El **IntegrityValidator** es un sistema de validación de 4 niveles diseñado para detectar código corrupto durante la compilación y minificación. Protege contra errores comunes como código vacío, exports eliminados, y errores de sintaxis.

### Arquitectura

```typescript
class IntegrityValidator {
    // Singleton pattern
    static getInstance(): IntegrityValidator;

    // Método principal de validación
    validate(
        original: string,
        processed: string,
        options?: IntegrityCheckOptions,
    ): IntegrityCheckResult;

    // Gestión de caché y estadísticas
    clearCache(): void;
    getStats(): ValidationStats;
    resetStats(): void;
}
```

### Interfaces

#### IntegrityCheckOptions

```typescript
interface IntegrityCheckOptions {
    skipSyntaxCheck?: boolean; // Omitir Check 4 (validación de sintaxis)
    verbose?: boolean; // Logging detallado de validación
    throwOnError?: boolean; // Lanzar excepción vs retornar resultado
}
```

#### IntegrityCheckResult

```typescript
interface IntegrityCheckResult {
    valid: boolean; // true si pasó todos los checks
    errors: string[]; // Lista de errores detectados
    warnings: string[]; // Lista de warnings (actualmente no usado)
    checksPerformed: {
        size: boolean; // Check 1 ejecutado
        structure: boolean; // Check 2 ejecutado (actualmente false)
        exports: boolean; // Check 3 ejecutado
        syntax: boolean; // Check 4 ejecutado
    };
    metadata: {
        originalSize: number; // Tamaño del código original
        processedSize: number; // Tamaño del código procesado
        exportCount: number; // Número de exports detectados
        validationTime: number; // Tiempo de validación en ms
    };
}
```

#### ValidationStats

```typescript
interface ValidationStats {
    totalValidations: number; // Total de validaciones ejecutadas
    successfulValidations: number; // Validaciones exitosas
    failedValidations: number; // Validaciones fallidas
    cacheHits: number; // Hits de caché LRU
    cacheMisses: number; // Misses de caché LRU
    averageDuration: number; // Duración promedio en ms
    totalDuration: number; // Duración total acumulada en ms
}
```

### Checks de Validación

#### Check 1: Validación de Tamaño (~0.1ms)

```typescript
// Verifica que el código tenga al menos 10 caracteres
if (processed.trim().length < 10) {
    errors.push('Tamaño de código inválido');
}
```

**Detecta:**

- Código completamente vacío
- Archivos con solo espacios en blanco
- Minificación que eliminó todo el código

#### Check 2: Validación de Estructura (~1ms) ⚠️ SUSPENDIDO

```typescript
// Parser character-by-character de brackets
// Actualmente suspendido debido a:
// - Character classes en regex: /[()\[\]{}]/
// - Arrays de regex con patrones complejos
const structureOk = true; // this.checkStructure(processed);
```

**Detectaría (cuando esté activo):**

- Paréntesis desbalanceados: `( )` → cuenta: 0 ✅
- Corchetes desbalanceados: `[ ]` → cuenta: 0 ✅
- Llaves desbalanceadas: `{ }` → cuenta: 0 ✅
- Strings, templates, comentarios, regex manejados correctamente

**Limitación actual:**

- `/[(abc)]/ ` → detecta `[` dentro del regex como bracket real ❌
- Se suspendió hasta implementar detección de character classes

#### Check 3: Validación de Exports (~1ms)

```typescript
// Extrae exports del código original y procesado
const originalExports = extractExports(original);
const processedExports = extractExports(processed);

// Detecta exports eliminados
for (const exp of originalExports) {
    if (!processedExports.includes(exp)) {
        errors.push(`Export '${exp}' fue eliminado`);
    }
}
```

**Detecta:**

- `export const API_KEY` eliminado por transformación
- `export function handler()` removido incorrectamente
- `export default Component` perdido en minificación
- `export { foo, bar }` eliminado parcial o completamente

**Patrones soportados:**

- `export const/let/var name`
- `export function name()`
- `export class Name`
- `export default`
- `export { name1, name2 }`
- `export * from 'module'`

#### Check 4: Validación de Sintaxis (~3ms)

```typescript
import { parseSync } from 'oxc-parser';

try {
    parseSync(processed, { sourceFilename: 'validation.js' });
} catch (error) {
    errors.push(`SyntaxError: ${error.message}`);
}
```

**Detecta:**

- Errores de sintaxis JavaScript/TypeScript
- Brackets/paréntesis/llaves desbalanceados
- Strings sin cerrar
- Expresiones inválidas
- Código malformado

**Ventaja:**

- Usa parser de producción (oxc-parser)
- Validación 100% confiable
- Soporta sintaxis moderna (ES2020+)

### Uso Programático

```typescript
import { IntegrityValidator } from './compiler/integrity-validator';

const validator = IntegrityValidator.getInstance();

// Validación básica
const result = validator.validate(originalCode, processedCode);
if (!result.valid) {
    console.error('Validación fallida:', result.errors);
}

// Validación con opciones
const result = validator.validate(originalCode, processedCode, {
    skipSyntaxCheck: false, // Ejecutar Check 4
    verbose: true, // Logging detallado
    throwOnError: false, // No lanzar excepción
});

// Obtener estadísticas
const stats = validator.getStats();
console.log('Cache hit rate:', stats.cacheHits / stats.totalValidations);
console.log('Duración promedio:', stats.averageDuration, 'ms');

// Limpiar caché (útil en tests)
validator.clearCache();

// Resetear estadísticas
validator.resetStats();
```

### Uso en CLI

```bash
# Validación automática en desarrollo
versacompiler --watch
# → IntegrityValidator se ejecuta en cada compilación

# Validación explícita para deploy
versacompiler --all --prod --checkIntegrity
# → Build fallará si algún archivo está corrupto

# Validación con logging detallado
versacompiler --all --prod --checkIntegrity --verbose
# → Muestra detalles de cada validación

# Solo compilar sin validación (más rápido)
versacompiler --all --prod
# → IntegrityValidator no se ejecuta
```

### Performance

```typescript
// Métricas típicas por archivo:
{
    size: '~0.1ms',        // Check 1
    structure: 'N/A',       // Check 2 (suspendido)
    exports: '~1ms',        // Check 3
    syntax: '~3ms',         // Check 4
    total: '1-3ms',         // Total sin Check 2
    cacheHit: '<0.1ms'      // Resultado cacheado
}

// Overhead en compilación completa (40 archivos):
// Sin cache: ~120ms (40 × 3ms)
// Con cache: ~40ms (algunos hits)
```

### Cache LRU

```typescript
// Configuración del cache
const CACHE_SIZE = 100; // Últimas 100 validaciones

// Key de cache: hash del código procesado
const cacheKey = createHash('md5').update(processed).digest('hex');

// Cache hit: retorna resultado inmediato
if (cache.has(cacheKey)) {
    return cache.get(cacheKey); // <0.1ms
}

// Cache miss: ejecuta validación completa
const result = performValidation(original, processed);
cache.set(cacheKey, result); // Almacena para futuro
```

### Mejores Prácticas

#### 1. Desarrollo Local

```bash
# Validación automática sin overhead significativo
versacompiler --watch
# → Validación integrada, cache efectivo
```

#### 2. Builds de Producción

```bash
# Validación exhaustiva antes de deploy
versacompiler --all --prod --checkIntegrity --verbose
# → Detecta cualquier corrupción antes de desplegar
```

#### 3. CI/CD Pipeline

```bash
# Validación en pipeline con fail-fast
versacompiler --all --prod --checkIntegrity --yes
# → Build falla automáticamente si hay errores
```

#### 4. Testing

```typescript
// Limpiar cache entre tests
beforeEach(() => {
    IntegrityValidator.getInstance().clearCache();
    IntegrityValidator.getInstance().resetStats();
});
```

### Limitaciones Conocidas

#### Check 2 (Structure) Suspendido

```typescript
// Problema: Character classes en regex
const regex = /[(abc)]/; // ❌ Detecta ( como bracket real

// Afecta a estos archivos:
// - readConfig.ts
// - compile.ts
// - minifyTemplate.ts
// - transforms.ts
// - module-resolver.ts
// - module-resolution-optimizer.ts

// Solución temporal: Check 2 deshabilitado
// Los Checks 1, 3 y 4 proporcionan protección suficiente
```

### Roadmap Futuro

- [ ] **Check 2**: Implementar detección de character classes en regex
- [ ] **Check 5**: Validación de imports (similar a exports)
- [ ] **Cache persistente**: Cache entre sesiones de compilación
- [ ] **Warnings**: Sistema de warnings no-críticos
- [ ] **Custom checks**: API para checks personalizados
- [ ] **Performance**: Optimizar Check 4 con worker threads

### Docker Integration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# Build usando VersaCompiler
RUN npx versacompiler --all --prod --yes

EXPOSE 3000
CMD ["npm", "start"]
```

## Archivos de Configuración Relacionados

### tsconfig.json

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"]
        }
    }
}
```

### eslint.config.js

```javascript
export default [
    {
        files: ['src/**/*.{js,ts,vue}'],
        rules: {
            // Reglas de ESLint
        },
    },
];
```

### .oxlintrc.json

```json
{
    "rules": {
        // Reglas de OxLint
    }
}
```

## Troubleshooting

### Errores Comunes

#### Error de configuración

```
Error: Cannot find configuration file
```

**Solución**: Verificar que `versacompile.config.ts` existe en la raíz

#### Error de TypeScript

```
Error: Cannot compile TypeScript files
```

**Solución**: Verificar que `tsconfig.json` existe y es válido

#### Error de linting

```
Error: Linter binary not found
```

**Solución**: Instalar las dependencias necesarias (`eslint`, `oxlint`)

### Debug Mode

Usar `--verbose` para obtener información detallada:

```bash
versacompiler --all --verbose
```

Este comando mostrará:

- Archivos siendo procesados
- Tiempo de compilación
- Errores detallados
- Configuración utilizada

## Limitaciones Actuales

VersaCompiler es un proyecto en desarrollo. Características no disponibles:

- ❌ Plugin system extensible
- ❌ Configuración dinámica avanzada
- ❌ Hot Module Replacement completo
- ❌ Source maps avanzados
- ❌ Code splitting automático

Para funcionalidades avanzadas, considera herramientas como Vite, Webpack o Rollup.

## Recursos

- [Guía de Inicio](./getting-started.md)
- [Configuración](./configuration.md)
- [Ejemplos](./examples.md)
- [FAQ](./faq.md)
