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

### Requisitos

- **Node.js 22.22 o superior**
- **pnpm**
- **TypeScript 6** (TypeScript 7 no es compatible)

### Instalación en tu proyecto

```bash
pnpm add -D versacompiler
```

Después añade los scripts a tu `package.json`:

```json
{
    "scripts": {
        "dev": "versacompiler --watch",
        "build": "versacompiler --all --prod"
    }
}
```

### Instalación desde Código Fuente

```bash
# Clonar repositorio
git clone https://github.com/kriollo/versaCompiler.git
cd versaCompiler

# Instalar dependencias
pnpm install

# Compilar
pnpm build
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
versacompiler --linter
# → Ejecuta ESLint + OxLint
# → No compila archivos
# → Perfecto para CI/CD
# 🛡️ Build con validación de integridad
versacompiler --all --prod --checkIntegrity
# → Compila para producción
# → Valida integridad de código (4 niveles)
# → Detecta código corrupto antes de deploy
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
# 🔍 Ejecutar linting
versacompiler --linter
# → Ejecuta los linters configurados en versacompile.config.ts (propiedad "linter")
# → Si quieres ejecutar solo ESLint u OxLint, deja únicamente ese linter en la configuración.

# 🔧 Linting sin prompts interactivos
versacompiler --linter --yes
# → Auto-confirma acciones que requieran confirmación (según configuración)
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
# → Ver todas las opciones CLI disponibles

# 📦 Información de archivos procesados
versacompiler src/components/ --verbose
# → Procesa directorio específico con logs detallados
```

## ⚙️ Configuración Básica

### Configuración Básica

Usa el helper `defineConfig` para obtener autocompletado TypeScript:

```typescript
// versacompile.config.ts
import { defineConfig } from 'versacompiler/config';

export default defineConfig({
    root: './src',
    build: {
        outDir: './dist',
    },
    resolve: {
        alias: {
            '@': 'src',
        },
    },
    tsconfig: './tsconfig.json',
    server: {
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
    tailwindConfig: {
        bin: './node_modules/.bin/tailwindcss',
        input: './src/css/input.css',
        output: './public/css/output.css',
    },
});
```

### Configuraciones Comunes

#### Para proyectos con API backend:

```typescript
import { defineConfig } from 'versacompiler/config';
export default defineConfig({
    root: './src',
    build: { outDir: './dist' },
    resolve: { alias: { '@': 'src' } },
    server: {
        proxyUrl: 'http://localhost:8080', // Tu servidor backend
        assetsOmit: true,
    },
});
```

#### Para equipos grandes (linting estricto):

```typescript
import { defineConfig } from 'versacompiler/config';
export default defineConfig({
    root: './src',
    build: { outDir: './dist' },
    resolve: { alias: { '@': 'src' } },
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './eslint.config.js',
            fix: true,
            paths: ['src/'],
        },
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: true,
            paths: ['src/'],
        },
    ],
});
```

#### Para desarrollo rápido (menos verificaciones):

```typescript
import { defineConfig } from 'versacompiler/config';
export default defineConfig({
    root: './src',
    build: { outDir: './dist' },
    resolve: { alias: { '@': 'src' } },
    linter: [
        {
            name: 'oxlint', // Solo OxLint (más rápido)
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: false,
            paths: ['src/'],
        },
    ],
});
```

#### Para proyectos con TypeScript estricto:

```typescript
import { defineConfig } from 'versacompiler/config';
export default defineConfig({
    root: './src',
    build: { outDir: './dist' },
    resolve: {
        alias: {
            '@': 'src',
            '@components': 'src/components',
            '@utils': 'src/utils',
        },
    },
    tsconfig: './tsconfig.json',
    typeCheckOptions: {
        maxWorkers: 2, // workers para verificación de tipos
    },
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

- ✅ **Componentes Vue 3.5** - Actualización instantánea preservando estado
- ✅ **TypeScript/JavaScript** - Recarga inteligente de módulos con workers
- ✅ **CSS/TailwindCSS** - Inyección de estilos sin recarga
- ✅ **Assets** - Actualización automática de recursos
- ✅ **SCSS/Sass, Less, Stylus** - Requieren instalar el preprocesador (`pnpm add -D sass`)

### Funcionalidades avanzadas de HMR:

- 🔄 **Cache inteligente** - Solo recompila archivos modificados
- ⚡ **Validación en paralelo** - TypeScript workers independientes
- 🎨 **Hot reload de estilos** - TailwindCSS y CSS de componentes Vue
- 🚨 **Overlay de errores** - Los errores de compilación se muestran en el navegador y desaparecen al corregir el archivo
- 🧩 **Preservación de estado** - Vue Composition API y Options API
- 🛡️ **`hmr: false`** - Deshabilita el shim HMR globalmente (para Node.js/librerías)
- 🎯 **`hmrExclude`** - Excluye archivos específicos del shim HMR

### Excluir archivos del shim HMR:

Si un archivo compilado se carga con `<script src="...">` (sin `type="module"`), el shim HMR produce:

```
SyntaxError: Cannot use 'import.meta' outside a module
```

Solución: añade ese archivo a `hmrExclude`:

```typescript
import { defineConfig } from 'versacompiler/config';
export default defineConfig({
    root: './src',
    build: { outDir: './dist' },
    resolve: { alias: { '@': 'src' } },
    server: { proxyUrl: '', assetsOmit: true },
    hmrExclude: ['early-init.js', '*.legacy.js'],
});
```

Para deshabilitar HMR completamente en todos los archivos:

```typescript
import { defineConfig } from 'versacompiler/config';
export default defineConfig({
    root: './src',
    build: { outDir: './dist' },
    resolve: { alias: { '@': 'src' } },
    hmr: false,
});
```

### Si HMR no funciona:

```typescript
// Verificar configuración en versacompile.config.ts
import { defineConfig } from 'versacompiler/config';
export default defineConfig({
    root: './src',
    build: { outDir: './dist' },
    resolve: { alias: { '@': 'src' } },
    server: {
        proxyUrl: '', // Vacío si no usas proxy
        assetsOmit: true,
    },
});
```

### Debug de HMR:

```bash
# Ejecutar con logs detallados
versacompiler --watch --verbose
# → Muestra información de archivos recargados
# → Estado de TypeScript workers
# → Performance de HMR
```

## 📥 Imports de JSON, CSS y assets

Desde JS, TS o Vue puedes importar estos tipos de archivo:

```typescript
import data from './data.json'; // export default: el objeto JSON
import './style.css'; // inyecta <link rel="stylesheet"> una sola vez
import logo from './logo.png'; // export default: URL del archivo

