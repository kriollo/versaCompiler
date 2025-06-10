# 🚀 Guía de Migración

## Introducción

Esta guía te ayudará a migrar tu proyecto existente a VersaCompiler desde otras herramientas. **Importante**: VersaCompiler está en desarrollo y tiene limitaciones comparado con herramientas maduras.

⚠️ **Advertencia**: Para proyectos en producción, considera si VersaCompiler cubre todas tus necesidades antes de migrar.

## 🔄 Migración desde Vite

### Configuración Básica

**Antes (vite.config.ts):**

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    build: {
        outDir: 'dist',
    },
});
```

**Después (versacompile.config.ts):**

```typescript
export default {
    tsconfig: './tsconfig.json',
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@/*': ['src/*'],
        },
    },
};
```

### Dev Server

**Antes (Vite):**

```typescript
export default defineConfig({
    server: {
        port: 3000,
        proxy: {
            '/api': 'http://localhost:8080',
        },
    },
});
```

**Después (VersaCompiler):**

```typescript
export default {
    proxyConfig: {
        proxyUrl: 'http://localhost:8080', // Solo un proxy simple
        assetsOmit: true,
    },
};
```

**⚠️ Limitaciones:**

- VersaCompiler solo soporta un proxy simple
- No hay configuración avanzada de servidor
- HMR básico pero con TypeScript workers para mejor performance
- Sin configuración de middleware personalizado

## 🔧 Migración desde Webpack

### Configuración Básica

**Antes (webpack.config.js):**

```javascript
module.exports = {
    entry: './src/main.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
};
```

**Después:**

```typescript
export default {
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@/*': ['src/*'],
        },
    },
};
```

**⚠️ Limitaciones importantes:**

- **No hay sistema de plugins** avanzado
- **No hay loaders personalizados**
- **No hay code splitting** automático
- **No hay optimizaciones avanzadas** como Webpack
- **Pero sí tiene**: TypeScript workers, Vue 3.5 completo, dual linting

## 📝 Scripts NPM

### Actualización de package.json

**Antes (cualquier herramienta):**

```json
{
    "scripts": {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview"
    }
}
```

**Después (VersaCompiler):**

```json
{
    "scripts": {
        "dev": "versacompiler --watch",
        "build": "versacompiler --all --prod",
        "lint": "versacompiler --lint-only",
        "clean": "versacompiler --cleanOutput",
        "clean:cache": "versacompiler --cleanCache",
        "typecheck": "versacompiler --typeCheck",
        "tailwind": "versacompiler --tailwind --watch",
        "build:clean": "versacompiler --cleanOutput --all --prod"
    }
}
```

## 🔍 Migración de Linting

### ESLint

**Antes (configuración en vite.config.ts):**

```typescript
import eslint from 'vite-plugin-eslint';

export default defineConfig({
    plugins: [vue(), eslint()],
});
```

**Después (VersaCompiler):**

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
    ],
};
```

### Configuración Dual (ESLint + OxLint)

```typescript
export default {
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './eslint.config.js',
            fix: false,
            paths: ['src/'],
            rules: {
                '@typescript-eslint/no-unused-vars': 'error',
                'vue/component-definition-name-casing': ['error', 'PascalCase'],
            },
        },
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: false,
            paths: ['src/'],
            rules: {
                'no-unused-vars': 'error',
                'no-console': 'warn',
            },
        },
    ],
    // Habilitar TypeScript workers para mejor performance
    useWorkers: true,
};
```

## 🎨 TailwindCSS

### Migración de TailwindCSS

**Antes (PostCSS/Vite automático):**

```css
/* src/style.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Después (configuración manual):**

```typescript
// versacompile.config.ts
export default {
    tailwindConfig: {
        bin: './node_modules/.bin/tailwindcss',
        input: './src/css/input.css',
        output: './public/css/output.css',
    },
};
```

```css
/* src/css/input.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 📂 Estructura de Archivos

### Cambios Necesarios

**Estructura recomendada para VersaCompiler:**

```
mi-proyecto/
├── src/                       # Código fuente
│   ├── components/            # Componentes Vue
│   ├── css/                   # Estilos (si usas Tailwind)
│   └── main.ts               # Punto de entrada
├── public/                   # Archivos estáticos
├── dist/                     # Build output (auto-generado)
├── versacompile.config.ts    # Configuración
├── tsconfig.json             # TypeScript config
└── package.json
```

## ❌ Características No Disponibles

### Desde Vite

❌ **Plugin system extensible**
❌ **Pre-bundling automático**
❌ **Optimización de dependencias**
❌ **CSS modules automáticos**
❌ **Asset handling avanzado**
❌ **Environment variables automáticas**

✅ **Pero VersaCompiler SÍ incluye:**

- TypeScript workers para mejor performance
- Vue 3.5 soporte completo
- Dual linting (ESLint + OxLint)
- TailwindCSS integrado
- HMR con preservación de estado
- CSS Modules/SCSS básico

### Desde Webpack

❌ **Sistema de loaders**
❌ **Code splitting**
❌ **Dynamic imports**
❌ **Multiple entry points**
❌ **Asset optimization**
❌ **Bundle analysis**

✅ **Pero VersaCompiler SÍ incluye:**

- Compilación paralela con workers
- Minificación con OxcMinify (más rápido)
- Cache inteligente
- TypeScript decorators experimentales

### Desde Rollup

❌ **Tree shaking avanzado**
❌ **Plugin ecosystem**
❌ **Multiple output formats**
❌ **Configuración fine-tuned**

✅ **Pero VersaCompiler SÍ incluye:**

- Tree shaking básico automático
- Dead code elimination
- Optimización de imports ES6
- Minificación moderna con OxcMinify

## 🔄 Proceso de Migración Paso a Paso

### 1. Backup del Proyecto

```bash
git commit -m "Backup before VersaCompiler migration"
```

### 2. Instalar VersaCompiler

```bash
git clone https://github.com/kriollo/versaCompiler.git
cd versaCompiler
npm install
npm run build
# Copiar a tu proyecto...
```

### 3. Crear Configuración

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
        // Soporte para decoradores experimentales
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
    },
    // Habilitar TypeScript workers
    useWorkers: true,
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './eslint.config.js',
            fix: false,
            paths: ['src/'],
        },
    ],
    // Configuración de TailwindCSS
    tailwindConfig: {
        bin: './node_modules/.bin/tailwindcss',
        input: './src/css/input.css',
        output: './public/css/output.css',
    },
};
```

### 4. Probar Compilación

```bash
versacompiler --all --verbose
```

### 5. Probar Desarrollo

```bash
versacompiler --watch
```

### 6. Probar TailwindCSS (si aplica)

```bash
versacompiler --tailwind --watch
```

### 7. Ajustar según Errores

- Verificar que todos los archivos se compilan
- Ajustar paths si es necesario
- Configurar proxy si usas API backend
- Habilitar workers si tienes muchos archivos TypeScript

## ⚠️ Consideraciones Importantes

### Limitaciones Actuales

1. **HMR básico** - Funcional pero no tan robusto como Vite/Webpack
2. **Sin code splitting** - Todo se compila en archivos separados
3. **Sin optimizaciones avanzadas** - Solo minificación con OxcMinify
4. **Proxy simple** - Solo un endpoint
5. **Sin source maps** - Debugging limitado en producción

### Ventajas Únicas de VersaCompiler

1. **TypeScript Workers** - Compilación paralela más rápida
2. **Dual Linting** - ESLint + OxLint simultáneo
3. **Vue 3.5 completo** - Soporte total para las últimas características
4. **Cache inteligente** - Builds incrementales eficientes
5. **TailwindCSS integrado** - Sin configuración adicional

### Casos No Recomendados

**NO uses VersaCompiler si necesitas:**

- 🚫 Aplicaciones enterprise complejas
- 🚫 Multiple entrypoints
- 🚫 Optimizaciones avanzadas
- 🚫 Plugin ecosystem rico
- 🚫 Configuración muy específica

### Casos Recomendados

**SÍ usa VersaCompiler si:**

- ✅ Proyecto experimental/pequeño a mediano
- ✅ Configuración simple y rápida
- ✅ Solo Vue + TypeScript básico/intermedio
- ✅ Quieres herramienta minimalista pero moderna
- ✅ Necesitas TypeScript workers para mejor performance
- ✅ Quieres dual linting sin configuración compleja
- ✅ Proyectos con Vue 3.5 y TypeScript decorators

## 🆘 Troubleshooting de Migración

### Errores Comunes

#### "Module not found"

```typescript
// Verificar pathsAlias
export default {
    compilerOptions: {
        pathsAlias: {
            '@/*': ['src/*'],
            // Agregar otros aliases que usabas
        },
    },
};
```

#### "TypeScript compilation failed"

```bash
# Verificar tsconfig.json
npx tsc --noEmit

# Habilitar workers si tienes muchos archivos
# En versacompile.config.ts
export default {
    useWorkers: true,
    // ...
};
```

#### "Linter not working"

```bash
# Verificar que están instalados
npm list eslint oxlint

# Verificar configuración
versacompiler --linter eslint --verbose
```

#### "TailwindCSS not compiling"

```typescript
// Verificar configuración tailwindConfig
export default {
    tailwindConfig: {
        bin: './node_modules/.bin/tailwindcss',
        input: './src/css/input.css',
        output: './public/css/output.css',
    },
};
```

### Rollback Plan

Si la migración no funciona:

```bash
# Volver a la configuración anterior
git reset --hard HEAD~1

# O mantener ambas configuraciones
mv versacompile.config.ts versacompile.config.ts.bak
```

## 📚 Recursos de Ayuda

- 📖 [FAQ](./faq.md) - Preguntas frecuentes
- 🔧 [API Reference](./api.md) - Documentación técnica
- 🎯 [Ejemplos](./examples.md) - Casos de uso
- 💬 [GitHub Issues](https://github.com/kriollo/versaCompiler/issues) - Reportar problemas

## 💡 Recomendación Final

**Para proyectos nuevos**: Considera empezar con Vite, es más maduro.
**Para experimentar**: VersaCompiler puede ser interesante para aprender.
**Para producción**: Evalúa cuidadosamente si VersaCompiler cubre todas tus necesidades.
