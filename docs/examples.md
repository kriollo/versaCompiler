# 🎯 Ejemplos y Recetas

## Introducción

Esta guía contiene ejemplos prácticos y recetas para casos de uso comunes con VersaCompiler. Cada ejemplo incluye la configuración completa y explicaciones detalladas.

## 🚀 Configuraciones por Tipo de Proyecto

### Aplicación Vue 3 + TypeScript

```typescript
// versacompile.config.ts
import { defineConfig } from 'versacompiler';

export default defineConfig({
  sourceRoot: './src',
  outDir: './dist',
  
  alias: {
    '@': './src',
    '@components': './src/components',
    '@views': './src/views',
    '@assets': './src/assets',
    '@utils': './src/utils'
  },
  
  vue: {
    version: 3,
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag.startsWith('ion-')
      }
    },
    script: {
      defineModel: true,
      propsDestructure: true
    }
  },
  
  typescript: {
    strict: true,
    sourceMap: true,
    target: 'ES2020'
  },
  
  server: {
    port: 3000,
    hmr: { enabled: true }
  },
  
  linter: {
    eslint: { enabled: true, fix: true },
    oxlint: { enabled: true }
  }
});
```

### Biblioteca de Componentes

```typescript
// versacompile.config.ts para biblioteca
export default defineConfig({
  sourceRoot: './src',
  outDir: './lib',
  
  build: {
    // Configuración para biblioteca
    target: ['es2018', 'chrome80'],
    minify: false, // Deja la minificación al consumidor
    sourceMaps: true,
    
    // Generar múltiples formatos
    formats: ['es', 'cjs', 'umd'],
    
    // Externals para dependencias
    external: ['vue', 'vue-router'],
    
    // Configuración UMD
    umd: {
      name: 'MiLibreria',
      globals: {
        vue: 'Vue'
      }
    }
  },
  
  vue: {
    template: {
      compilerOptions: {
        hoistStatic: true,
        cacheHandlers: true
      }
    }
  }
});
```

### Proyecto Monorepo

```typescript
// packages/app/versacompile.config.ts
export default defineConfig({
  sourceRoot: './src',
  outDir: './dist',
  
  alias: {
    '@shared': '../../packages/shared/src',
    '@ui': '../../packages/ui/src'
  },
  
  // Configuración específica para workspace
  workspace: {
    root: '../../',
    packages: [
      'packages/*'
    ]
  }
});
```

## 🛠️ Casos de Uso Específicos

### Integración con API Backend

```typescript
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      // Proxy simple
      '/api': 'http://localhost:8080',
      
      // Proxy con configuración avanzada
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        pathRewrite: {
          '^/auth': '/authentication'
        },
        onProxyReq: (proxyReq, req, res) => {
          // Agregar headers personalizados
          proxyReq.setHeader('X-Forwarded-Proto', 'https');
        }
      },
      
      // WebSocket proxy
      '/socket.io': {
        target: 'http://localhost:8080',
        ws: true
      }
    }
  }
});
```

### Optimización para Producción

```typescript
export default defineConfig(({ mode }) => ({
  build: {
    minify: mode === 'production',
    sourceMaps: mode === 'development',
    
    optimization: {
      treeShaking: true,
      deadCodeElimination: true,
      constantFolding: true,
      
      // Splitting de chunks
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    },
    
    // Compresión
    compression: {
      gzip: true,
      brotli: true
    }
  }
}));
```

### TailwindCSS Avanzado

```typescript
export default defineConfig({
  tailwind: {
    enabled: true,
    inputCSS: './src/assets/css/tailwind.css',
    outputCSS: './dist/css/style.css',
    
    // Configuración JIT
    mode: 'jit',
    
    // Purge personalizado
    purge: {
      enabled: true,
      content: [
        './src/**/*.vue',
        './src/**/*.js',
        './src/**/*.ts',
        './public/index.html'
      ],
      options: {
        safelist: [
          'bg-red-500',
          'text-center',
          /^bg-/,
          /^text-/
        ]
      }
    },
    
    // Plugins adicionales
    plugins: [
      require('@tailwindcss/forms'),
      require('@tailwindcss/typography')
    ]
  }
});
```

## 🔧 Workflows de Desarrollo

### Desarrollo Local con HMR

```bash
# Terminal 1: Servidor de desarrollo
versacompiler --watch --verbose

# Terminal 2: Tests en modo watch
npm run test:watch

# Terminal 3: Linting automático
versacompiler --lint-only --watch
```

