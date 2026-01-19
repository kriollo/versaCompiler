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
- ✅ **CSS Modules, SCSS** preprocesadores integrados
- ✅ **Linting dual** ESLint + OxLint con múltiples formatos
- ✅ **Proyectos enterprise** con configuraciones avanzadas

### ¿Es VersaCompiler gratuito?

Sí, es **100% gratuito y open source** bajo licencia MIT.

## 🔧 Instalación y Configuración

### ¿Cómo instalo VersaCompiler?

Actualmente solo está disponible desde código fuente:

```bash
git clone https://github.com/kriollo/versaCompiler.git
cd versaCompiler
npm install
npm run build
```

### ¿Necesito Node.js específico?

**Requisitos mínimos:**

- Node.js >= 16.0.0
- npm >= 7.0.0

### ¿Dónde va el archivo de configuración?

Crea `versacompile.config.ts` en la raíz de tu proyecto:

```typescript
export default {
    tsconfig: './tsconfig.json',
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@/*': ['src/*'],
        },
    },
};
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

Sí, configura `proxyConfig` en tu archivo de configuración:

```typescript
export default {
    proxyConfig: {
        proxyUrl: 'http://localhost:8080',
        assetsOmit: true,
    },
};
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
- ✅ **CSS Modules** con hashing automático
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

### ¿Puedo usar decorators de TypeScript?

Absolutamente. VersaCompiler tiene soporte completo para decorators:

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

Sí, configúralos en `pathsAlias` y también en tu `tsconfig.json`:

```typescript
export default {
    compilerOptions: {
        pathsAlias: {
            '@/*': ['src/*'],
            '@components/*': ['src/components/*'],
            '@utils/*': ['src/utils/*'],
            '@components/*': ['src/components/*'],
        },
    },
};
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
versacompiler --all --prod
```

Esto compila todos los archivos y minifica el código usando OxcMinify.

### ¿Qué optimizaciones incluye?

- **Minificación** básica con OxcMinify
- **Compilación de TailwindCSS**
- **Transpilación de TypeScript**

### ¿Genera source maps?

Actualmente **no** se generan source maps automáticamente.

### ¿Soporta code splitting?

**No**, VersaCompiler no tiene code splitting automático. Para esto necesitas herramientas más maduras.

## 🛠️ Troubleshooting

### Error: "Cannot find configuration file"

Verifica que `versacompile.config.ts` existe en la raíz del proyecto:

```bash
ls versacompile.config.ts
```

### Error: "Cannot compile TypeScript files"

1. Verifica que `tsconfig.json` existe y es válido
2. Instala TypeScript: `npm install typescript`

### Error: "Linter binary not found"

Instala las dependencias necesarias:

```bash
npm install --save-dev eslint      # Para ESLint
npm install --save-dev oxlint      # Para OxLint
```

### HMR no funciona

1. Verifica que usas `--watch`
2. Comprueba que el puerto no está ocupado
3. Asegúrate de que `proxyConfig` está bien configurado

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

La migración es posible pero manual. VersaCompiler tiene menos características que Vite.

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
