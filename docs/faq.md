# ❓ Preguntas Frecuentes (FAQ)

## 📋 Tabla de Contenidos

1. [General](#-general)
2. [Instalación y Configuración](#-instalación-y-configuración)
3. [Desarrollo](#-desarrollo)
4. [TypeScript y Vue](#-typescript-y-vue)
5. [Linting](#-linting)
6. [Producción](#-producción-y-deployment)
7. [Troubleshooting](#-troubleshooting)

## 🌟 General

### ¿Qué es VersaCompiler?

VersaCompiler es una herramienta avanzada de compilación para proyectos Vue.js con TypeScript. Combina compilación de Vue SFC, TypeScript con workers, sistema de linting dual (ESLint + OxLint), minificación ultra-rápida y Hot Module Replacement.

### ¿Es VersaCompiler estable para producción?

**VersaCompiler está en desarrollo activo** pero es funcional para proyectos de producción pequeños a medianos. Incluye:

- ✅ **Compilación robusta** con manejo de errores avanzado
- ✅ **Workers TypeScript** para validación de tipos eficiente
- ✅ **Sistema de cache** multinivel para performance
- ✅ **Minificación de producción** con OxcMinify
- ⚠️ **Para proyectos críticos** considera Vite/Webpack como alternativa madura

### ¿Qué tipo de proyectos soporta?

- ✅ **Vue 3.5** Single File Components con todas las características
- ✅ **TypeScript avanzado** con decorators, Language Service, workers
- ✅ **JavaScript moderno** ES2020+ con minificación inteligente
- ✅ **TailwindCSS** compilación optimizada con purging
- ✅ **SCSS/Sass, Less, Stylus** (debes instalar el preprocesador: `pnpm add -D sass`)
- ✅ **Linting dual** ESLint + OxLint con múltiples formatos
- ✅ **Proyectos enterprise** con configuraciones avanzadas

### ¿Es VersaCompiler gratuito?

Sí, es **100% gratuito y open source** bajo licencia MIT.

## 🔧 Instalación y Configuración

### ¿Cómo instalo VersaCompiler?

En tu proyecto:

```bash
pnpm add -D versacompiler
```

Desde código fuente:

```bash
git clone https://github.com/kriollo/versaCompiler.git
cd versaCompiler
pnpm install
pnpm build
```

### ¿Necesito Node.js específico?

**Requisitos:**

- Node.js >= 22.22
- pnpm
- TypeScript 6 (TypeScript 7 no es compatible: no expone la API del LanguageService en JS)

### ¿Dónde va el archivo de configuración?

Crea `versacompile.config.ts` en la raíz de tu proyecto. Usa `defineConfig` para autocompletado TypeScript:

```typescript
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
});
```

### ¿Puedo usar con proyectos existentes?

Sí, pero debes configurar manualmente el archivo `versacompile.config.ts` según tu estructura de proyecto.

## 🔥 Desarrollo

### ¿Cómo inicio el modo desarrollo?

```bash
# Desarrollo básico con HMR
versacompiler --watch

# Desarrollo con información detallada
versacompiler --watch --verbose

# Desarrollo con verificación de tipos
versacompiler --watch --typeCheck
```

### ¿Hay HMR (Hot Module Replacement)?

**Sí**, VersaCompiler incluye HMR completo similar a Vite:

- ✅ **Componentes Vue** con preservación de estado
- ✅ **TypeScript/JavaScript** con actualizaciones instantáneas
- ✅ **CSS/TailwindCSS** con inyección en tiempo real
- ✅ **Propagación en cascada** — si una librería JS cambia, sus consumidores se actualizan sin recargar página

```bash
# HMR automático en modo watch
versacompiler --watch
```

### ¿Puedo deshabilitar el shim HMR en archivos específicos?

Sí. Usa `hmrExclude` en tu config para excluir archivos puntuales sin afectar al resto:

```typescript
import { defineConfig } from 'versacompiler/config';
export default defineConfig({
    root: './src',
    build: { outDir: './dist' },
    resolve: { alias: { '@': 'src' } },
    hmrExclude: [
        'early-init.js', // nombre exacto
        '*.legacy.js', // glob simple
    ],
});
```

Esto es útil cuando un archivo se carga con `<script src="...">` (sin `type="module"`) y el shim produce `SyntaxError: Cannot use 'import.meta' outside a module`.

Para deshabilitar HMR **globalmente** (ej. librería Node.js sin browser):

```typescript
export default defineConfig({
    root: './src',
    build: { outDir: './dist' },
    resolve: { alias: { '@': 'src' } },
    hmr: false,
});
```

### ¿Qué es la validación de integridad? (v2.4.0+)

Es un sistema de 4 niveles que detecta código corrupto durante compilación:

**Check 1 (Size)**: Detecta código vacío (~0.1ms)

```typescript
// ❌ Detecta esto
const result = minify(code);
// → resultado: "" (vacío)
```

**Check 2 (Structure)**: Verifica brackets balanceados (~1ms) ⚠️ _Suspendido temporalmente_

```typescript
// ❌ Detectaría esto (cuando esté activo)
const arr = [1, 2, 3; // falta ]
```

**Check 3 (Exports)**: Detecta exports eliminados (~1ms)

```typescript
// ❌ Detecta esto
// Original: export const API_KEY = "..."
// Procesado: const API_KEY = "..." (export eliminado)
```

**Check 4 (Syntax)**: Validación con oxc-parser (~3ms)

```typescript
// ❌ Detecta esto
const obj = { key: value  // falta }
```

**Uso:**

```bash
# Validación automática en desarrollo
versacompiler --watch

# Validación explícita para deploy
versacompiler --all --prod --checkIntegrity
```

**Resultados:**

- Performance: 1-3ms por archivo
- Cache hit: <0.1ms
- 40/40 archivos validados (100%)
- Protección contra corrupciones críticas

### ¿Por qué está suspendido el Check 2?

El Check 2 (validación de estructura) tiene problemas con **character classes en regex**:

```typescript
// Problema: brackets dentro de character classes
const regex = /[(abc)]/; // ❌ Detecta ( como bracket real
```

Afecta a 6 archivos avanzados del compilador. Los otros 3 checks (1, 3, 4) proporcionan protección suficiente hasta que se implemente detección de character classes.

VersaCompiler tiene **HMR avanzado** con:

- ✅ **Preservación de estado** en componentes Vue
- ✅ **Actualización instantánea** de estilos CSS/SCSS
- ✅ **Keys únicos** para identificación de componentes
- ✅ **BrowserSync integrado** para sincronización cross-device

### ¿Qué archivos observa?

- Archivos `.vue`, `.ts`, `.js` en el directorio `sourceRoot`
- Archivos CSS, SCSS cuando está habilitado TailwindCSS
- Archivos adicionales definidos en `aditionalWatch`
- Configuraciones de linting (.eslintrc, .oxlintrc)

### ¿Puedo compilar archivos específicos?

Sí, VersaCompiler permite compilación granular:

```bash
# Compilar archivo específico
versacompiler --file src/components/Button.vue

# Compilar múltiples archivos
versacompiler src/main.ts src/App.vue src/router.ts

# Solo verificar tipos en archivo específico
versacompiler --typeCheck --file src/types/api.ts
```

### ¿Puedo usar un proxy para API?

Sí, configura `server.proxyUrl` en tu archivo de configuración:

```typescript
import { defineConfig } from 'versacompiler/config';
export default defineConfig({
    root: './src',
    build: { outDir: './dist' },
    resolve: { alias: { '@': 'src' } },
    server: {
        proxyUrl: 'http://localhost:8080',
        assetsOmit: true,
    },
});
```

## 📝 TypeScript y Vue

### ¿Necesito configurar TypeScript?

VersaCompiler usa tu `tsconfig.json` existente y lo optimiza automáticamente. Para soporte completo incluyendo decorators:

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "strict": true,
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"]
        }
    }
}
```

### ¿Soporta Vue 3 completamente?

VersaCompiler soporta **Vue 3.5 completamente** incluyendo:

- ✅ **Script setup** con Composition API
- ✅ **Scoped styles** con scope IDs únicos
- ✅ **SCSS/Sass** preprocesadores
- ✅ **Custom blocks** en SFC
- ✅ **Slots avanzados** con fallbacks
- ✅ **defineProps, defineEmits** y todas las macros
- ✅ **Archivos virtuales** .vue.ts para validación de tipos

### ¿Funcionan los TypeScript workers?

Sí, VersaCompiler incluye un sistema avanzado de workers para TypeScript:

- ✅ **Validación de tipos** en threads separados
- ✅ **Fallback sincrónico** para entornos de testing
- ✅ **Cache inteligente** de validaciones
- ✅ **Language Service Host** optimizado
- ✅ **Filtrado de errores** específicos de decorators

Controla el número de workers con `typeCheckOptions.maxWorkers` en tu config:

```typescript
import { defineConfig } from 'versacompiler/config';
export default defineConfig({
    root: './src',
    build: { outDir: './dist' },
    resolve: { alias: { '@': 'src' } },
    typeCheckOptions: {
        maxWorkers: 2,
    },
});
```

### ¿Puedo usar decorators de TypeScript?

Sí. Los decorators siguen la configuración de tu `tsconfig.json`:

- Con `experimentalDecorators: true` se compilan (y `emitDecoratorMetadata` añade metadata).
- Con `target: "esnext"` y sin `experimentalDecorators`, TypeScript los emite tal cual (sintaxis nativa).

```typescript
// tsconfig.json
{
    "compilerOptions": {
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true
    }
}
```

### ¿Funcionan los path aliases?

Sí, configura los aliases en `resolve.alias` de tu config:

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
});
```

Asegúrate también de tenerlos en `tsconfig.json`:

```json
{
    "compilerOptions": {
        "paths": {
            "@/*": ["src/*"],
            "@components/*": ["src/components/*"],
            "@utils/*": ["src/utils/*"]
        }
    }
}
```

## 🔍 Linting

### ¿Qué linters soporta?

VersaCompiler incluye un sistema de linting dual de nueva generación:

- **ESLint** - Análisis profundo con múltiples formatos (json, stylish, compact)
- **OxLint** - Linter ultra-rápido en Rust con integración TypeScript

### ¿Cómo configuro linting avanzado?

```typescript
export default {
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './eslint.config.js',
            fix: true,
            paths: ['src/'],
            eslintConfig: {
                cache: true,
                maxWarnings: 0,
                formats: ['stylish', 'json'],
                quiet: false,
                deny: ['no-console', 'no-debugger'],
                allow: ['no-unused-vars'],
            },
        },
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: true,
            paths: ['src/'],
            oxlintConfig: {
                tsconfigPath: './tsconfig.json',
                quiet: true,
                rules: {
                    'no-unused-vars': 'error',
                },
            },
        },
    ],
};
```

### ¿Puedo usar solo linting sin compilar?

Sí, usa el comando específico:

```bash
# Solo linting
versacompiler --linter

# Linting con información detallada
versacompiler --linter --verbose

# Linting de rutas específicas
# → Se define vía versacompile.config.ts (propiedad "linter[].paths")
# → Luego ejecuta: versacompiler --linter
```

### ¿Qué formatos de salida soporta?

ESLint soporta múltiples formatos:

- `stylish` - Formato colorido para terminal (por defecto)
- `json` - Salida JSON para herramientas CI/CD
- `compact` - Formato compacto para revisión rápida

### ¿Funciona con TypeScript estricto?

Sí, el sistema de linting está optimizado para TypeScript estricto e incluye:

- Integración con `tsconfig.json`
- Filtrado automático de errores de decorators
- Validación de tipos en archivos Vue (.vue.ts virtuales)

## 🚀 Producción y Deployment

### ¿Cómo compilo para producción?

```bash
# Build estándar
versacompiler --all --prod

# Build con limpieza previa
versacompiler --all --prod --cleanOutput --cleanCache

# Build con validación de integridad (recomendado)
versacompiler --all --prod --checkIntegrity

# Build silencioso para CI/CD
versacompiler --all --prod --checkIntegrity --yes
```

Esto compila todos los archivos, minifica el código usando OxcMinify y opcionalmente valida la integridad del código compilado.

### ¿Qué optimizaciones incluye?

- **Minificación avanzada** con OxcMinify (Rust)
- **Variable mangling** renombrado de variables
- **Dead code elimination** eliminación de código muerto por el minificador
- **Salida autocontenida**: los imports de `/node_modules/` se reescriben a `<outDir>/vendor/` y los archivos se copian ahí, así no hace falta desplegar `node_modules` (desactivable con `vendor: false`)
- **Compilación de TailwindCSS**
- **Transpilación de TypeScript** a JavaScript moderno
- **Validación de integridad** (opcional con `--checkIntegrity`)

Lo que **no** hace: tree shaking ni bundling. Compila archivo a archivo.

### ¿Genera source maps?

Solo en desarrollo, y de forma limitada:

- Inline source maps para archivos `.ts`.
- Solo si tu `tsconfig.json` tiene `sourceMap` o `inlineSourceMap`.
- No se generan para `.vue`, nunca en `--prod`, y no se generan archivos `.map` externos.

### ¿Soporta code splitting?

**No**, VersaCompiler no tiene code splitting automático. Para esto necesitas herramientas más maduras.

### ¿Cómo leo variables de entorno en el código?

Usa variables con prefijo `VERSA_` en un archivo `.env` y accede a ellas con `import.meta.env.VERSA_*`. Las variables sin ese prefijo no llegan al navegador. Ver [configuration.md](./configuration.md#-variables-de-entorno-env).

### ¿Puedo usar VersaCompiler desde un script de Node?

Sí, con `build()` y `compile()` desde `versacompiler`. Ver [api.md](./api.md#api-programática).

## 🛠️ Troubleshooting

### Error: "Cannot find configuration file"

Verifica que `versacompile.config.ts` existe en la raíz del proyecto:

```bash
ls versacompile.config.ts
```

### Error: "Cannot compile TypeScript files"

1. Verifica que `tsconfig.json` existe y es válido
2. Instala TypeScript 6: `pnpm add -D typescript@6`

### Error: "Linter binary not found"

Instala las dependencias necesarias:

```bash
pnpm add -D eslint      # Para ESLint
pnpm add -D oxlint      # Para OxLint
```

### HMR no funciona

1. Verifica que usas `--watch`
2. Comprueba que `server.proxyUrl` está correctamente configurado (o vacío si no usas proxy)
3. Verifica que usas el formato Vite-style en la config (`root`, `build`, `resolve`)

### Error `Cannot use 'import.meta' outside a module`

El shim HMR usa `import.meta`, que solo funciona en archivos cargados con `type="module"`. Si un archivo se carga con `<script src="...">` simple, añádelo a `hmrExclude`:

```typescript
import { defineConfig } from 'versacompiler/config';
export default defineConfig({
    root: './src',
    build: { outDir: './dist' },
    resolve: { alias: { '@': 'src' } },
    hmrExclude: ['nombre-del-archivo.js'],
});
```

Si el problema afecta a todos los archivos, usa `hmr: false`.

### Compilación muy lenta

1. Usa solo un linter (OxLint es más rápido)
2. Limita los `paths` en la configuración del linter
3. Usa `versacompiler --cleanCache` para limpiar caché

### Errores de importación

1. Verifica los `pathsAlias` en la configuración
2. Comprueba que las rutas en `tsconfig.json` coinciden
3. Usa rutas relativas si persiste el problema

## 🔄 Migración y Alternativas

### ¿Puedo migrar desde Vite?

La migración es posible pero manual. VersaCompiler tiene menos características que Vite: no hace bundling, code splitting ni tree shaking.

### ¿Cuándo usar VersaCompiler vs otras herramientas?

**Usa VersaCompiler si:**

- ✅ Proyecto experimental/pequeño
- ✅ Quieres una herramienta simple
- ✅ Solo necesitas Vue + TypeScript básico

**Usa Vite si:**

- ✅ Proyecto en producción
- ✅ Necesitas características avanzadas
- ✅ Ecosystem rico de plugins

**Usa Webpack si:**

- ✅ Proyecto enterprise complejo
- ✅ Configuración muy específica
- ✅ Compatibilidad con herramientas legacy

## 🎯 Comandos Útiles

```bash
# Desarrollo
versacompiler --watch              # Modo observación
versacompiler --linter             # Solo linting
versacompiler --all                # Compilar una vez

# Producción
versacompiler --all --prod         # Build optimizado
versacompiler --cleanOutput --cleanCache --all --prod # Limpiar y build

# Debug
versacompiler --all --verbose      # Salida detallada
versacompiler --help               # Ayuda
```

## 📚 Recursos Adicionales

- 📖 [Guía de Inicio](./getting-started.md)
- 🔧 [Configuración](./configuration.md)
- 🎯 [Ejemplos](./examples.md)
- 🔄 [API Reference](./api.md)
- 🤝 [Contribuir](./contributing.md)

## 💡 ¿Necesitas Más Ayuda?

1. **Revisa la documentación** completa en `/docs`
2. **Busca issues existentes** en GitHub
3. **Abre un issue** para bugs o feature requests
4. **Contribuye** al proyecto si encuentras mejoras

**Recuerda:** VersaCompiler está en desarrollo activo. Las características pueden cambiar y hay limitaciones conocidas.
