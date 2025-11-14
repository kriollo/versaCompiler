# 🚀 VersaCompiler

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-35495E?style=flat&logo=vuedotjs&logoColor=4FC08D)](https://vuejs.org/)

> **🎯 Compilador rápido y eficiente para Vue.js, TypeScript y JavaScript con Hot Module Replacement (HMR) integrado.**

**VersaCompiler** es una herramienta de compilación diseñada para proyectos Vue 3 con soporte completo para TypeScript, JavaScript y todas las funcionalidades modernas que necesitas para desarrollo web.

## 🌟 Características Principales

- ⚡ **Compilación ultra-rápida** - Workers paralelos y cache inteligente
- 🔥 **HMR Automático (como Vite)** - Detección inteligente sin configuración manual, igual que Vite y esbuild
- 🧩 **Soporte completo para Vue 3** - SFC, Composition API, script setup
- 📝 **TypeScript avanzado** - Language Service, decorators, validación de tipos
- 🔍 **Sistema de linting dual** - ESLint + OxLint con auto-fix
- 🎨 **TailwindCSS integrado** - Compilación automática y optimizada
- 🗜️ **Minificación de última generación** - OxcMinify para builds ultra-optimizados
- 📦 **Bundling inteligente** - Agrupación configurable de módulos (EN DESARROLLO)
- 🛠️ **Compilación por archivo** - Granular control de compilación
- 🧹 **Gestión de caché avanzada** - Cache automático con invalidación inteligente

## ⚡ Instalación

### 📦 Desde código fuente

```bash
git clone https://github.com/kriollo/versaCompiler.git
cd versaCompiler
npm install
npm run build
```

### 🔗 Instalación local en tu proyecto

```bash
# Copiar archivos compilados a tu proyecto
cp -r dist/* tu-proyecto/versacompiler/
```

## 🎯 Quick Start

### 1. Configuración inicial

```bash
# Crear archivo de configuración
versacompiler --init
```

### 2. Estructura de proyecto

```
mi-proyecto/
├── src/                    # 📝 Código fuente
│   ├── components/         # 🧩 Componentes Vue
│   └── main.ts            # 🚀 Punto de entrada
├── dist/                  # 📦 Archivos compilados (auto-generado)
├── versacompile.config.ts # ⚙️ Configuración
└── package.json
```

### 3. Comandos básicos

```bash
# 🔥 Desarrollo con auto-reload y HMR
versacompiler --watch

# 🔥 Desarrollo con análisis detallado
versacompiler --watch --verbose

# 🏗️ Compilar todo el proyecto
versacompiler --all

# 📄 Compilar archivo específico
versacompiler --file src/components/MyComponent.vue

# 📝 Compilar múltiples archivos específicos
versacompiler src/main.ts src/components/App.vue

# 🚀 Build para producción (minificado)
versacompiler --all --prod

# 🧹 Limpiar y recompilar todo
versacompiler --all --cleanOutput --cleanCache

# 🔍 Solo verificar código (linting)
versacompiler --linter

# 🎨 Solo compilar TailwindCSS
versacompiler --tailwind

# ⚡ Compilación rápida con confirmación automática
versacompiler --all --prod --yes

# 🔬 Verificación de tipos específica
versacompiler --typeCheck --file src/types.ts
```

## 📖 Configuración

### 🛠️ Comandos CLI Disponibles

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

### 🔧 Archivo de configuración

Crea un archivo `versacompile.config.ts` en la raíz de tu proyecto:

```typescript
// Archivo de configuración de VersaCompiler
export default {
    tsconfig: './tsconfig.json',
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@/*': ['src/*'],
            'P@/*': ['public/*'],
        },
    },
    proxyConfig: {
        proxyUrl: '',
        assetsOmit: true,
    },
    aditionalWatch: ['./app/templates/**/*.twig'],
    tailwindConfig: {
        bin: './node_modules/.bin/tailwindcss',
        input: './src/css/input.css',
        output: './public/css/output.css',
    },
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
    bundlers: [
        {
            name: 'appLoader',
            fileInput: './public/module/appLoader.js',
            fileOutput: './public/module/appLoader.prod.js',
        },
    ],
};
```

### 📝 Opciones de configuración

#### `compilerOptions`

- `sourceRoot`: Directorio de archivos fuente (por defecto: `'./src'`)
- `outDir`: Directorio de salida (por defecto: `'./dist'`)
- `pathsAlias`: Aliases para imports (ej: `'@/*': ['src/*']`)

#### `proxyConfig`

- `proxyUrl`: URL del proxy para desarrollo
- `assetsOmit`: Omitir assets en el proxy

#### `tailwindConfig`

- `bin`: Ruta al binario de TailwindCSS
- `input`: Archivo CSS de entrada
- `output`: Archivo CSS de salida

#### `linter`

Array de configuraciones de linters avanzadas:

- `name`: Nombre del linter (`'eslint'` o `'oxlint'`)
- `bin`: Ruta al binario del linter
- `configFile`: Archivo de configuración del linter
- `fix`: Auto-fix de errores detectados
- `paths`: Rutas específicas a analizar
- `eslintConfig`: Configuración específica de ESLint
    - `cache`: Habilitar cache de ESLint
    - `maxWarnings`: Máximo número de warnings
    - `quiet`: Mostrar solo errores
    - `formats`: Formatos de salida (`'json'`, `'stylish'`, `'compact'`)
- `oxlintConfig`: Configuración específica de OxLint
    - `rules`: Reglas personalizadas
    - `plugins`: Plugins de OxLint
    - `deny`: Reglas a denegar
    - `allow`: Reglas a permitir

#### `bundlers`

Array de configuraciones de bundling:

- `name`: Nombre del bundle
- `fileInput`: Archivo de entrada
- `fileOutput`: Archivo de salida

## 🔥 Hot Module Replacement (HMR)

VersaCompiler incluye **detección automática de HMR** similar a Vite y esbuild, **sin necesidad de configuración manual**.

### ✨ Detección Automática

El sistema detecta automáticamente 3 estrategias:

1. **Self-Accept** - Módulos que declaran soporte HMR explícito
2. **Propagate** - Módulos con exports simples (funciones, constantes)
3. **Full Reload** - Módulos complejos que requieren recarga completa

### 📝 Ejemplo Básico

```javascript
// ✅ HMR automático - sin configuración
export function formatDate(date) {
    return new Intl.DateTimeFormat('es-ES').format(date);
}

// No necesitas agregar nada más, VersaCompiler lo detecta automáticamente
```

### 🎯 Ejemplo Avanzado

```javascript
// dashboard.js
export function initDashboard() {
    console.log('Dashboard iniciado');
}

// ✨ Soporte HMR explícito con preservación de estado
if (import.meta.hot) {
    import.meta.hot.accept(newModule => {
        console.log('Dashboard actualizado sin recargar');
        newModule?.initDashboard();
    });
}
```

### 📚 Documentación Completa

- [Guía de HMR](./docs/hmr-guide.md) - Documentación completa con ejemplos
- [Demo Interactiva](./examples/hmr-demo/) - Prueba el HMR en tiempo real

## 🎯 Ejemplos de Uso

### Desarrollo Local

```bash
# Iniciar servidor de desarrollo con HMR
versacompiler --watch

# Desarrollo con información detallada
versacompiler --watch --verbose

# Compilación específica durante desarrollo
versacompiler --file src/main.ts

# Solo linting durante desarrollo
versacompiler --linter

# Desarrollo con limpieza de caché
versacompiler --watch --cleanCache
```

### Compilación para Producción

```bash
# Build completo para producción
versacompiler --all --prod

# Build con limpieza previa
versacompiler --all --prod --cleanOutput --cleanCache

# Build silencioso para CI/CD
versacompiler --all --prod --yes

# Build con análisis detallado
versacompiler --all --prod --verbose
```

### Flujos de Trabajo Específicos

```bash
# Compilar solo archivos modificados
versacompiler file1.vue file2.ts file3.js

# Verificación de tipos específica
versacompiler --typeCheck --file src/types/api.ts

# Solo TailwindCSS
versacompiler --tailwind

# Compilación híbrida (linting + compilación)
versacompiler --all --linter --typeCheck
```

### Integración CI/CD

```bash
# Pipeline de CI completo
versacompiler --linter                    # 1. Verificar código
versacompiler --typeCheck --all          # 2. Verificar tipos
versacompiler --all --prod --yes         # 3. Build para producción
```

## 🧩 Casos de Uso Avanzados

### 🎮 Desarrollo de Componentes Vue

```bash
# Compilación específica de componente con hot reload
versacompiler --watch --file src/components/GameBoard.vue

# Desarrollo con validación de tipos estricta
versacompiler --watch --typeCheck --verbose

# Solo compilar estilos para rapid prototyping
versacompiler --tailwind --file src/styles/components.css
```

### 🏢 Proyectos Enterprise

```bash
# Validación completa antes de commit
versacompiler --linter --typeCheck --all

# Build optimizado para múltiples entornos
versacompiler --all --prod --cleanOutput --verbose

# Análisis de bundle para optimización
versacompiler --all --prod --verbose | grep "Bundle"
```

### 🧪 Testing y CI/CD

```bash
# Pre-commit hooks
versacompiler --linter --typeCheck --cleanCache

# GitHub Actions / CI Pipeline
versacompiler --all --prod --yes --verbose

# Testing de componentes individuales
versacompiler --file tests/components/Button.test.ts
```

### 🎨 Design System Development

```bash
# Compilación de componentes de design system
versacompiler --watch src/design-system/components/

# Build de librería de componentes
versacompiler --all --prod src/design-system/

# Validación de tokens de diseño
versacompiler --tailwind --verbose
```

## 🏗️ Funcionalidades

### 🔥 Hot Module Replacement (HMR)

- **Componentes Vue**: Actualizaciones instantáneas preservando estado de componentes
- **TypeScript/JavaScript**: Recarga inteligente de módulos sin perder contexto
- **CSS/TailwindCSS**: Inyección de estilos en tiempo real
- **Key-based updates**: Sistema de keys únicos para identificación de componentes

### 🚀 Sistema de Compilación Avanzado

- **Worker Threads**: Pool de workers TypeScript optimizado para CPU cores
- **Cache inteligente**: Sistema de cache por archivos con invalidación automática
- **Compilación incremental**: Solo recompila archivos modificados
- **Progress tracking**: Métricas en tiempo real con timing detallado
- **Lazy loading**: Carga de módulos bajo demanda para máxima eficiencia

### 🔍 Sistema de Linting Dual de Nueva Generación

- **ESLint**: Análisis profundo de código JavaScript/TypeScript/Vue
    - Soporte para múltiples formatos de salida (json, stylish, compact)
    - Cache inteligente para acelerar análisis repetitivos
    - Auto-fix avanzado con preservación de formato
- **OxLint**: Linter ultra-rápido escrito en Rust
    - Análisis paralelo de archivos
    - Reglas optimizadas para Vue 3 y TypeScript moderno
    - Integración con tsconfig.json

### 📝 TypeScript de Última Generación

- **Language Service Host**: Validación de tipos completa y optimizada
- **Soporte para Decorators**: Experimental decorators y emit decorator metadata
- **Archivos virtuales**: Soporte para archivos .vue como .vue.ts
- **Worker-based validation**: Validación de tipos en threads separados
- **Fallback inteligente**: Modo sincrónico para entornos de testing
- **Error filtering**: Filtrado inteligente de errores específicos de TypeScript

### 🧩 Soporte Vue 3 de Nivel Profesional

- **Vue 3.5 Support**: Soporte completo para las últimas características
- **Script Setup**: Compilación optimizada de composition API
- **CSS Modules**: Soporte completo para CSS modules con hashing
- **Scoped Styles**: Compilación de estilos scoped con scope IDs únicos
- **SCSS/Sass**: Preprocesadores CSS integrados
- **Custom Blocks**: Soporte para bloques personalizados en SFC
- **Slots avanzados**: Compilación optimizada de slots con fallbacks

### 📦 Minificación y Optimización

- **OxcMinify**: Minificador de última generación escrito en Rust
- **Tree shaking**: Eliminación inteligente de código no utilizado
- **Variable mangling**: Renombrado de variables para máxima compresión
- **Dead code elimination**: Eliminación de código muerto
- **Compresión avanzada**: Algoritmos de compresión optimizados
- **Source maps**: Generación de source maps en desarrollo

### 🛠️ Gestión de Archivos y Cache

- **Sistema de cache multinivel**: Cache de configuraciones, compilaciones y validaciones
- **Invalidación inteligente**: Cache invalidation basado en timestamps y dependencias
- **Compilación granular**: Compilación por archivo individual o en lotes
- **Gestión de dependencias**: Tracking automático de dependencias entre archivos
- **Limpieza automática**: Auto-limpieza de archivos obsoletos

### 🎨 TailwindCSS Integrado

- **Compilación automática**: Watch mode integrado para cambios en CSS
- **Optimización de producción**: Minificación y purging automático
- **Content scanning**: Escaneo inteligente de archivos para clases utilizadas
- **Config personalizada**: Soporte para configuraciones personalizadas de Tailwind

## 🚧 Troubleshooting

### ❌ Problemas Frecuentes

#### 🔍 Error: "Cannot resolve module" o problemas de imports

```bash
# Verificar configuración de aliases y paths
versacompiler --verbose --file problemFile.ts

# Limpiar cache TypeScript si persiste
versacompiler --cleanCache

# Verificar configuración en tsconfig.json
cat tsconfig.json | grep -A 10 "paths"
```

#### 🔥 HMR no funciona correctamente

```typescript
// Verificar configuración en versacompile.config.ts
export default {
    proxyConfig: {
        proxyUrl: '', // Vacío si no usas proxy backend
        assetsOmit: true,
    },
};
```

```bash
# Reiniciar con limpieza de cache
versacompiler --watch --cleanCache
```

#### 🐌 Compilación o linting muy lento

```bash
# Usar solo OxLint para máxima velocidad
versacompiler --linter --verbose

# Verificar si worker threads están activos
versacompiler --verbose --typeCheck

# Limpiar cache si está corrupto
versacompiler --cleanCache --cleanOutput
```

#### 🔴 Errores de TypeScript en archivos Vue

```bash
# Verificar soporte para decorators en tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}

# Ejecutar solo verificación de tipos
versacompiler --typeCheck --file Component.vue
```

#### ⚠️ Warnings de dependencias o módulos

```bash
# Verificar si las dependencias están instaladas
npm install

# Revisar configuración de paths en versacompile.config.ts
versacompiler --verbose --file problematicFile.ts
```

#### 🎨 TailwindCSS no se actualiza

```bash
# Verificar configuración de Tailwind
versacompiler --tailwind --verbose

# Limpiar cache de TailwindCSS
rm -rf ./node_modules/.cache/tailwindcss
versacompiler --tailwind --cleanCache
```

### 🔧 Configuraciones de Debug

#### Habilitar logging detallado

```bash
# Máximo nivel de detalle
versacompiler --verbose --all

# Debug específico por archivo
versacompiler --verbose --file src/problematicFile.vue
```

#### Verificar configuración activa

```bash
# Ver configuración cargada
versacompiler --verbose --init  # Muestra config actual
```

#### Performance profiling

```bash
# Analizar performance de compilación
versacompiler --verbose --all --prod
# Revisar timings en la salida
```

## 📚 Documentación

- 📖 [**Guía de Inicio Rápido**](./docs/getting-started.md)
- 📋 [**Configuración Avanzada**](./docs/configuration.md)
- 🎯 [**Ejemplos y Recetas**](./docs/examples.md)
- 🔧 [**API Reference**](./docs/api.md)
- 🔄 [**Guía de Migración**](./docs/migration.md)
- 🤝 [**Guía de Contribución**](./docs/contributing.md)
- ❓ [**FAQ - Preguntas Frecuentes**](./docs/faq.md)

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Ver [CONTRIBUTING.md](./docs/contributing.md) para detalles.

### 🛠️ Desarrollo Local

```bash
git clone https://github.com/kriollo/versaCompiler.git
cd versaCompiler
npm install
npm run dev
```

## 📄 Licencia

MIT © [Jorge Jara H](https://github.com/kriollo)

## 🙏 Agradecimientos

- **Vue.js Team** - Por el increíble framework
- **TypeScript Team** - Por el excelente sistema de tipos
- **Oxc Project** - Por las herramientas de desarrollo ultra-rápidas
- **Comunidad Open Source** - Por el feedback y contribuciones

---

## 🔧 Arquitectura Técnica

### Compilación de Archivos

- **JavaScript (.js)**: Procesamiento, transformaciones y optimización con placement inteligente
- **TypeScript (.ts)**: Transpilación completa usando TypeScript Compiler API con Language Service
- **Vue SFC (.vue)**: Compilación completa de Single File Components con:
    - Script compilation (incluyendo script setup)
    - Template compilation con optimizaciones
    - Style compilation (CSS, SCSS, CSS Modules, Scoped)
    - Custom blocks processing

### Sistema de Workers Avanzado

- **TypeScript Worker Threads**: Validación de tipos en procesos separados
- **Fallback sincrónico**: Detección automática de entorno de testing
- **Pool de workers**: Optimizado según CPU cores disponibles
- **Cache de validación**: Resultados de validación persistentes

### Minificación de Última Generación

- **OxcMinify**: Minificador ultra-rápido en Rust para modo `--prod`
- **Variable mangling**: Renombrado inteligente de variables
- **Dead code elimination**: Eliminación de código no utilizado
- **Modern JavaScript**: Preservación de sintaxis ES2020+

### Sistema de Observación de Archivos

- **Chokidar**: Observación eficiente de cambios en archivos
- **Debounced compilation**: Evita recompilaciones excesivas
- **Dependency tracking**: Seguimiento de dependencias entre archivos
- **Hot Module Replacement**: Actualizaciones sin perder estado

### Cache Multinivel

- **Configuration cache**: Cache de tsconfig.json y configuraciones
- **Compilation cache**: Resultados de compilación por archivo
- **TypeScript cache**: Cache del Language Service Host
- **File system cache**: Cache de lecturas de archivos

### Dependencias Principales

- **Vue.js**: `vue/compiler-sfc` para compilación de SFC
- **TypeScript**: Compiler API completa con Language Service Host
- **OxcMinify**: Minificación ultra-optimizada
- **OxLint**: Linting ultra-rápido en Rust
- **ESLint**: Análisis profundo de código
- **Chokidar**: Observación de archivos
- **BrowserSync**: Servidor de desarrollo con HMR
- **TailwindCSS**: Compilación de utilidades CSS

### Optimizaciones de Performance

- **Lazy loading**: Carga de módulos bajo demanda
- **Module manager**: Gestión inteligente de dependencias pesadas
- **Compilation batching**: Agrupación de compilaciones
- **Progressive compilation**: Compilación incremental
- **Memory management**: Gestión optimizada de memoria en workers

---

<div align="center">

**¿Te gusta VersaCompiler? ¡Dale una ⭐ en GitHub!**

[🐛 Reportar Bug](https://github.com/kriollo/versaCompiler/issues) • [✨ Feature Request](https://github.com/kriollo/versaCompiler/issues) • [💬 Discusiones](https://github.com/kriollo/versaCompiler/discussions)

</div>
