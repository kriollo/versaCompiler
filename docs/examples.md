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
            '@utils/*': ['src/utils/*'],
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
            fix: true,
            paths: ['src/'],
            eslintConfig: {
                cache: true,
                formats: ['stylish'],
                maxWarnings: 0,
            },
        },
    ],
};
```

**Comandos de desarrollo:**

```bash
# Desarrollo con HMR
versacompiler --watch

# Compilar componente específico
versacompiler --file src/components/Button.vue

# Build para producción
versacompiler --all --prod --cleanOutput
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
            '@styles/*': ['src/styles/*'],
        },
    },
    tailwindConfig: {
        bin: './node_modules/.bin/tailwindcss',
        input: './src/css/input.css',
        output: './public/css/output.css',
        minify: true, // Para producción
        content: ['./src/**/*.{vue,js,ts}'], // Archivos a escanear
    },
    linter: [
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: true,
            paths: ['src/'],
            oxlintConfig: {
                quiet: false,
                tsconfigPath: './tsconfig.json',
            },
        },
    ],
};
```

**Comandos específicos para TailwindCSS:**

```bash
# Solo compilar TailwindCSS
versacompiler --tailwind

# Desarrollo con auto-compilación de CSS
versacompiler --watch --tailwind --verbose

# Build con optimización de CSS
versacompiler --all --prod --tailwind

# Build con validación de integridad
versacompiler --all --prod --tailwind --checkIntegrity
```

### Proyecto con Validación de Integridad para Deploy (v2.4.0+)

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
    validationOptions: {
        skipSyntaxCheck: false, // Validación completa de sintaxis
        verbose: true, // Logging detallado
        throwOnError: true, // Fallar build si hay errores
    },
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './eslint.config.js',
            fix: false, // No auto-fix en producción
            paths: ['src/'],
            eslintConfig: {
                cache: false, // Sin cache en CI/CD
                maxWarnings: 0, // Cero warnings permitidos
            },
        },
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: false,
            paths: ['src/'],
            oxlintConfig: {
                quiet: false, // Mostrar todos los errores
                tsconfigPath: './tsconfig.json',
            },
        },
    ],
};
```

**Pipeline de CI/CD con validación:**

```bash
# 1. Linting completo
versacompiler --linter

# 2. Verificación de tipos
versacompiler --typeCheck --all

# 3. Build con validación de integridad
versacompiler --all --prod --checkIntegrity --yes

# 4. (Opcional) Verificar estadísticas de validación
# Implementar script personalizado para leer logs
```

**Ejemplo de output con validación:**

```
✓ TypeScript: 35/35 archivos (100%)
✓ Estandarización: 40/40 archivos (100%)
✓ Validación de integridad:
  - Check 1 (Size): 40/40 ✅
  - Check 2 (Structure): Suspendido ⏸️
  - Check 3 (Exports): 40/40 ✅
  - Check 4 (Syntax): 40/40 ✅
  - Cache hits: 85%
  - Duración promedio: 1.2ms
✓ ¡No se encontraron errores ni advertencias!
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
            '@types/*': ['src/types/*'],
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
            eslintConfig: {
                cache: true,
                quiet: false,
                formats: ['stylish'],
            },
        },
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: false,
            paths: ['src/api/', 'src/types/'],
            oxlintConfig: {
                tsconfigPath: './tsconfig.json',
                quiet: true,
            },
        },
    ],
};
```

**Comandos para desarrollo con API:**

```bash
# Desarrollo con proxy habilitado
versacompiler --watch --verbose

# Solo verificar tipos (global)
versacompiler --all --typeCheck

# Linting (usa los paths definidos en versacompile.config.ts)
versacompiler --linter
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
# Desarrollo con auto-recompilación y HMR
versacompiler --watch

# Desarrollo con análisis completo
versacompiler --watch --verbose --typeCheck

# Compilación específica de archivos
versacompiler --file src/components/Dashboard.vue

# Solo linting durante desarrollo
versacompiler --linter

# Solo verificación de tipos
versacompiler --typeCheck --all
```

### Producción

