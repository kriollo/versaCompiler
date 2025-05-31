# 🎯 Ejemplos y Recetas

## Introducción

Esta guía contiene ejemplos prácticos para casos de uso comunes con VersaCompiler. Cada ejemplo incluye la configuración completa y explicaciones.

## 🚀 Configuraciones por Tipo de Proyecto

### Proyecto Vue 3 Básico

```typescript
// versacompile.config.ts
export default {
    tsconfig: './tsconfig.json',
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@/*': ['src/*'],
            '@components/*': ['src/components/*'],
        },
    },
    proxyConfig: {
        proxyUrl: '',
        assetsOmit: true,
    },
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './eslint.config.js',
            fix: false,
            paths: ['src/'],
        },
    ],
};
```

### Proyecto con TailwindCSS

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
    tailwindConfig: {
        bin: './node_modules/.bin/tailwindcss',
        input: './src/css/input.css',
        output: './public/css/output.css',
    },
    linter: [
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: false,
            paths: ['src/'],
        },
    ],
};
```

### Proyecto con Proxy para API Backend

```typescript
// versacompile.config.ts
export default {
    tsconfig: './tsconfig.json',
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@/*': ['src/*'],
            '@api/*': ['src/api/*'],
        },
    },
    proxyConfig: {
        proxyUrl: 'http://localhost:8080',
        assetsOmit: true,
    },
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './eslint.config.js',
            fix: true,
            paths: ['src/'],
        },
    ],
};
```

### Proyecto con Bundling

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
    bundlers: [
        {
            name: 'appLoader',
            fileInput: './dist/module/appLoader.js',
            fileOutput: './dist/module/appLoader.prod.js',
        },
        {
            name: 'components',
            fileInput: './dist/components/index.js',
            fileOutput: './dist/components.bundle.js',
        },
    ],
};
```

## 📁 Estructuras de Proyecto

### Proyecto Básico Vue + TypeScript

```
mi-app/
├── src/
│   ├── components/
│   │   ├── HelloWorld.vue
│   │   └── Header.vue
│   ├── views/
│   │   ├── Home.vue
│   │   └── About.vue
│   ├── css/
│   │   └── input.css
│   └── main.ts
├── dist/                    # Archivos compilados
├── public/
│   └── index.html
├── versacompile.config.ts
├── tsconfig.json
├── eslint.config.js
└── package.json
```

### Proyecto con TailwindCSS

```
mi-app-tailwind/
├── src/
│   ├── components/
│   │   └── Button.vue
│   ├── css/
│   │   └── input.css        # @tailwind base; @tailwind components; @tailwind utilities;
│   └── main.ts
├── dist/
├── public/
│   ├── css/
│   │   └── output.css       # CSS compilado por Tailwind
│   └── index.html
├── versacompile.config.ts
├── tailwind.config.js
└── package.json
```

## 🎮 Comandos para Diferentes Flujos

### Desarrollo Local

```bash
# Desarrollo con auto-recompilación
versacompiler --watch

# Solo verificar errores sin compilar
versacompiler --lint-only

# Compilar una vez para verificar
versacompiler --all
```

### Producción

```bash
# Build para producción con minificación
versacompiler --all --prod

# Limpiar y build completo
versacompiler --clean --all --prod

# Con salida detallada para debugging
versacompiler --all --prod --verbose
```

### CI/CD Pipeline

```bash
# Script para CI
#!/bin/bash
echo "Verificando código..."
versacompiler --lint-only

echo "Compilando para producción..."
versacompiler --clean --all --prod

echo "Build completado!"
```

## 🔧 Configuraciones Avanzadas

### Linting Dual (ESLint + OxLint)

```typescript
export default {
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
};
```

### Múltiples Aliases

```typescript
export default {
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@/*': ['src/*'],
            '@components/*': ['src/components/*'],
            '@views/*': ['src/views/*'],
            '@utils/*': ['src/utils/*'],
            '@assets/*': ['src/assets/*'],
            'P@/*': ['public/*'],
        },
    },
};
```

### Observación de Archivos Adicionales

```typescript
export default {
    aditionalWatch: [
        './app/templates/**/*.twig',
        './config/**/*.json',
        './data/**/*.yaml',
    ],
};
```

## 📝 Archivos de Configuración Relacionados

### tsconfig.json

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "moduleResolution": "node",
        "strict": true,
        "jsx": "preserve",
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"]
        }
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
```

### eslint.config.js

```javascript
export default [
    {
        files: ['src/**/*.{js,ts,vue}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
        },
        rules: {
            'no-console': 'warn',
            'no-unused-vars': 'error',
            '@typescript-eslint/no-unused-vars': 'error',
        },
    },
];
```

### .oxlintrc.json

```json
{
    "rules": {
        "no-unused-vars": "error",
        "no-console": "warn"
    },
    "env": {
        "browser": true,
        "es2022": true
    }
}
```

### tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{vue,js,ts,jsx,tsx}', './public/**/*.html'],
    theme: {
        extend: {},
    },
    plugins: [],
};
```

## 🚀 Scripts NPM Recomendados

```json
{
    "scripts": {
        "dev": "versacompiler --watch",
        "build": "versacompiler --clean --all --prod",
        "lint": "versacompiler --lint-only",
        "compile": "versacompiler --all",
        "clean": "versacompiler --clean"
    }
}
```

## ❗ Troubleshooting Common

### Error: Cannot find tsconfig.json

```bash
# Verificar que existe el archivo
ls tsconfig.json

# Crear si no existe
tsc --init
```

### Error: Linter binary not found

```bash
# Instalar dependencias de linting
npm install --save-dev eslint oxlint

# Verificar instalación
npx eslint --version
npx oxlint --version
```

### Error: TailwindCSS compilation failed

```bash
# Instalar TailwindCSS
npm install --save-dev tailwindcss

# Inicializar configuración
npx tailwindcss init
```

### HMR no funciona

1. Verificar que `proxyConfig.proxyUrl` esté configurado correctamente
2. Asegurar que el puerto no esté ocupado
3. Verificar que los archivos estén en el directorio `sourceRoot`

## 📚 Ejemplos Completos

Puedes encontrar proyectos de ejemplo completos en:

- `examples/` - Ejemplos incluidos en el repositorio
- [GitHub Discussions](https://github.com/kriollo/versaCompiler/discussions) - Ejemplos de la comunidad

## 🔄 Migración desde Otras Herramientas

### Desde Vite

Si vienes de Vite, la configuración es similar pero más simple:

```typescript
// De vite.config.js a versacompile.config.ts
export default {
    compilerOptions: {
        sourceRoot: './src', // = root en Vite
        outDir: './dist', // = build.outDir en Vite
        pathsAlias: {
            '@/*': ['src/*'], // = resolve.alias en Vite
        },
    },
};
```

### Desde Webpack

```typescript
// De webpack.config.js a versacompile.config.ts
export default {
    compilerOptions: {
        sourceRoot: './src', // = entry path
        outDir: './dist', // = output.path
        pathsAlias: {
            '@/*': ['src/*'], // = resolve.alias
        },
    },
};
```

Para casos más complejos, consulta la [guía de migración](./migration.md).
