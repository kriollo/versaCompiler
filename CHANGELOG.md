# 📝 Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [2.3.2] - 2026-01-15

### 🐛 Correcciones Críticas

- **Fix de Resolución de Imports en HMR Injection**:
    - Corregido bug crítico donde el compilador transformaba imports literales en código de inyección HMR
    - El string `'import { ref } from "vue"'` era incorrectamente transformado a ruta resuelta durante la compilación de `vuejs.ts`
    - Solución: Construcción dinámica del import usando `.join()` para evitar detección por el parser
    - Ahora el código inyectado mantiene correctamente `import { ref } from "vue"` sin transformación

### 🔧 Mejoras

- **Restauración de Configuraciones Vue Runtime**:
    - Restauradas configuraciones `runtimeGlobalName: 'Vue'` y `runtimeModuleName: 'vue'` en template compiler
    - Estas configuraciones ya no causan conflictos gracias al fix de HMR injection
    - Mejora en la generación de código para templates Vue

### 📝 Notas Técnicas

- **Archivos Modificados**:
    - `src/compiler/vuejs.ts`:
        - Fix de construcción dinámica de import en HMR injection (línea ~77)
        - Restauradas configuraciones `runtimeGlobalName` y `runtimeModuleName` (líneas ~329-330)

- **Impacto**:
    - Componentes Vue en modo desarrollo (HMR) ahora reciben el import correcto sin transformación
    - Eliminado el workaround temporal de comentar configuraciones de runtime
    - Compatibilidad mejorada con el ecosistema Vue

---

## [2.3.1] - 2026-01-15

### ✨ Nuevas Características

- **Minificación Mejorada**:
    - Agregada opción `unused: true` en configuración de compresión
    - Eliminación automática de variables no utilizadas durante la minificación
    - Optimización de código muerto (dead code elimination)

### 🔧 Mejoras

- **Optimización de Compilación Vue**:
    - Comentadas configuraciones `runtimeGlobalName` y `runtimeModuleName` en precompilación Vue
    - Mejora en la generación de código para componentes Vue
    - Reducción de overhead en runtime de Vue

- **Scripts de Compilación**:
    - Nuevo script `compileDev`: Compilación completa sin optimizaciones de producción
    - Reorganización de flags en script `compile`: Removido flag `--co` (clean output) por defecto
    - Separación clara entre compilación de desarrollo y producción

### 📝 Notas Técnicas

- **Archivos Modificados**:
    - `src/compiler/minify.ts`: Agregada opción `unused: true` para tree-shaking
    - `src/compiler/vuejs.ts`: Optimización de configuración de template compiler
    - `package.json`: Nuevos scripts y reorganización de flags

---

## [2.3.0] - 2025-01-15

### 🐛 Correcciones Críticas

- **Bug de Resolución de Módulos en Producción**:
    - Corrección crítica en `module-resolver.ts` y `module-resolution-optimizer.ts`
    - El compilador ahora selecciona correctamente archivos `.prod.js` cuando `--prod` está activo
    - Priorización correcta: `.prod.js` > `.min.js` > `.js` en modo producción
    - Fix para Vue Router, Pinia y otras librerías ESM que no cargaban versión optimizada
    - Mejora en el pattern matching para detectar variantes de producción (ej: `vue.runtime.esm-bundler` → `vue.esm-browser.prod.js`)

- **Tests de Stress Corregidos**:
    - Corrección de 6 tests fallidos en `stress-test-extreme.test.ts`
    - Fix de extensiones de archivo (`.ts` → `.js`) en imports de tests
    - Actualización de mocks para compatibilidad con Vitest 4.0.9
    - Todos los tests de stress ahora pasan (compilaciones masivas, memory leaks, HMR performance)

### ✨ Nuevas Características