```bash
# Build para producción con minificación
versacompiler --all --prod

# Limpiar y build completo
versacompiler --all --prod --cleanOutput --cleanCache

# Con salida detallada para debugging
versacompiler --all --prod --verbose --yes

# Build específico sin confirmaciones
versacompiler --all --prod --yes --cleanOutput
```

### CI/CD Pipeline

```bash
# Script completo para CI/CD
#!/bin/bash
echo "🔍 Verificando código con linters..."
versacompiler --linter --typeCheck

echo "🧪 Verificando tipos en todo el proyecto..."
versacompiler --typeCheck --all

echo "🏗️ Compilando para producción..."
versacompiler --all --prod --cleanOutput --cleanCache --yes

echo "✅ Build completado!"

# Para GitHub Actions
name: Build and Deploy
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: versacompiler --linter --typeCheck
      - run: versacompiler --all --prod --yes
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
        "build": "versacompiler --cleanOutput --cleanCache --all --prod",
        "lint": "versacompiler --linter",
        "compile": "versacompiler --all",
        "clean": "versacompiler --cleanOutput --cleanCache"
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

## 🚀 Casos de Uso Avanzados

### Proyecto Enterprise con TypeScript Strict

```typescript
// versacompile.config.ts para proyecto enterprise
export default {
    tsconfig: './tsconfig.json',
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@/*': ['src/*'],
            '@components/*': ['src/components/*'],
            '@services/*': ['src/services/*'],
            '@types/*': ['src/types/*'],
            '@utils/*': ['src/utils/*'],
            '@constants/*': ['src/constants/*'],
            '@api/*': ['src/api/*'],
        },
    },
    proxyConfig: {
        proxyUrl: 'https://api.empresa.com',
        assetsOmit: false,
    },
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './eslint.config.js',
            fix: true,
            paths: ['src/'],
            eslintConfig: {
                cache: true,
                maxWarnings: 0, // Cero warnings para enterprise
                quiet: false,
                formats: ['json', 'stylish'],
                deny: ['no-console', 'no-debugger'],
                ignorePattern: ['*.test.ts', '*.spec.ts'],
            },
        },
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: false,
            paths: ['src/'],
            oxlintConfig: {
                tsconfigPath: './tsconfig.json',
                quiet: true,
                rules: {
                    'no-unused-vars': 'error',
                    'prefer-const': 'error',
                },
            },
        },
    ],
    bundlers: [
        {
            name: 'vendor',
            fileInput: './dist/vendor/index.js',
            fileOutput: './dist/vendor.bundle.js',
        },
        {
            name: 'app',
            fileInput: './dist/main.js',
            fileOutput: './dist/app.bundle.js',
        },
    ],
};
```

**Scripts NPM para Enterprise:**

```json
{
    "scripts": {
        "dev": "versacompiler --watch --verbose",
        "dev:clean": "versacompiler --watch --cleanCache",
        "build": "versacompiler --all --prod --cleanOutput --cleanCache --yes",
        "build:analyze": "versacompiler --all --prod --verbose",
        "lint": "versacompiler --linter",
        "lint:fix": "versacompiler --linter --file",
        "type-check": "versacompiler --typeCheck --all",
        "type-check:watch": "versacompiler --typeCheck --watch",
        "clean": "versacompiler --cleanOutput --cleanCache",
        "ci": "versacompiler --linter --typeCheck && versacompiler --all --prod --yes"
    }
}
```

### Micro-frontend con Múltiples Bundlers

```typescript
// versacompile.config.ts para micro-frontends
export default {
    tsconfig: './tsconfig.json',
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@shared/*': ['src/shared/*'],
            '@shell/*': ['src/shell/*'],
            '@mf1/*': ['src/micro-frontend-1/*'],
            '@mf2/*': ['src/micro-frontend-2/*'],
        },
    },
    bundlers: [
        {
            name: 'shell',
            fileInput: './dist/shell/main.js',
            fileOutput: './dist/bundles/shell.js',
        },
        {
            name: 'micro-frontend-1',
            fileInput: './dist/micro-frontend-1/index.js',
            fileOutput: './dist/bundles/mf1.js',
        },
        {
            name: 'micro-frontend-2',
            fileInput: './dist/micro-frontend-2/index.js',
            fileOutput: './dist/bundles/mf2.js',
        },
        {
            name: 'shared',
            fileInput: './dist/shared/index.js',
            fileOutput: './dist/bundles/shared.js',
        },
    ],
    linter: [
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: true,
            paths: ['src/shared/', 'src/shell/'],
            oxlintConfig: {
                quiet: false,
            },
        },
    ],
};
```

### Desarrollo con Hot Reloading Avanzado

```typescript
// versacompile.config.ts para desarrollo optimizado
export default {
    tsconfig: './tsconfig.json',
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@/*': ['src/*'],
        },
    },
    proxyConfig: {
        proxyUrl: 'http://localhost:3001', // Backend en desarrollo
        assetsOmit: false,
    },
    aditionalWatch: [
        './src/**/*.scss',
        './src/**/*.css',
        './public/**/*.html',
        './config/**/*.json',
        './data/**/*.yaml',
    ],
    tailwindConfig: {
        bin: './node_modules/.bin/tailwindcss',
        input: './src/styles/main.css',
        output: './dist/assets/styles.css',
        content: ['./src/**/*.{vue,js,ts,jsx,tsx}'],
        minify: false, // Para desarrollo
    },
};
```

### Proyecto Monorepo

```typescript
// versacompile.config.ts para monorepo
export default {
    tsconfig: './tsconfig.json',
    compilerOptions: {
        sourceRoot: './packages',
        outDir: './dist',
        pathsAlias: {
            '@core/*': ['packages/core/src/*'],
            '@ui/*': ['packages/ui/src/*'],
            '@utils/*': ['packages/utils/src/*'],
            '@app/*': ['packages/app/src/*'],
        },
    },
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './eslint.config.js',
            fix: true,
            paths: ['packages/*/src/'],
            eslintConfig: {
                cache: true,
                formats: ['json'],
            },
        },
    ],
    aditionalWatch: ['./packages/*/package.json', './packages/*/tsconfig.json'],
};
```

**Scripts para Monorepo:**

```bash
# Compilar package específico
versacompiler --file packages/core/src/index.ts

