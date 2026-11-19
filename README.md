# 🚀 VersaCompiler

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-35495E?style=flat&logo=vuedotjs&logoColor=4FC08D)](https://vuejs.org/)
[![Version](https://img.shields.io/badge/version-3.0.3-blue.svg)](https://github.com/kriollo/versaCompiler/releases/tag/v3.0.3)
[![Node](https://img.shields.io/badge/node-%3E%3D22.22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

> **🎯 Compilador rápido para Vue 3, TypeScript y JavaScript con Hot Module Replacement (HMR).**

**VersaCompiler** compila tus proyectos Vue 3, TypeScript y JavaScript archivo a archivo, con HMR en desarrollo, linting, TailwindCSS y un build de producción minificado.

## 🌟 Características

- ⚡ **Compilación rápida** - Workers TypeScript en paralelo y caché
- 🔥 **HMR en `--watch`** - Actualizaciones sin recargar la página y overlay de errores en el navegador
- 🧩 **Vue 3** - SFC, Composition API, `<script setup>`, SCSS/Sass, Less y Stylus
- 📝 **TypeScript** - Language Service, verificación de tipos y decorators según tu `tsconfig.json`
- 📦 **Imports de assets** - JSON, CSS, imágenes y fuentes se importan directamente desde JS/TS/Vue
- 🔐 **Variables de entorno** - `import.meta.env` con archivos `.env` y prefijo `VERSA_`
- 🔌 **Plugins** - Hooks `onResolve`, `onLoad`, `onTransform`, `onHotUpdate` y `onEnd`
- 🧰 **API programática** - `build()` y `compile()` para usar desde tus scripts
- 🔍 **Linting dual** - ESLint y OxLint
- 🎨 **TailwindCSS** integrado
- 🗜️ **Minificación** con OxcMinify y **salida autocontenida** en `--prod` (sin desplegar `node_modules`)
- 🛡️ **Validación de integridad** - Detecta código corrupto antes de desplegar
- 🤖 **Apto para CI** - `--all` devuelve código de salida `1` si algún archivo falla

## ⚡ Instalación

### ✅ Requisitos

- **Node.js 22.22 o superior**
- **pnpm** como gestor de paquetes
- **TypeScript 6** (TypeScript 7 no es compatible: aún no expone la API del LanguageService en JS)

### 📦 En tu proyecto

```bash
pnpm add -D versacompiler
```

### 🛠️ Desde código fuente

```bash
git clone https://github.com/kriollo/versaCompiler.git
cd versaCompiler
pnpm install
pnpm build
```

## 🎯 Quick Start

```bash
# 1. Crear el archivo de configuración
pnpm exec versacompiler --init

# 2. Desarrollo con HMR
pnpm exec versacompiler --watch
```

Añade los comandos a tu `package.json` para usarlos con pnpm:

```json
{
    "scripts": {
        "dev": "versacompiler --watch",
        "build": "versacompiler --all --prod --checkIntegrity"
    }
}
```

```bash
pnpm dev
pnpm build
```

### Comandos principales

| Comando                    | Descripción                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `--watch` / `-w`           | Modo desarrollo con HMR y auto-recompilación                                           |
| `--all`                    | Compila todo el proyecto                                                               |
| `--file <archivo>` / `-f`  | Compila un archivo específico                                                          |
| `--prod` / `-p`            | Build de producción (minificado, salida autocontenida)                                 |
| `--checkIntegrity` / `-ci` | Valida el código generado (recomendado para deploy)                                    |
| `--mode <nombre>`          | Modo para `.env.<nombre>` (por defecto `production` con `--prod`, si no `development`) |
| `--silent`                 | Solo advertencias y errores                                                            |
| `--config <ruta>`          | Usa otro archivo de configuración                                                      |
| `--linter`                 | Ejecuta los linters configurados                                                       |
| `--typeCheck` / `-t`       | Verificación de tipos TypeScript                                                       |
| `--help` / `-h`            | Muestra todas las opciones                                                             |

La lista completa de opciones está en [docs/configuration.md](./docs/configuration.md#-comandos-cli).

## 📖 Configuración

Crea `versacompile.config.ts` en la raíz de tu proyecto:

```typescript
import { defineConfig } from 'versacompiler/config';

export default defineConfig({
    root: './src',
    build: {
        outDir: './dist',
    },
    resolve: {
        alias: { '@': 'src' },
    },
    tsconfig: './tsconfig.json',
    define: {
        __APP_VERSION__: JSON.stringify('1.2.0'),
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
});
```

Todas las opciones (servidor, TailwindCSS, linters, plugins, `hmr`, `vendor`...) están documentadas en [docs/configuration.md](./docs/configuration.md).

## 🧰 API programática

```typescript
import { build, compile, defineConfig } from 'versacompiler';

// true = sin errores
const ok = await build({ prod: true, checkIntegrity: true });

// Compila un único archivo
const { success, output } = await compile('src/components/App.vue', {
    prod: false,
});
```

Detalles y limitaciones en [docs/api.md](./docs/api.md).

## 📚 Documentación

- 📖 [**Guía de Inicio Rápido**](./docs/getting-started.md)
- 📋 [**Configuración**](./docs/configuration.md) - Opciones, `.env`, plugins y CLI
- 🎯 [**Ejemplos y Recetas**](./docs/examples.md)
- 🔧 [**API Reference**](./docs/api.md)
- 🤝 [**Guía de Contribución**](./docs/contributing.md)
- ❓ [**FAQ - Preguntas Frecuentes**](./docs/faq.md)

## 🚧 Troubleshooting

- **HMR no conecta o no actualiza**: revisa `server.proxyUrl` (vacío si no usas proxy) y ejecuta `pnpm exec versacompiler --watch --cleanCache`.
- **`Cannot use 'import.meta' outside a module`**: el archivo se carga con `<script>` sin `type="module"`. Añádelo a `hmrExclude`, o usa `hmr: false` si ningún archivo necesita HMR.
- **`<style lang="scss">` no compila**: instala el preprocesador con `pnpm add -D sass` (o `less` / `stylus`). VersaCompiler no los incluye.
- **Compilación lenta**: usa `--cleanCache` solo cuando sea necesario y limita los workers con `typeCheckOptions.maxWorkers`.

Más casos en [docs/faq.md](./docs/faq.md).

## 🧪 Testing

```bash
# Ejecutar tests
pnpm test

# Tests con coverage
pnpm test:coverage

# Tests en modo watch
pnpm test:watch
```

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Ver [docs/contributing.md](./docs/contributing.md) para detalles.

```bash
git clone https://github.com/kriollo/versaCompiler.git
cd versaCompiler
pnpm install
pnpm dev
```

## 📄 Licencia

MIT © [Jorge Jara H](https://github.com/kriollo)

## 🙏 Agradecimientos

- **Vue.js Team** - Por el increíble framework
- **TypeScript Team** - Por el excelente sistema de tipos
- **Oxc Project** - Por las herramientas de desarrollo ultra-rápidas
- **Comunidad Open Source** - Por el feedback y contribuciones

---

<div align="center">

**¿Te gusta VersaCompiler? ¡Dale una ⭐ en GitHub!**

[🐛 Reportar Bug](https://github.com/kriollo/versaCompiler/issues) • [✨ Feature Request](https://github.com/kriollo/versaCompiler/issues) • [💬 Discusiones](https://github.com/kriollo/versaCompiler/discussions)

</div>