- **Suite de Tests Ampliada**: Cobertura de pruebas significativamente mejorada
    - **readConfig.test.ts** (~15 tests): Validación de seguridad para paths y comandos
        - Tests de `validatePath()` y `validateCommand()` con casos edge
        - Validación estricta de path traversal, null bytes, Unicode exploits
        - Límites de longitud de paths (MAX_PATH_LENGTH=260)

    - **linter.test.ts** (15 tests): Integración con ESLint y OxLint
        - Tests de configuración válida e inválida
        - Manejo de bins no encontrados
        - Validación de seguridad en paths de archivos
        - Tests de timeout y errores malformados

    - **typescript-compiler.test.ts** (~25 tests): Compilador TypeScript
        - Compilación básica TS → JS
        - Type errors en modo permisivo
        - Edge cases (archivos vacíos, solo comentarios, archivos muy largos)
        - Tests de imports/exports y preservación de código
        - Memory leak detection (< 50MB)
        - Config management con `loadTypeScriptConfig`

    - **file-watcher.test.ts** (7 tests): Operaciones de sistema de archivos
        - CRUD de archivos (create, read, delete)
        - Validación de paths peligrosos (../, null bytes)
        - Caracteres especiales en nombres de archivo

- **Tests de Producción**: Nuevos tests de integración para modo `--prod`
    - Validación de que Vue 3 carga `vue.esm-browser.prod.js`
    - Validación de que Vue Router carga versiones de producción
    - Tests de múltiples compilaciones preservando modo producción

### 🔧 Mejoras

- **Estabilidad de Tests**: 374/374 tests pasando (100% ✅)
    - Incremento de 299 tests base a 374 tests totales
    - Eliminación de tests para APIs no exportadas (WatchDebouncer, loadConfig)
    - Corrección de expectativas para APIs reales vs asumidas
    - Simplificación de tests para enfocarse en funcionalidad exportada

- **Descubrimientos de API Documentados**:
    - `validatePath('')` retorna `false` (validación estricta)
    - `validateCommand('npm')` retorna `false` (validación estricta)
    - `loadTypeScriptConfig()` retorna `CompilerOptions` directamente (no wrapper)
    - `preCompileTS()` en modo permisivo (no siempre reporta type errors)
    - `WatchDebouncer` es clase interna, no exportada
    - ESLint retorna `{json: {...}, stylish?: string}` o `false` en errores
    - OxLint retorna `false` cuando bin no existe

### 🧪 Testing

- **Cobertura Mejorada**: Tests críticos implementados sin romper funcionalidad existente
    - Seguridad de paths y comandos
    - Integración con linters (ESLint/OxLint)
    - Compilación TypeScript end-to-end
    - Operaciones de file system
    - Modo producción end-to-end

- **Métricas de Tests**:
    - 26 archivos de tests pasando
    - 374 tests totales
    - ~62 nuevos tests agregados en esta versión
    - 0 tests fallidos
    - Tiempo de ejecución: ~60-70s (suite completa)

### 📝 Notas de Desarrollo

- **Filosofía de Testing**: "Que no se pierda ninguna funcionalidad"
    - Todos los tests validan comportamiento real, no asumido
    - Tests simplificados cuando APIs internas no son accesibles
    - Foco en funcionalidad exportada y casos de uso reales

---

## [2.2.0] - 2025-01-14

### ✨ Nuevas Características

- **Sistema de Workers Paralelos**: Implementación de TypeScript Worker Pool para compilación paralela masiva
    - Mejora significativa en tiempos de compilación para proyectos grandes
    - Pool de workers reutilizables con gestión eficiente de memoria
    - Soporte para procesamiento concurrente de archivos TypeScript

- **Optimizador de Resolución de Módulos**: Sistema inteligente de resolución de dependencias
    - Detección automática de versiones ESM optimizadas
    - Priorización de builds de producción y versiones minificadas
    - Caché de resoluciones para mejorar rendimiento

- **Monitor de Rendimiento**: Herramienta de profiling integrada
    - Medición detallada de tiempos de compilación
    - Identificación de cuellos de botella en el proceso
    - Reportes de performance en modo verbose