# Compilar todos los packages
versacompiler --all --verbose

# Linting de package específico
versacompiler --linter

# Build completo del monorepo
versacompiler --all --prod --cleanOutput --yes
```

## 🧪 Casos de Testing y QA

### Configuración para Testing

```typescript
// versacompile.config.ts para entorno de testing
export default {
    tsconfig: './tsconfig.test.json', // Config específica para tests
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist-test',
        pathsAlias: {
            '@/*': ['src/*'],
            '@test/*': ['tests/*'],
            '@mocks/*': ['tests/__mocks__/*'],
        },
    },
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './eslint.config.js',
            fix: false, // No auto-fix en testing
            paths: ['src/', 'tests/'],
            eslintConfig: {
                cache: false, // Sin cache para tests
                quiet: true,
                formats: ['json'],
            },
        },
    ],
};
```

### Integración con Jest/Vitest

```json
{
    "scripts": {
        "test:compile": "versacompiler --all --typeCheck",
        "test:lint": "versacompiler --linter",
        "test:prepare": "versacompiler --cleanCache && versacompiler --all",
        "test": "versacompiler --typeCheck --all && jest",
        "test:watch": "versacompiler --watch & jest --watch"
    }
}
```

## 🚀 Optimizaciones de Performance

### Para Proyectos Grandes (1000+ archivos)

```typescript
export default {
    // Configuración optimizada para performance
    linter: [
        {
            name: 'oxlint', // Solo OxLint para velocidad
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: true,
            paths: ['src/'], // Paths específicos
            oxlintConfig: {
                cache: true,
                quiet: true, // Solo errores
                tsconfigPath: './tsconfig.json',
            },
        },
    ],
    // Minimizar watchers adicionales
    aditionalWatch: [], // Vacío para mejor performance
};
```

**Comandos optimizados:**

```bash
# Compilación incremental rápida
versacompiler --file src/changed-file.vue

