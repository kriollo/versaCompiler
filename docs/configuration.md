# 🔧 Guía de Configuración Avanzada

## Introducción

VersaCompiler ofrece múltiples formas de configuración para adaptarse a diferentes flujos de trabajo y necesidades de proyecto. Esta guía cubre todas las opciones disponibles.

## Métodos de Configuración

### 1. Archivo de Configuración

El método recomendado es usar un archivo `versacompile.config.ts` en la raíz de tu proyecto:

```typescript
import { defineConfig } from 'versacompiler';

export default defineConfig({
  // Tu configuración aquí
});
```

### 2. Variables de Entorno

```bash
# Configuración via environment variables
export VERSA_SOURCE_ROOT="./src"
export VERSA_OUT_DIR="./dist"
export VERSA_TAILWIND="true"
export VERSA_LINTER="true"
```

### 3. CLI Arguments

```bash
# Sobreescribir configuración via CLI
versacompiler --all --prod --verbose
```

## Opciones de Configuración Completas

### Directorios y Rutas

```typescript
export default defineConfig({
  // Directorio de archivos fuente
  sourceRoot: './src',
  
  // Directorio de salida compilada
  outDir: './dist',
  
  // Directorio de cache
  cacheDir: './node_modules/.cache/versacompiler',
  
  // Archivos a incluir/excluir
  include: ['**/*.vue', '**/*.ts', '**/*.js'],
  exclude: ['node_modules/**', '**/*.test.ts'],
  
  // Aliases para imports
  alias: {
    '@': './src',
    '@components': './src/components',
    '@utils': './src/utils',
    '@assets': './src/assets'
  }
});
```

### Servidor de Desarrollo

```typescript
export default defineConfig({
  server: {
    // Puerto del servidor de desarrollo
    port: 3000,
    
    // Host (por defecto localhost)
    host: '0.0.0.0',
    
    // Proxy para API backend
    proxy: {
      '/api': 'http://localhost:8080',
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        pathRewrite: {
          '^/auth': '/authentication'
        }
      }
    },
    
    // BrowserSync options
    browserSync: {
      notify: false,
      open: true,
      ui: false,
      assetsOmit: false,
      logLevel: 'info'
    },
    
    // HMR configuration
    hmr: {
      enabled: true,
      overlay: true,
      timeout: 30000
    }
  }
});
```

### TypeScript

```typescript
export default defineConfig({
  typescript: {
    // Usar configuración estricta
    strict: true,
    
    // Generar source maps
    sourceMap: true,
    
    // Target de compilación
    target: 'ES2020',
    
    // Módulo de salida
    module: 'ESNext',
    
    // Configuración de paths personalizada
    paths: {
      '@/*': ['src/*'],
      '~/*': ['node_modules/*']
    },
    
    // Opciones adicionales del compilador
    compilerOptions: {
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      skipLibCheck: true
    }
  }
});
```

### Vue.js

```typescript
export default defineConfig({
  vue: {
    // Versión de Vue (automática por defecto)
    version: 3,
    
    // Opciones del compilador de template
    template: {
      transformAssetUrls: true,
      compilerOptions: {
        isCustomElement: (tag) => tag.startsWith('my-')
      }
    },
    
    // Configuración de script setup
    script: {
      defineModel: true,
      propsDestructure: true
    },
    
    // Procesamiento de estilos
    style: {
      preprocessLang: 'scss',
      scoped: true
    }
  }
});
```

### Linting

```typescript
export default defineConfig({
  linter: {
    // Habilitar ESLint
    eslint: {
      enabled: true,
      configFile: '.eslintrc.js',
      extensions: ['.ts', '.js', '.vue'],
      fix: true,
      cache: true
    },
    
    // Habilitar OxLint
    oxlint: {
      enabled: true,
      configFile: '.oxlintrc.json',
      fix: true
    },
    
    // Configuración general
    fixOnSave: true,
    failOnError: true,
    warningsAsErrors: false
  }
});
```

### Build y Optimización

```typescript
export default defineConfig({
  build: {
    // Minificar código
    minify: true,
    
    // Generar source maps
    sourceMaps: true,
    
    // Compilación paralela
    parallel: true,
    
    // Número de workers (automático por defecto)
    workers: 4,
    
    // Cache de compilación
    cache: true,
    
    // Target de navegadores
    target: ['es2020', 'chrome80', 'firefox78'],
    
    // Optimizaciones avanzadas
    optimization: {
      treeShaking: true,
      deadCodeElimination: true,
      constantFolding: true
    }
  }
});
```

