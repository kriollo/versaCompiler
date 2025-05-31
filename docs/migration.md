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
- HMR básico, no tan robusto como Vite

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

- **No hay sistema de plugins**
- **No hay loaders personalizados**
- **No hay code splitting**
- **No hay optimizaciones avanzadas**

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
        "clean": "versacompiler --clean"
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

### Desde Webpack

❌ **Sistema de loaders**
❌ **Code splitting**
❌ **Dynamic imports**
❌ **Multiple entry points**
❌ **Asset optimization**
❌ **Bundle analysis**

### Desde Rollup

❌ **Tree shaking avanzado**
❌ **Plugin ecosystem**
❌ **Multiple output formats**
❌ **Configuración fine-tuned**

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

### 4. Probar Compilación

```bash
versacompiler --all --verbose
```

### 5. Probar Desarrollo

```bash
versacompiler --watch
```

### 6. Ajustar según Errores

- Verificar que todos los archivos se compilan
- Ajustar paths si es necesario
- Configurar proxy si usas API backend

## ⚠️ Consideraciones Importantes

### Limitaciones Actuales

1. **HMR básico** - No tan robusto como Vite/Webpack
2. **Sin code splitting** - Todo se compila en archivos separados
3. **Sin optimizaciones avanzadas** - Solo minificación básica
4. **Proxy simple** - Solo un endpoint
5. **Sin source maps** - Debugging limitado

### Casos No Recomendados

**NO uses VersaCompiler si necesitas:**

- 🚫 Aplicaciones enterprise complejas
- 🚫 Multiple entrypoints
- 🚫 Optimizaciones avanzadas
- 🚫 Plugin ecosystem rico
- 🚫 Configuración muy específica

### Casos Recomendados

**SÍ usa VersaCompiler si:**

- ✅ Proyecto experimental/pequeño
- ✅ Configuración simple
- ✅ Solo Vue + TypeScript básico
- ✅ Quieres herramienta minimalista

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
```

#### "Linter not working"

```bash
# Verificar que están instalados
npm list eslint oxlint
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