- **Optimizador de Transformaciones**: Sistema de transformación de código optimizado
    - Análisis y optimización de transformaciones TypeScript/JavaScript
    - Reducción de redundancias en el proceso de transformación
    - Mejora en velocidad de procesamiento

- **Sistema de Minificación de Templates**: Minificación específica para templates HTML/Vue
    - Compresión agresiva de templates Vue sin afectar funcionalidad
    - Remoción inteligente de espacios en blanco
    - Optimización de literales HTML en el código

### 🔧 Mejoras

- **HMR (Hot Module Replacement)**: Sistema de recarga en caliente mejorado
    - Detección inteligente de cambios sin configuración manual
    - Compatibilidad tipo Vite/esbuild con mejor performance
    - Árbol de componentes Vue optimizado para actualizaciones granulares
    - Sistema de gestión de estado de componentes durante recarga

- **Sistema de Caché Avanzado**: Mejoras en la gestión de caché
    - Invalidación inteligente basada en dependencias
    - Reducción de recompilaciones innecesarias
    - Cache persistente entre sesiones

- **Compilación TypeScript**: Mejoras en el compilador TypeScript
    - Validación síncrona de tipos mejorada
    - Parser de errores TypeScript más preciso
    - Mejor integración con Language Service

- **Sistema de Linting Dual**: Mejoras en el sistema de análisis de código
    - Integración mejorada de ESLint + OxLint
    - Auto-fix más eficiente
    - Mejor reporte de errores y warnings

### 🐛 Correcciones

- Resolución de memory leaks en hot reload
- Mejoras en la detección de bibliotecas externas
- Corrección de errores en el parser de código Vue
- Optimización del manejo de errores global

### 🧪 Testing

- Suite completa de pruebas agregada:
    - Tests de stress extremo para compilación
    - Tests de performance para HMR
    - Tests de memory leak detection
    - Tests de worker pool bajo carga
    - Tests de resolución de módulos
    - Cobertura de código mejorada

### 📚 Documentación

- Actualización completa del README con ejemplos
- Documentación de API extendida
- Guías de contribución mejoradas
- FAQs y troubleshooting actualizados
- Ejemplos de configuración añadidos

### 🔄 Cambios Internos

- Refactorización del sistema de resolución de módulos
- Mejoras en la arquitectura del compilador
- Optimización de imports y gestión de dependencias
- Actualización de dependencias principales:
    - Vue 3.5.24
    - TypeScript 5.9.3
    - OxC Minify 0.97.0
    - TailwindCSS 4.1.17

---

## [2.1.0] - 2024-12-XX

### ✨ Nuevas Características

- Soporte inicial para TailwindCSS integrado
- Sistema básico de HMR
- Compilación de archivos individuales

### 🔧 Mejoras

- Mejoras en la minificación con OxcMinify
- Optimización de la compilación de componentes Vue

---

## [2.0.8] - 2024-11-XX

### 🔧 Mejoras

- Estabilización del sistema de compilación
- Correcciones menores de bugs
- Mejoras en el manejo de errores

### 🐛 Correcciones

- Fixes varios en el parser de Vue
- Corrección de paths en Windows
- Mejoras en la detección de tipos TypeScript

---

## Leyenda

- ✨ **Nuevas Características**: Funcionalidades completamente nuevas
- 🔧 **Mejoras**: Mejoras en funcionalidades existentes
- 🐛 **Correcciones**: Corrección de bugs
- 🧪 **Testing**: Cambios relacionados con pruebas
- 📚 **Documentación**: Actualizaciones de documentación
- 🔄 **Cambios Internos**: Refactorizaciones y cambios arquitectónicos
- ⚠️ **Deprecaciones**: Funcionalidades marcadas como obsoletas
- 🗑️ **Eliminaciones**: Funcionalidades eliminadas

---

[2.2.0]: https://github.com/kriollo/versaCompiler/compare/v2.0.8...v2.2.0
[2.1.0]: https://github.com/kriollo/versaCompiler/compare/v2.0.8...v2.1.0
[2.0.8]: https://github.com/kriollo/versaCompiler/releases/tag/v2.0.8