### TailwindCSS

```typescript
export default defineConfig({
  tailwind: {
    // Habilitar TailwindCSS
    enabled: true,
    
    // Archivo CSS de entrada
    inputCSS: './src/assets/css/tailwind.css',
    
    // Archivo CSS de salida
    outputCSS: './dist/css/style.css',
    
    // Archivo de configuración
    configFile: './tailwind.config.js',
    
    // Modo de compilación
    mode: 'jit',
    
    // Purge de clases no utilizadas
    purge: {
      enabled: true,
      content: [
        './src/**/*.vue',
        './src/**/*.js',
        './src/**/*.ts'
      ]
    }
  }
});
```

### Cache

```typescript
export default defineConfig({
  cache: {
    // Habilitar cache
    enabled: true,
    
    // Directorio de cache
    directory: './node_modules/.cache/versacompiler',
    
    // Tipo de cache
    type: 'filesystem', // 'memory' | 'filesystem'
    
    // TTL del cache (en segundos)
    maxAge: 3600,
    
    // Compresión del cache
    compression: true,
    
    // Invalidación automática
    invalidateOnConfigChange: true
  }
});
```

### Logging

```typescript
export default defineConfig({
  logging: {
    // Nivel de logging
    level: 'info', // 'error' | 'warn' | 'info' | 'debug'
    
    // Formato de salida
    format: 'pretty', // 'pretty' | 'json' | 'simple'
    
    // Archivo de log
    file: './logs/versacompiler.log',
    
    // Mostrar timestamps
    timestamps: true,
    
    // Colores en la salida
    colors: true
  }
});
```

## Configuraciones por Entorno

### Desarrollo

```typescript
// versacompile.config.dev.ts
export default defineConfig({
  server: {
    port: 3000,
    hmr: { enabled: true }
  },
  build: {
    minify: false,
    sourceMaps: true
  },
  linter: {
    failOnError: false
  }
});
```

### Producción

```typescript
// versacompile.config.prod.ts
export default defineConfig({
  build: {
    minify: true,
    sourceMaps: false,
    optimization: {
      treeShaking: true,
      deadCodeElimination: true
    }
  },
  linter: {
    failOnError: true,
    warningsAsErrors: true
  }
});
```

### Testing

```typescript
// versacompile.config.test.ts
export default defineConfig({
  build: {
    minify: false,
    sourceMaps: true
  },
  linter: {
    enabled: false
  }
});
```

## Configuración Condicional

```typescript
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';
  
  return {
    build: {
      minify: isProduction,
      sourceMaps: isDevelopment,
    },
    server: {
      hmr: { enabled: isDevelopment }
    },
    linter: {
      failOnError: isProduction
    }
  };
});
```

## Integración con Herramientas Externas

### ESLint

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    '@versacompiler/eslint-config'
  ],
  rules: {
    // Reglas personalizadas
  }
};
```

### Prettier

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2
}
```

### TypeScript

```json
// tsconfig.json
{
  "extends": "@versacompiler/tsconfig",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

## Troubleshooting

### Problemas Comunes

#### Cache Corrupto
```bash
# Limpiar cache
versacompiler --clean
rm -rf node_modules/.cache/versacompiler
```

#### Configuración No Reconocida
```typescript
// Verificar sintaxis del archivo config
export default defineConfig({
  // Asegurar estructura correcta
});
```

#### Performance Issues
```typescript
export default defineConfig({
  build: {
    parallel: true,
    workers: 4, // Ajustar según tu CPU
    cache: true
  }
});
```

## Migración de Configuraciones

### Desde Webpack

```typescript
// webpack.config.js -> versacompile.config.ts
export default defineConfig({
  alias: {
    // resolve.alias -> alias
    '@': './src',
    'vue$': 'vue/dist/vue.esm-bundler.js'
  },
  
  server: {
    // devServer -> server
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  }
});
```

### Desde Vite

```typescript
// vite.config.js -> versacompile.config.ts
export default defineConfig({
  // La mayoría de opciones son compatibles
  alias: {
    '@': './src'
  },
  server: {
    port: 3000
  }
});
```
