# 🚀 VersaCompiler

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-35495E?style=flat&logo=vuedotjs&logoColor=4FC08D)](https://vuejs.org/)

> **🎯 Compilador rápido y eficiente para Vue.js, TypeScript y JavaScript con Hot Module Replacement (HMR) integrado.**

**VersaCompiler** es una herramienta de compilación diseñada para proyectos Vue 3 con soporte completo para TypeScript, JavaScript y todas las funcionalidades modernas que necesitas para desarrollo web.

## 🌟 Características Principales

- ⚡ **Compilación rápida** - Compilación paralela optimizada para velocidad
- 🔥 **Hot Module Replacement (HMR)** - Actualizaciones instantáneas durante desarrollo
- 🧩 **Soporte completo para Vue 3** - Single File Components (SFC)
- 📝 **TypeScript nativo** - Transpilación integrada sin configuración adicional
- 🔍 **Linting dual** - ESLint + OxLint para máxima cobertura
- 🎨 **TailwindCSS integrado** - Compilación automática de estilos
- 🗜️ **Minificación avanzada** - OxcMinify para builds optimizados
- 📦 **Bundling inteligente** - Agrupación de módulos configurable

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
# 🔥 Desarrollo con auto-reload
versacompiler --watch

# 🏗️ Compilar todo el proyecto
versacompiler --all

# 🚀 Build para producción
versacompiler --all --prod

# 🔍 Solo verificar código (linting)
versacompiler --lint-only

# 🧹 Limpiar y recompilar
versacompiler --clean --all
```

## 📖 Configuración

### 🛠️ Comandos CLI Disponibles

| Comando       | Alias | Descripción                      |
| ------------- | ----- | -------------------------------- |
| `--watch`     | `-w`  | Modo observación con HMR         |
| `--all`       |       | Compilar todos los archivos      |
| `--prod`      | `-p`  | Modo producción con minificación |
| `--clean`     |       | Limpiar directorio de salida     |
| `--lint-only` |       | Solo ejecutar linting            |
| `--verbose`   | `-v`  | Salida detallada                 |
| `--init`      |       | Inicializar configuración        |
| `--help`      | `-h`  | Mostrar ayuda                    |

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

Array de configuraciones de linters:

- `name`: Nombre del linter (`'eslint'` o `'oxlint'`)
- `bin`: Ruta al binario del linter
- `configFile`: Archivo de configuración del linter
- `fix`: Auto-fix de errores
- `paths`: Rutas a analizar

#### `bundlers`

Array de configuraciones de bundling:

- `name`: Nombre del bundle
- `fileInput`: Archivo de entrada
- `fileOutput`: Archivo de salida

## 🎯 Ejemplos de Uso

### Desarrollo Local

```bash
# Iniciar servidor de desarrollo
versacompiler --watch

# Con verbose para debugging
versacompiler --watch --verbose

# Solo linting durante desarrollo
versacompiler --lint-only
```

### Compilación para Producción

```bash
# Build completo para producción
versacompiler --all --prod --clean

# Con análisis detallado
versacompiler --all --prod --verbose
```

### Integración CI/CD

```bash
# Pipeline de CI
versacompiler --lint-only        # Verificar código
versacompiler --all --prod      # Build para producción
```

## 🏗️ Funcionalidades

### 🔥 Hot Module Replacement (HMR)

- **Componentes Vue**: Actualizaciones instantáneas preservando estado
- **TypeScript/JavaScript**: Recarga inteligente de módulos
- **CSS/TailwindCSS**: Inyección de estilos sin recarga

### 🚀 Compilación Paralela

- **Pool de workers optimizado** basado en CPU cores
- **Cache inteligente** evita recompilaciones innecesarias
- **Progress bar visual** con métricas en tiempo real

### 🔍 Sistema de Linting Dual

- **ESLint**: Análisis de código JavaScript/TypeScript
- **OxLint**: Linter ultra-rápido escrito en Rust
- **Auto-fix**: Corrección automática de problemas

### 📦 Minificación Optimizada

- **OxcMinify**: Minificador de última generación
- **Tree shaking**: Eliminación de código no utilizado
- **Compresión avanzada**: Optimización de tamaño

## 🚧 Troubleshooting

### ❌ Problemas Frecuentes

#### 🔍 Error: "Cannot resolve module"

```bash
# Verificar configuración de aliases
versacompiler --verbose

# Limpiar cache si persiste
versacompiler --clean
```

#### 🔥 HMR no funciona

```typescript
// Verificar configuración en versacompile.config.ts
export default {
    proxyConfig: {
        proxyUrl: '', // Vacío si no usas proxy
        assetsOmit: true,
    },
};
```

#### 🐌 Linting muy lento

```bash
# Usar solo OxLint para máxima velocidad
versacompiler --lint-only --verbose
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

- **JavaScript**: Compila archivos `.js` y los coloca en el directorio configurado
- **TypeScript**: Transpila archivos `.ts` a `.js` utilizando las opciones definidas en `tsconfig.json`
- **Vue**: Procesa archivos `.vue`, compila sus scripts, plantillas y estilos

### Minificación

Si se ejecuta con el parámetro `--prod`, el código se minifica utilizando `OxcMinify`.

### Observación de Archivos

El compilador observa los cambios en los archivos `.js`, `.ts` y `.vue` en el directorio `src` y recompila automáticamente los archivos modificados.

### Dependencias Principales

- **VueJS**: API (vue/compiler-sfc) para compilar archivos .vue
- **TypeScript**: API (transpileModule) para transpilar TypeScript
- **OxcMinify**: API (minify) para minificar código
- **Acorn**: API (Parser) para validar sintaxis
- **BrowserSync**: API (browserSync) para servidor HMR

---

<div align="center">

**¿Te gusta VersaCompiler? ¡Dale una ⭐ en GitHub!**

[🐛 Reportar Bug](https://github.com/kriollo/versaCompiler/issues) • [✨ Feature Request](https://github.com/kriollo/versaCompiler/issues) • [💬 Discusiones](https://github.com/kriollo/versaCompiler/discussions)

</div>