### Pipeline CI/CD

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint code
        run: versacompiler --lint-only
      
      - name: Run tests
        run: npm test
      
      - name: Build for production
        run: versacompiler --all --prod
      
      - name: Deploy
        if: github.ref == 'refs/heads/main'
        run: npm run deploy
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{vue,ts,js}": [
      "versacompiler --lint-only --fix",
      "git add"
    ]
  }
}
```

## 🎨 Configuraciones de UI Frameworks

### Vuetify Integration

```typescript
export default defineConfig({
  vue: {
    template: {
      transformAssetUrls: {
        'v-img': ['src', 'lazy-src'],
        'v-card-media': 'src',
        'v-responsive': 'src'
      }
    }
  },
  
  build: {
    optimization: {
      splitChunks: {
        cacheGroups: {
          vuetify: {
            test: /[\\/]node_modules[\\/]vuetify[\\/]/,
            name: 'vuetify',
            chunks: 'all'
          }
        }
      }
    }
  }
});
```

### Quasar Framework

```typescript
export default defineConfig({
  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag.startsWith('q-')
      }
    }
  },
  
  alias: {
    'quasar': 'quasar/dist/quasar.esm.js'
  }
});
```

### Element Plus

```typescript
export default defineConfig({
  build: {
    optimization: {
      splitChunks: {
        cacheGroups: {
          elementPlus: {
            test: /[\\/]node_modules[\\/]element-plus[\\/]/,
            name: 'element-plus',
            chunks: 'all'
          }
        }
      }
    }
  }
});
```

## 📱 Configuraciones Mobile

### Capacitor (Ionic)

```typescript
export default defineConfig({
  outDir: './dist',
  
  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag.startsWith('ion-')
      }
    }
  },
  
  build: {
    target: ['es2018', 'chrome70', 'safari12'],
    
    // Optimización para mobile
    optimization: {
      splitChunks: {
        maxSize: 200000, // 200KB chunks máximo
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            maxSize: 500000
          }
        }
      }
    }
  }
});
```

### Cordova

```typescript
export default defineConfig({
  outDir: './www',
  
  build: {
    target: ['es2017', 'android5', 'ios10'],
    
    // CSP compliance
    inlineCSS: false,
    inlineJS: false
  }
});
```

## 🔧 Configuraciones de Testing

### Vitest Integration

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    
    // Coverage
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html', 'lcov']
    }
  }
});
```

### Jest Integration

```javascript
// jest.config.js
module.exports = {
  preset: '@versacompiler/jest-preset',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.vue$': '@versacompiler/jest-transformer',
    '^.+\\.(ts|tsx)$': '@versacompiler/jest-transformer'
  }
};
```

## 🌐 Configuraciones de Deployment

### Netlify

```typescript
export default defineConfig({
  outDir: './dist',
  
  build: {
    // Optimización para Netlify
    optimization: {
      splitChunks: {
        chunks: 'all',
        maxSize: 1000000 // 1MB
      }
    }
  }
});
```

### Vercel

```typescript
export default defineConfig({
  outDir: './dist',
  
  build: {
    target: ['es2020', 'chrome80', 'firefox78', 'safari13']
  }
});
```

### GitHub Pages

```typescript
export default defineConfig({
  outDir: './docs', // GitHub Pages usa /docs
  
  build: {
    assetsDir: 'assets',
    
    // Base URL para GitHub Pages
    base: '/mi-repositorio/'
  }
});
```

## 🚀 Performance Optimization

### Large Codebase

```typescript
export default defineConfig({
  build: {
    parallel: true,
    workers: 8, // Ajustar según CPU
    
    cache: {
      enabled: true,
      type: 'filesystem',
      compression: true
    },
    
    optimization: {
      // Lazy loading de rutas
      splitChunks: {
        chunks: 'async',
        cacheGroups: {
          default: false,
          vendors: false,
          
          // Chunk por página/ruta
          pages: {
            name: 'pages',
            chunks: 'async',
            test: /[\\/]src[\\/]views[\\/]/
          }
        }
      }
    }
  }
});
```

### Memory Optimization

```typescript
export default defineConfig({
  build: {
    // Limitar uso de memoria
    memoryLimit: 4096, // 4GB
    
    // Garbage collection agresivo
    nodeOptions: [
      '--max-old-space-size=4096',
      '--optimize-for-size'
    ]
  }
});
```

## 🔍 Debugging

### Source Maps Avanzados

```typescript
export default defineConfig({
  build: {
    sourceMaps: true,
    
    // Configuración detallada de source maps
    sourceMapOptions: {
      includeContent: true,
      exclude: ['node_modules/**'],
      
      // Source map para CSS
      css: true,
      
      // Source map inline para desarrollo
      inline: process.env.NODE_ENV === 'development'
    }
  }
});
```

### Error Handling

```typescript
export default defineConfig({
  build: {
    // Mostrar errores detallados
    errorOverlay: true,
    
    // No fallar en warnings
    failOnWarnings: false,
    
    // Log detallado de errores
    logLevel: 'verbose'
  }
});
```

## 📊 Análisis y Monitoring

### Bundle Analysis

```bash
# Generar reporte de bundle
versacompiler --all --prod --analyze

# Servidor para visualizar el análisis
versacompiler --serve-analysis
```

### Performance Monitoring

```typescript
export default defineConfig({
  build: {
    // Métricas de compilación
    metrics: {
      enabled: true,
      output: './build-metrics.json'
    },
    
    // Timing detallado
    timing: true
  }
});
```

Esta documentación cubre los casos de uso más comunes. Para necesidades específicas, consulta la [API Reference](./api.md) o abre un [issue](https://github.com/kriollo/versaCompiler/issues) en GitHub.
