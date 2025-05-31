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

| Comando       | Alias | Descripción                      |
| ------------- | ----- | -------------------------------- |
| `--watch`     | `-w`  | Modo observación con HMR         |
| `--all`       |       | Compilar todos los archivos      |
| `--prod`      | `-p`  | Modo producción con minificación |
| `--clean`     |       | Limpiar directorio de salida     |
| `--lint-only` |       | Solo ejecutar linting            |
| `--verbose`   | `-v`  | Salida detallada                 |
| `--help`      | `-h`  | Mostrar ayuda                    |

### Ejemplos de Uso

```bash
# Desarrollo con auto-recompilación
versacompiler --watch

# Build para producción
versacompiler --all --prod

# Solo linting
versacompiler --lint-only

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
    fix: boolean; // Auto-fix errores
    paths: string[]; // Rutas a analizar
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

- **Watch Mode**: Observación de archivos con auto-recompilación
- **HMR Support**: Hot Module Replacement básico
- **Proxy Support**: Proxy para APIs backend durante desarrollo

### Build y Optimización

- **Minificación**: Usando OxcMinify para producción
- **Linting**: ESLint y/o OxLint integrados
- **TailwindCSS**: Compilación automática de estilos

## Integración

### Uso en Scripts NPM

```json
{
    "scripts": {
        "dev": "versacompiler --watch",
        "build": "versacompiler --all --prod",
        "lint": "versacompiler --lint-only",
        "clean": "versacompiler --clean"
    }
}
```

### Integración con CI/CD

```bash
# Pipeline de verificación
versacompiler --lint-only    # Verificar código
versacompiler --all --prod   # Build para producción
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
