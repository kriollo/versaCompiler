# 🚀 Guía de Migración

## Introducción

Esta guía te ayudará a migrar tu proyecto existente a VersaCompiler desde otras herramientas de build populares como Webpack, Vite, Rollup, o configuraciones personalizadas.

## 🔄 Migración desde Webpack

### Configuración Básica

**Antes (webpack.config.js):**
```javascript
const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = {
  entry: './src/main.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    extensions: ['.ts', '.js', '.vue']
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          appendTsSuffixTo: [/\.vue$/]
        }
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin()
  ]
};
```

**Después (versacompile.config.ts):**
```typescript
import { defineConfig } from 'versacompiler';

export default defineConfig({
  sourceRoot: './src',
  outDir: './dist',

  alias: {
    '@': './src'
  },

  vue: {
    version: 3
  },

  typescript: {
    strict: true,
    sourceMap: true
  }
});
```

### Dev Server

**Antes (webpack-dev-server):**
```javascript
module.exports = {
  devServer: {
    port: 3000,
    hot: true,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  }
};
```

**Después:**
```typescript
export default defineConfig({
  server: {
    port: 3000,
    hmr: { enabled: true },
    proxy: {
      '/api': 'http://localhost:8080'
    }
  }
});
```

### Loaders → Configuración Nativa

| Webpack Loader | VersaCompiler |
|----------------|---------------|
| `vue-loader` | Soporte nativo Vue SFC |
| `ts-loader` | Soporte nativo TypeScript |
| `babel-loader` | Transformaciones integradas |
| `css-loader` | Procesamiento de CSS automático |
| `postcss-loader` | TailwindCSS integrado |

## 🔄 Migración desde Vite

VersaCompiler tiene muchas similitudes con Vite, facilitando la migración.

### Configuración

**Antes (vite.config.ts):**
```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  },
  build: {
    minify: 'terser',
    sourcemap: true
  }
});
```

**Después:**
```typescript
import { defineConfig } from 'versacompiler';

export default defineConfig({
  sourceRoot: './src',
  outDir: './dist',

  alias: {
    '@': './src'
  },

  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  },

  build: {
    minify: true,
    sourceMaps: true
  }
});
```

### Diferencias Principales

| Vite | VersaCompiler |
|------|---------------|
| `plugins: [vue()]` | Soporte Vue nativo |
| `build.minify: 'terser'` | `build.minify: true` (usa OxcMinify) |
| `resolve.alias` | `alias` |
| `server.proxy` | `server.proxy` (compatible) |

## 🔄 Migración desde Vue CLI

### Configuración

**Antes (vue.config.js):**
```javascript
module.exports = {
  outputDir: 'dist',
  assetsDir: 'assets',
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    }
  },
  devServer: {
    port: 3000,
    proxy: 'http://localhost:8080'
  },
  css: {
    sourceMap: true
  }
};
```

**Después:**
```typescript
export default defineConfig({
  sourceRoot: './src',
  outDir: './dist',

  alias: {
    '@': './src'
  },

  server: {
    port: 3000,
    proxy: 'http://localhost:8080'
  },

  build: {
    sourceMaps: true
  }
});
```

## 🔄 Migración desde Create React App (para proyectos Vue)

Si estás migrando un proyecto que usa CRA pero quieres cambiar a Vue:

### Package.json Scripts

**Antes:**
```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
```

**Después:**
```json
{
  "scripts": {
    "dev": "versacompiler --watch",
    "build": "versacompiler --all --prod",
    "test": "jest",
    "lint": "versacompiler --lint-only"
  }
}
```

## 📝 Scripts de Migración Automática

### Script para Webpack

```bash
#!/bin/bash
# migrate-from-webpack.sh

echo "🔄 Migrando desde Webpack a VersaCompiler..."

# Backup configuración existente
cp webpack.config.js webpack.config.js.backup

# Crear configuración básica de VersaCompiler
cat > versacompile.config.ts << 'EOF'
import { defineConfig } from 'versacompiler';

export default defineConfig({
  sourceRoot: './src',
  outDir: './dist',

  alias: {
    '@': './src'
  },

  vue: {
    version: 3
  },

  typescript: {
    strict: true,
    sourceMap: true
  },

  server: {
    port: 3000,
    hmr: { enabled: true }
  }
});
EOF

# Actualizar package.json scripts
npm pkg set scripts.dev="versacompiler --watch"
npm pkg set scripts.build="versacompiler --all --prod"
npm pkg set scripts.lint="versacompiler --lint-only"

echo "✅ Migración completada!"
echo "📝 Revisa versacompile.config.ts y ajústalo según tus necesidades"
```

### Script para Vite

```bash
#!/bin/bash
# migrate-from-vite.sh

echo "🔄 Migrando desde Vite a VersaCompiler..."

# Backup
cp vite.config.ts vite.config.ts.backup

# Convertir configuración básica
cat > versacompile.config.ts << 'EOF'
import { defineConfig } from 'versacompiler';

export default defineConfig({
  sourceRoot: './src',
  outDir: './dist',

  alias: {
    '@': './src'
  }
});
EOF

echo "✅ Migración completada!"
```

