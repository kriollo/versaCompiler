# 🚀 Guía de Inicio Rápido - VersaCompiler

## 📋 Tabla de Contenidos

1. [Instalación](#-instalación)
2. [Tu Primer Proyecto](#-tu-primer-proyecto)
3. [Estructura Recomendada](#-estructura-recomendada)
4. [Comandos Básicos](#-comandos-básicos)
5. [Configuración Básica](#️-configuración-básica)
6. [Desarrollo con HMR](#-desarrollo-con-hmr)
7. [Build para Producción](#-build-para-producción)
8. [Próximos Pasos](#-próximos-pasos)

## 📦 Instalación

### Instalación Global (Recomendada)
```bash
# NPM
npm install -g versacompiler

# Yarn
yarn global add versacompiler

# PNPM
pnpm add -g versacompiler

# Verificar instalación
versacompiler --help
```

### Instalación Local (Por Proyecto)
```bash
# En tu proyecto existente
npm install --save-dev versacompiler
npx versacompiler --help
```

## 🎯 Tu Primer Proyecto

### Opción 1: Proyecto Nuevo desde Cero
```bash
# 1. Crear directorio
mkdir mi-app-vue
cd mi-app-vue

# 2. Inicializar proyecto
versacompiler --init

# 3. ¡Empezar a desarrollar!
versacompiler --watch
```

### Opción 2: Agregar a Proyecto Existente
```bash
# En tu proyecto existente con Vue/TypeScript
versacompiler --init

# Verificar que todo funciona
versacompiler --all
```

## 📁 Estructura Recomendada

Después de ejecutar `--init`, tendrás esta estructura:

```
mi-proyecto/
├── src/                          # 📝 Código fuente
│   ├── components/               # 🧩 Componentes Vue
│   │   ├── HelloWorld.vue        # 👋 Componente de ejemplo
│   │   └── shared/               # 🔗 Componentes reutilizables
│   ├── views/                    # 📄 Páginas/Vistas
│   ├── composables/              # 🎣 Composition API helpers
│   ├── utils/                    # 🛠️ Utilidades
│   ├── assets/                   # 🎨 Recursos estáticos
│   │   ├── css/                  # 💄 Estilos
│   │   └── images/               # 🖼️ Imágenes
│   ├── types/                    # 📋 Definiciones TypeScript
│   └── main.ts                   # 🚀 Punto de entrada
├── dist/                         # 📦 Output (auto-generado)
├── public/                       # 📁 Archivos estáticos
├── versacompile.config.ts        # ⚙️ Configuración
├── tsconfig.json                 # 📝 Config TypeScript
└── package.json                  # 📋 Dependencias
```

## 🎮 Comandos Básicos

### Desarrollo Diario
```bash
# 🔥 Modo desarrollo con auto-reload
versacompiler --watch
# → Servidor en http://localhost:3000
# → Auto-compilación al guardar archivos
# → HMR instantáneo

# 🔍 Solo verificar código (rápido)
versacompiler --lint-only
# → Ejecuta ESLint + OxLint
# → No compila archivos
# → Perfecto para CI/CD

# 🏗️ Compilar todo una vez
versacompiler --all
# → Compila todos los archivos
# → Ideal para verificar que todo funciona
```

### Producción
```bash
# 🚀 Build optimizado para producción
versacompiler --all --prod
# → Minificación con OxcMinify
# → Optimizaciones automáticas
# → Listo para deploy

# 🧹 Limpiar y recompilar
versacompiler --clean --all --prod
# → Elimina dist/ primero
# → Compilación limpia completa
```

### Debugging
```bash
# 📊 Información detallada
versacompiler --all --verbose
# → Muestra progreso detallado
# → Métricas de performance
# → Useful para debugging

# 🔧 Solo verificar configuración
versacompiler --help
# → Ver todas las opciones disponibles
```

## ⚙️ Configuración Básica

### Configuración Automática
Al ejecutar `--init`, se crea `versacompile.config.ts`:

```typescript
import { defineConfig } from 'versacompiler';

export default defineConfig({
  // 📁 Directorios
  sourceRoot: './src',
  outDir: './dist',

  // 🔗 Aliases para imports
  alias: {
    '@': './src',
    '@components': './src/components',
    '@utils': './src/utils'
  },

  // 🖥️ Servidor de desarrollo
  server: {
    port: 3000,
    hmr: { enabled: true },
    proxy: null // Cambiar si tienes API backend
  },

  // 📝 TypeScript
  typescript: {
    strict: true,
    sourceMap: true
  },

  // 🔍 Linting
  linter: {
    eslint: true,
    oxlint: true,
    fixOnSave: true
  }
});
```

### Configuraciones Comunes

#### Para proyectos con API backend:
```typescript
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080'  // Tu servidor backend
    }
  }
});
```

#### Para equipos grandes (linting estricto):
```typescript
export default defineConfig({
  linter: {
    eslint: true,
    oxlint: true,
    fixOnSave: true,
    strict: true  // Más verificaciones
  },
  typescript: {
    strict: true,
    noImplicitAny: true
  }
});
```

#### Para desarrollo rápido (menos verificaciones):
```typescript
export default defineConfig({
  linter: {
    eslint: false,   // Solo OxLint (más rápido)
    oxlint: true,
    fixOnSave: false
  },
  build: {
    minify: false,   // Sin minificar en dev
    sourceMaps: false
  }
});
```

## 🔥 Desarrollo con HMR

### ¿Qué es HMR?
**Hot Module Replacement** permite actualizar tu código sin recargar la página completa, preservando el estado de la aplicación.

### Como funciona en VersaCompiler:
```bash
# 1. Iniciar modo watch
versacompiler --watch

# 2. Abrir http://localhost:3000
# 3. Editar cualquier archivo .vue, .ts, .js
# 4. ¡Los cambios aparecen instantáneamente!
```

### Tipos de archivos soportados:
- ✅ **Componentes Vue** - Actualización instantánea preservando estado
- ✅ **TypeScript/JavaScript** - Recarga inteligente de módulos
- ✅ **CSS/TailwindCSS** - Inyección de estilos sin recarga
- ✅ **Assets** - Actualización automática de recursos

### Si HMR no funciona:
```typescript
// Verificar configuración
export default defineConfig({
  server: {
    hmr: {
      enabled: true,
      port: 24678  // Puerto diferente si hay conflictos
    }
  }
});
```

## 🚀 Build para Producción

### Build Básico
```bash
versacompiler --all --prod
```

### Build con Limpieza
```bash
versacompiler --clean --all --prod
```

### Verificar Build
```bash
# Verificar que los archivos se generaron
ls -la dist/

# Verificar tamaño de archivos
du -sh dist/*
```

### Optimizaciones Automáticas Incluidas:
- ✅ **Minificación** con OxcMinify (más rápido que Terser)
- ✅ **Tree Shaking** automático
- ✅ **Dead Code Elimination**
- ✅ **Optimización de imports**
- ✅ **Compresión de assets**

## 📚 Próximos Pasos

### Documentación Avanzada
- 📖 [Configuración Avanzada](./configuration.md)
- 🎯 [Ejemplos y Recetas](./examples.md)
- 🔧 [API Reference](./api.md)
- 🚀 [Guía de Migración](./migration.md)

### Funcionalidades Avanzadas a Explorar
- 🎨 **TailwindCSS** integrado
- 🔍 **Linting dual** (ESLint + OxLint)
- 🏗️ **Compilación paralela**
- 📊 **Métricas de performance**
- 🔄 **Cache inteligente**

### Integración con Herramientas
- **VS Code**: Extensión para mejor experiencia
- **GitHub Actions**: CI/CD automático
- **Docker**: Containerización para producción
- **Vercel/Netlify**: Deploy automático

### Comunidad y Soporte
- 🐛 [Reportar Bugs](https://github.com/kriollo/versaCompiler/issues)
- 💬 [Preguntas y Discusiones](https://github.com/kriollo/versaCompiler/discussions)
- 📝 [Contribuir](./contributing.md)

---

## 🎯 ¿Necesitas Ayuda?

### Problemas Comunes
1. **Error de módulos** → `versacompiler --verbose`
2. **HMR no funciona** → Verificar puerto 3000 libre
3. **Linting lento** → Usar solo `oxlint: true`

### Recursos Útiles
- 📖 **README principal**: [../README.md](../README.md)
- 🎯 **Ejemplos prácticos**: [./examples.md](./examples.md)
- 🔧 **Solución de problemas**: [../README.md#troubleshooting](../README.md#troubleshooting)

¡Esperamos que disfrutes desarrollando con VersaCompiler! 🚀
