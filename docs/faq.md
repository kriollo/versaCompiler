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

VersaCompiler es una herramienta experimental de compilación para proyectos Vue.js con TypeScript. Está en desarrollo activo y combina compilación de Vue SFC, TypeScript, linting y minificación básica.

### ¿Es VersaCompiler estable para producción?

**VersaCompiler está en desarrollo**. Es un proyecto experimental que puede usarse para proyectos pequeños a medianos, pero recomendamos herramientas maduras como Vite o Webpack para proyectos críticos en producción.

### ¿Qué tipo de proyectos soporta?

- ✅ **Vue 3** Single File Components
- ✅ **TypeScript** transpilación básica
- ✅ **JavaScript** moderno
- ✅ **TailwindCSS** compilación
- ⚠️ **Proyectos pequeños a medianos** (en desarrollo)

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
versacompiler --watch
```

Esto compilará los archivos y observará cambios para recompilación automática.

### ¿Hay HMR (Hot Module Replacement)?

VersaCompiler tiene **HMR básico** usando BrowserSync. Es funcional pero no tan avanzado como Vite o Webpack.

### ¿Qué archivos observa?

- Archivos `.vue`, `.ts`, `.js` en el directorio `sourceRoot`
- Archivos adicionales definidos en `aditionalWatch`

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

VersaCompiler usa tu `tsconfig.json` existente. Si no tienes uno, crea uno básico:

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"]
        }
    }
}
```

### ¿Soporta Vue 3 completamente?

VersaCompiler puede compilar Vue SFC básicos, pero **no todas las características avanzadas** están implementadas. Para proyectos complejos, considera Vite.

### ¿Puedo usar Composition API?

Sí, la Composition API de Vue 3 funciona correctamente.

### ¿Funcionan los path aliases?

Sí, configúralos en `pathsAlias`:

```typescript
export default {
    compilerOptions: {
        pathsAlias: {
            '@/*': ['src/*'],
            '@components/*': ['src/components/*'],
        },
    },
};
```

## 🔍 Linting

### ¿Qué linters soporta?

- **ESLint** - Linter tradicional de JavaScript/TypeScript
- **OxLint** - Linter ultrarrápido escrito en Rust

### ¿Cómo configuro linting?

```typescript
export default {
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './eslint.config.js',
            fix: false,
            paths: ['src/'],
        },
    ],
};
```

### ¿Puedo usar ambos linters?

Sí, puedes configurar ESLint y OxLint simultáneamente para máxima cobertura.

### ¿Se corrigen errores automáticamente?

Configura `fix: true` en la configuración del linter para auto-fix.

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
3. Usa `versacompiler --clean` para limpiar cache

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
versacompiler --lint-only          # Solo linting
versacompiler --all                # Compilar una vez

# Producción
versacompiler --all --prod         # Build optimizado
versacompiler --clean --all --prod # Limpiar y build

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