console.log(data, logo);
```

- Extensiones soportadas: `json`, `css`, `png`, `jpg`, `jpeg`, `gif`, `svg`, `webp`, `avif`, `ico`, `bmp`, `woff`, `woff2`, `ttf`, `otf`, `eot`, `mp4`, `webm`, `ogg`, `mp3`, `wav`, `pdf`, `txt`.
- Solo se copian a `outDir` los archivos que algún módulo importa (un `src/credenciales.json` sin importar no se publica), y junto a cada uno se genera un módulo `<archivo>.js`.
- Los imports con atributos de importación (`with { type: 'json' }` o `type: 'css'`) se dejan nativos y no se reescriben.
- El CSS de entrada de TailwindCSS se omite.

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
- ✅ **Dead code** eliminado por el minificador
- ✅ **Salida autocontenida** - Las dependencias de `node_modules` importadas por URL se copian a `<outDir>/vendor/` (desactivable con `vendor: false`)
- ✅ **`import.meta.env`** - Las variables `DEV` y `PROD` se reemplazan en compilación
- ✅ **Vue 3.5** - Compilación de SFC con el compilador oficial
- ✅ **TypeScript decorators** - Según tu `tsconfig.json`

> **Nota:** VersaCompiler compila archivo a archivo: no hace bundling ni tree shaking. Los source maps no se generan en `--prod`.

### Builds Específicos

```bash
# Solo compilar archivos específicos para producción
versacompiler --file src/main.ts --prod

# Build con TailwindCSS optimizado
versacompiler --all --tailwind --prod

# Build con validación estricta (tipos + linting)
versacompiler --all --typeCheck --linter --prod
```

## 📚 Próximos Pasos

### Documentación Avanzada

- 📖 [Configuración Avanzada](./configuration.md)
- 🎯 [Ejemplos y Recetas](./examples.md)
- 🔧 [API Reference](./api.md)

### Funcionalidades Avanzadas a Explorar

- 🎨 **TailwindCSS** integrado con hot reload
- 🔍 **Linting dual** (ESLint + OxLint) con auto-fix
- 🏗️ **Compilación paralela** con TypeScript workers
- 📊 **Métricas de performance** en tiempo real
- 🔄 **Cache inteligente** para builds incrementales
- 🎭 **Vue 3.5 completo** - Composition API, script setup, TypeScript
- 🎯 **TypeScript decorators** - Soporte experimental completo
- 📦 **SCSS/Sass, Less, Stylus** - Preprocesadores (instalación manual)
- 🔌 **Plugins** - Hooks propios para resolver, cargar y transformar archivos
- 🔐 **Variables de entorno** - `.env` y `import.meta.env`
- ⚡ **HMR** - Preservación de estado y recarga selectiva

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
3. **Linting lento** → Deja solo OxLint en el array `linter`: `{ name: 'oxlint', bin: './node_modules/.bin/oxlint', configFile: './.oxlintrc.json', paths: ['src/'] }`
4. **TypeScript lento** → Limita los workers con `typeCheckOptions: { maxWorkers: 2 }`
5. **Cache corrupto** → `versacompiler --cleanCache`
6. **Tailwind no compila** → Verificar configuración `tailwindConfig`

### Recursos Útiles

- 📖 **README principal**: [../README.md](../README.md)
- 🎯 **Ejemplos prácticos**: [./examples.md](./examples.md)
- 🔧 **Solución de problemas**: [../README.md#troubleshooting](../README.md#troubleshooting)

¡Esperamos que disfrutes desarrollando con VersaCompiler! 🚀
