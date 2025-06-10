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

### Instalación desde Código Fuente

```bash
# Clonar repositorio
git clone https://github.com/kriollo/versaCompiler.git
cd versaCompiler

# Instalar dependencias
npm install

# Compilar
npm run build

# Usar en tu proyecto
cp -r dist/* tu-proyecto/versacompiler/
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
# → HMR instantáneo con TypeScript workers

# 🔍 Solo verificar código (rápido)
versacompiler --lint-only
# → Ejecuta ESLint + OxLint
# → No compila archivos
# → Perfecto para CI/CD

# 🏗️ Compilar todo una vez
versacompiler --all
# → Compila todos los archivos
# → Ideal para verificar que todo funciona

# 📁 Compilar archivos específicos
versacompiler --file src/components/MyComponent.vue
# → Compila solo el archivo especificado
# → Útil para testing de componentes individuales

# ✅ Solo verificación de tipos TypeScript
versacompiler --typeCheck
# → Ejecuta TypeScript compiler en modo check
# → Validación de tipos sin compilación
```

### Producción

```bash
# 🚀 Build optimizado para producción
versacompiler --all --prod
# → Minificación con OxcMinify
# → Optimizaciones automáticas
# → Listo para deploy

# 🧹 Limpiar y recompilar
versacompiler --cleanOutput --all --prod
# → Elimina dist/ primero
# → Compilación limpia completa

# 🗑️ Limpiar cache
versacompiler --cleanCache --all
# → Limpia cache de compilación
# → Útil cuando hay problemas de cache
```

### TailwindCSS

```bash
# 🎨 Compilar con TailwindCSS
versacompiler --tailwind --watch
# → Incluye compilación automática de Tailwind
# → Hot reload de estilos CSS

# 🎨 Solo compilar Tailwind
versacompiler --tailwind --file src/styles/input.css
# → Compila solo los estilos de Tailwind
```

### Linting Avanzado

```bash
# 🔍 Ejecutar linters específicos
versacompiler --linter eslint
# → Solo ejecuta ESLint

versacompiler --linter oxlint
# → Solo ejecuta OxLint (más rápido)

# 🔧 Auto-fix con linters
versacompiler --lint-only --yes
# → Ejecuta linters con auto-fix habilitado
```

### Debugging

```bash
# 📊 Información detallada
versacompiler --all --verbose
# → Muestra progreso detallado
# → Métricas de performance
# → Información de TypeScript workers

# 🔧 Solo verificar configuración
versacompiler --help
# → Ver todas las 14 opciones CLI disponibles

# 📦 Información de archivos procesados
versacompiler src/components/ --verbose
# → Procesa directorio específico con logs detallados
```

## ⚙️ Configuración Básica