# Solo verificación crítica
versacompiler --linter --typeCheck src/critical/

# Build paralelo (para CI)
versacompiler --all --prod --yes --verbose
```

### Cache Strategies

```bash
# Limpiar solo cache específico
versacompiler --cleanCache

# Compilación con cache optimizado
versacompiler --watch --verbose

# Verificar estado del cache
versacompiler --verbose --typeCheck --file any-file.ts
```

## 🌐 Deployment y Distribución

### Build para CDN

```typescript
export default {
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist/cdn',
        pathsAlias: {
            '@/*': ['src/*'],
        },
    },
    bundlers: [
        {
            name: 'cdn-bundle',
            fileInput: './dist/cdn/main.js',
            fileOutput: './dist/cdn/app.min.js',
        },
    ],
};
```

### Build con Validación de Integridad (Deploy Seguro)

El flag `--checkIntegrity` / `-ci` valida que el código compilado no tenga errores de integridad antes de hacer deploy.

**¿Qué valida?**

- Código no vacío después de minificación
- Exports preservados correctamente
- Sintaxis válida sin corrupción
- Estructura de código correcta

#### Ejemplo Básico

```bash
# Build normal (desarrollo)
versacompiler --all --prod

# Build con validación de integridad (deploy)
versacompiler --all --prod --checkIntegrity

# Con logs detallados
versacompiler --all --prod --checkIntegrity --verbose
```

#### Scripts en package.json

```json
{
    "scripts": {
        "dev": "versacompiler --watch",
        "build": "versacompiler --all --prod",
        "build:deploy": "versacompiler --all --prod --checkIntegrity",
        "build:safe": "versacompiler --all --prod -ci --verbose --cleanCache"
    }
}
```

**Cuándo usar:**

- ✅ Antes de deploy a producción
- ✅ En CI/CD pipelines
- ✅ Después de actualizar dependencias
- ❌ NO en desarrollo (overhead de ~5ms/archivo)

#### CI/CD con GitHub Actions

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
            - name: Install dependencies
              run: pnpm install

            # Build con validación de integridad
            - name: Build with integrity check
              run: pnpm versacompiler --all --prod --checkIntegrity --verbose

            # Si llega aquí, la validación pasó ✅
            - name: Deploy to production
              run: pnpm deploy
```

#### CI/CD con GitLab CI

```yaml
# .gitlab-ci.yml
stages:
    - build
    - deploy

build:
    stage: build
    script:
        - npm install
        - npx versacompiler --all --prod --checkIntegrity
    artifacts:
        paths:
            - dist/

deploy:
    stage: deploy
    dependencies:
        - build
    script:
        - npm run deploy
    only:
        - main
```

#### Comportamiento en Caso de Error

Si la validación detecta un problema:

```bash
❌ Validación de integridad fallida para App.vue
   Error: Código procesado está vacío o demasiado pequeño

✖ Build failed - Integrity check error
Process exited with code 1
```

El build se detiene inmediatamente y NO se genera output corrupto.

### Docker Multi-stage

```dockerfile
# Dockerfile optimizado con VersaCompiler
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
# Build con validación de integridad
RUN npx versacompiler --all --prod --checkIntegrity --cleanOutput --yes

FROM nginx:alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Kubernetes Deployment

```yaml
# k8s-build-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
    name: versacompiler-build
spec:
    template:
        spec:
            containers:
                - name: builder
                  image: node:18-alpine
                  command: ['/bin/sh']
                  args: [
                          '-c',
                          checkIntegrity --
                          'npm install && npx versacompiler --all --prod --yes',
                      ]
                  volumeMounts:
                      - name: source-code
                        mountPath: /app
            restartPolicy: Never
            volumes:
                - name: source-code
                  configMap:
                      name: app-source
```

Para más ejemplos específicos de tu caso de uso, consulta:

- [Configuración avanzada](./configuration.md)
- [Guía de performance](./performance.md)
- [FAQ](./faq.md)