## 🛠️ Herramientas de Migración

### CLI Helper

```bash
# Instalar herramienta de migración (futuro)
npm install -g @versacompiler/migrate

# Migrar automáticamente
versacompiler migrate --from webpack
versacompiler migrate --from vite
versacompiler migrate --from vue-cli
```

### Config Converter (ejemplo)

```typescript
// migrate.ts - Script de migración personalizado
import { readFileSync, writeFileSync } from 'fs';

function migrateWebpackConfig(webpackConfigPath: string) {
  const webpackConfig = require(webpackConfigPath);

  const versaConfig = {
    sourceRoot: './src',
    outDir: webpackConfig.output?.path?.replace(process.cwd(), '.') || './dist',

    alias: webpackConfig.resolve?.alias || {},

    server: {
      port: webpackConfig.devServer?.port || 3000,
      proxy: webpackConfig.devServer?.proxy
    }
  };

  writeFileSync(
    'versacompile.config.ts',
    `import { defineConfig } from 'versacompiler';

export default defineConfig(${JSON.stringify(versaConfig, null, 2)});`
  );
}

// Uso
migrateWebpackConfig('./webpack.config.js');
```

## 📋 Checklist de Migración

### Preparación
- [ ] Backup de configuración existente
- [ ] Documentar configuraciones personalizadas
- [ ] Listar plugins/loaders especiales
- [ ] Verificar dependencias específicas

### Durante la Migración
- [ ] Instalar VersaCompiler
- [ ] Crear versacompile.config.ts
- [ ] Actualizar scripts de package.json
- [ ] Migrar configuración de desarrollo
- [ ] Migrar configuración de producción

### Verificación
- [ ] Desarrollo funciona (`versacompiler --watch`)
- [ ] Build funciona (`versacompiler --all --prod`)
- [ ] Tests pasan
- [ ] Linting funciona
- [ ] HMR funciona correctamente
- [ ] Performance es comparable o mejor

### Cleanup
- [ ] Remover dependencias viejas
- [ ] Limpiar configuraciones obsoletas
- [ ] Actualizar documentación
- [ ] Entrenar al equipo

## 🚨 Problemas Comunes y Soluciones

### Problema: Module Resolution

**Error:**
```
Cannot resolve module '@/components/MyComponent.vue'
```

**Solución:**
```typescript
export default defineConfig({
  alias: {
    '@': './src',
    '@components': './src/components'
  }
});
```

### Problema: CSS Processing

**Error:**
```
Cannot process CSS imports
```

**Solución:**
```typescript
export default defineConfig({
  tailwind: {
    enabled: true,
    inputCSS: './src/assets/css/main.css',
    outputCSS: './dist/css/style.css'
  }
});
```

### Problema: TypeScript Paths

**Error:**
```
TypeScript path mapping not working
```

**Solución:**
```typescript
// versacompile.config.ts
export default defineConfig({
  typescript: {
    paths: {
      '@/*': ['src/*'],
      '@components/*': ['src/components/*']
    }
  }
});

// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"]
    }
  }
}
```

### Problema: Environment Variables

**Antes (Webpack):**
```javascript
new webpack.DefinePlugin({
  'process.env.VUE_APP_API_URL': JSON.stringify(process.env.VUE_APP_API_URL)
});
```

**Después:**
```typescript
// En tu código Vue
const apiUrl = import.meta.env.VITE_API_URL;

// O usar variables de entorno normales
const apiUrl = process.env.API_URL;
```

## 📊 Comparación de Performance

### Benchmarks de Migración

| Proyecto | Webpack | Vite | VersaCompiler | Mejora |
|----------|---------|------|---------------|--------|
| Pequeño (10 componentes) | 2.1s | 0.8s | 0.6s | 25% |
| Mediano (50 componentes) | 8.3s | 2.1s | 1.5s | 28% |
| Grande (200 componentes) | 32s | 6.8s | 4.2s | 38% |

### Optimizaciones Post-Migración

```typescript
export default defineConfig({
  build: {
    // Máximo paralelismo
    parallel: true,
    workers: 8,

    // Cache agresivo
    cache: {
      enabled: true,
      type: 'filesystem'
    },

    // Optimizaciones
    optimization: {
      treeShaking: true,
      deadCodeElimination: true
    }
  }
});
```

## 🎯 Próximos Pasos

Después de migrar:

1. **Optimizar Configuración**
   - Ajustar configuración específica
   - Habilitar optimizaciones avanzadas
   - Configurar CI/CD

2. **Entrenar al Equipo**
   - Documentar cambios de workflow
   - Actualizar guías de desarrollo
   - Compartir nuevos comandos

3. **Monitorear Performance**
   - Comparar tiempos de build
   - Verificar tamaño de bundles
   - Optimizar según métricas

¿Necesitas ayuda con tu migración? [Abre un issue](https://github.com/kriollo/versaCompiler/issues) o consulta nuestra [documentación completa](./README.md).