### Configuración Básica

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
    // Configuración de TailwindCSS
    tailwindConfig: {
        bin: './node_modules/.bin/tailwindcss',
        input: './src/css/input.css',
        output: './public/css/output.css',
    },
};
```

### Configuraciones Comunes

#### Para proyectos con API backend:

```typescript
export default {
    proxyConfig: {
        proxyUrl: 'http://localhost:8080', // Tu servidor backend
        assetsOmit: true,
    },
};
```

#### Para equipos grandes (linting estricto):

```typescript
export default {
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './eslint.config.js',
            fix: true,
            paths: ['src/'],
            rules: {
                '@typescript-eslint/no-unused-vars': 'error',
                '@typescript-eslint/explicit-function-return-type': 'warn',
                'vue/component-definition-name-casing': ['error', 'PascalCase'],
            },
        },
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: true,
            paths: ['src/'],
            rules: {
                'no-unused-vars': 'error',
                'no-console': 'warn',
            },
        },
    ],
};
```

#### Para desarrollo rápido (menos verificaciones):

```typescript
export default {
    linter: [
        {
            name: 'oxlint', // Solo OxLint (más rápido)
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: false,
            paths: ['src/'],
        },
    ],
};
```

#### Para proyectos con TypeScript estricto:

```typescript
export default {
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@/*': ['src/*'],
            '@components/*': ['src/components/*'],
            '@utils/*': ['src/utils/*'],
        },
        // Habilitar decoradores experimentales
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
    },
    // Usar workers para TypeScript (mejor performance)
    useWorkers: true,
};
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

- ✅ **Componentes Vue 3.5** - Actualización instantánea preservando estado
- ✅ **TypeScript/JavaScript** - Recarga inteligente de módulos con workers
- ✅ **CSS/TailwindCSS** - Inyección de estilos sin recarga
- ✅ **Assets** - Actualización automática de recursos
- ✅ **CSS Modules/SCSS** - Soporte completo con HMR

### TypeScript Workers para HMR

VersaCompiler utiliza **TypeScript Workers** para mejorar la performance del HMR:

```typescript
// versacompile.config.ts
export default {
    // Habilitar workers para mejor performance
    useWorkers: true,
    compilerOptions: {
        // ... otras opciones
    },
};
```

### Funcionalidades avanzadas de HMR:

- 🔄 **Cache inteligente** - Solo recompila archivos modificados
- ⚡ **Validación en paralelo** - TypeScript workers independientes
- 🎨 **Hot reload de estilos** - TailwindCSS y CSS Modules
- 🧩 **Preservación de estado** - Vue Composition API y Options API

### Si HMR no funciona:

```typescript
// Verificar configuración
export default {
    proxyConfig: {
        proxyUrl: '', // Vacío si no usas proxy
        assetsOmit: true,
    },
    // Asegurar puerto libre
    port: 3000, // o cambiar si está ocupado
};
```

### Debug de HMR:

```bash
# Ejecutar con logs detallados
versacompiler --watch --verbose
# → Muestra información de archivos recargados
# → Estado de TypeScript workers
# → Performance de HMR
```

## 🚀 Build para Producción

### Build Básico

```bash
versacompiler --all --prod
```

### Build con Limpieza

```bash
versacompiler --cleanOutput --all --prod
```

### Build con Cache Limpio

```bash
versacompiler --cleanCache --all --prod
```

### Verificar Build

```bash
# Verificar que los archivos se generaron
ls -la dist/

# Verificar tamaño de archivos
du -sh dist/*

# Verificar tipos TypeScript
versacompiler --typeCheck --prod
```

### Optimizaciones Automáticas Incluidas:

- ✅ **Minificación** con OxcMinify (más rápido que Terser)
- ✅ **Tree Shaking** automático
- ✅ **Dead Code Elimination**
- ✅ **Optimización de imports**
- ✅ **Compresión de assets**
- ✅ **Vue 3.5 optimizations** - Mejores optimizaciones del compiler
- ✅ **TypeScript decorators** - Soporte completo en producción
- ✅ **CSS Modules optimization** - Eliminación de CSS no usado

### Builds Específicos

```bash
# Solo compilar archivos específicos para producción
versacompiler --file src/main.ts --prod

# Build con TailwindCSS optimizado
versacompiler --all --tailwind --prod

# Build con validación estricta
versacompiler --all --typeCheck --lint-only --prod
```

## 📚 Próximos Pasos

### Documentación Avanzada

- 📖 [Configuración Avanzada](./configuration.md)
- 🎯 [Ejemplos y Recetas](./examples.md)
- 🔧 [API Reference](./api.md)
- 🚀 [Guía de Migración](./migration.md)

### Funcionalidades Avanzadas a Explorar

- 🎨 **TailwindCSS** integrado con hot reload
- 🔍 **Linting dual** (ESLint + OxLint) con auto-fix
- 🏗️ **Compilación paralela** con TypeScript workers
- 📊 **Métricas de performance** en tiempo real
- 🔄 **Cache inteligente** para builds incrementales
- 🎭 **Vue 3.5 completo** - Composition API, script setup, TypeScript
- 🎯 **TypeScript decorators** - Soporte experimental completo
- 📦 **CSS Modules/SCSS** - Preprocesadores integrados
- ⚡ **HMR avanzado** - Preservación de estado y recarga selectiva

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
4. **TypeScript lento** → Habilitar `useWorkers: true`
5. **Cache corrupto** → `versacompiler --cleanCache`
6. **Tailwind no compila** → Verificar configuración `tailwindConfig`

### Recursos Útiles

- 📖 **README principal**: [../README.md](../README.md)
- 🎯 **Ejemplos prácticos**: [./examples.md](./examples.md)
- 🔧 **Solución de problemas**: [../README.md#troubleshooting](../README.md#troubleshooting)

¡Esperamos que disfrutes desarrollando con VersaCompiler! 🚀
