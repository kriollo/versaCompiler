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

| Comando            | Alias | Descripción                                    |
| ------------------ | ----- | ---------------------------------------------- |
| `--init`           |       | Inicializar configuración del proyecto         |
| `--watch`          | `-w`  | Modo observación con HMR y auto-recompilación  |
| `--all`            |       | Compilar todos los archivos del proyecto       |
| `--file <archivo>` | `-f`  | Compilar un archivo específico                 |
| `[archivos...]`    |       | Compilar múltiples archivos específicos        |
| `--prod`           | `-p`  | Modo producción con minificación               |
| `--verbose`        | `-v`  | Mostrar información detallada de compilación   |
| `--cleanOutput`    | `-co` | Limpiar directorio de salida antes de compilar |
| `--cleanCache`     | `-cc` | Limpiar caché de compilación                   |
| `--yes`            | `-y`  | Confirmar automáticamente todas las acciones   |
| `--typeCheck`      | `-t`  | Habilitar/deshabilitar verificación de tipos   |
| `--tailwind`       |       | Habilitar/deshabilitar compilación TailwindCSS |
| `--linter`         |       | Habilitar/deshabilitar análisis de código      |
| `--help`           | `-h`  | Mostrar ayuda y opciones disponibles           |

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
