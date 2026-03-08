# 🔧 Guía de Configuración

## Introducción

VersaCompiler utiliza un archivo de configuración simple para definir las opciones de compilación. Esta guía cubre las opciones disponibles.

## Archivo de Configuración

Crea un archivo `versacompile.config.ts` en la raíz de tu proyecto:

```typescript
// Configuración de VersaCompiler
export default {
    tsconfig: './tsconfig.json',
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@/*': ['src/*'],
        },
    },
    // Resto de configuración...
};
```

## Opciones de Configuración Disponibles

### compilerOptions

- `sourceRoot`: Directorio de archivos fuente (por defecto: `'./src'`)
- `outDir`: Directorio de salida (por defecto: `'./dist'`)
- `pathsAlias`: Aliases para imports (ej: `'@/*': ['src/*']`)

### proxyConfig

- `proxyUrl`: URL del proxy para desarrollo
- `assetsOmit`: Omitir assets en el proxy

### tailwindConfig

- `bin`: Ruta al binario de TailwindCSS
- `input`: Archivo CSS de entrada
- `output`: Archivo CSS de salida

### linter

Array de configuraciones de linters avanzadas:

#### Configuración Básica

- `name`: Nombre del linter (`'eslint'` o `'oxlint'`)
- `bin`: Ruta al binario del linter
- `configFile`: Archivo de configuración del linter
- `fix`: Auto-fix de errores detectados (opcional)
- `paths`: Rutas específicas a analizar (opcional)

#### Configuración Avanzada de ESLint

```typescript
{
    name: 'eslint',
    bin: './node_modules/.bin/eslint',
    configFile: './eslint.config.js',
    fix: true,
    paths: ['src/', 'tests/'],
    eslintConfig: {
        cache: true,                    // Habilitar cache para velocidad
        maxWarnings: 10,               // Máximo número de warnings
        quiet: false,                  // Mostrar solo errores
        formats: ['json', 'stylish'],  // Formatos de salida
        deny: ['no-console'],          // Reglas a denegar
        allow: ['no-unused-vars'],     // Reglas a permitir
        noIgnore: false,               // Usar .eslintignore
        ignorePath: './.eslintignore', // Archivo ignore personalizado
        ignorePattern: ['*.test.js']   // Patrones a ignorar
    }
}
```

#### Configuración Avanzada de OxLint

```typescript
{
    name: 'oxlint',
    bin: './node_modules/.bin/oxlint',
    configFile: './.oxlintrc.json',
    fix: true,
    paths: ['src/'],
    oxlintConfig: {
        rules: {                       // Reglas personalizadas
            'no-unused-vars': 'error'
        },
        plugins: ['recommended'],      // Plugins de OxLint
        deny: ['no-console'],          // Reglas a denegar
        allow: ['no-unused-vars'],     // Reglas a permitir
        tsconfigPath: './tsconfig.json', // Ruta a tsconfig
        quiet: false,                  // Solo errores
        noIgnore: false,               // Usar archivos ignore
        ignorePath: './.oxlintignore', // Archivo ignore personalizado
        ignorePattern: ['*.test.ts']   // Patrones a ignorar
    }
}
```

### bundlers

Array de configuraciones de bundling:

- `name`: Nombre del bundle
- `fileInput`: Archivo de entrada
- `fileOutput`: Archivo de salida

### validationOptions (v2.4.0+)

Opciones para el sistema de validación de integridad:

```typescript
validationOptions: {
    skipSyntaxCheck: false,  // Omitir Check 4 (validación de sintaxis)
    verbose: false,          // Logging detallado de validaciones
    throwOnError: true       // Lanzar excepción al detectar error
}
```

**Opciones disponibles:**

- `skipSyntaxCheck`: Si es `true`, omite la validación de sintaxis (Check 4) para optimizar performance. Por defecto: `false`
- `verbose`: Si es `true`, muestra logging detallado de cada validación. Por defecto: `false`
- `throwOnError`: Si es `true`, lanza una excepción cuando se detecta código corrupto. Si es `false`, solo retorna un resultado inválido. Por defecto: `true`

**Ejemplo de uso:**

```typescript
export default {
    // ... otras configuraciones
    validationOptions: {
        skipSyntaxCheck: false, // Ejecutar validación completa
        verbose: true, // Ver detalles de cada validación
        throwOnError: true, // Fallar build si hay errores
    },
};
```

**Nota:** La validación de integridad se ejecuta automáticamente durante la compilación con el flag `--checkIntegrity`. Estas opciones controlan el comportamiento de las validaciones.

## Ejemplo Completo

```typescript
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

## Comandos CLI

VersaCompiler ofrece una amplia gama de comandos CLI para diferentes flujos de trabajo:

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

### Ejemplos de Uso Avanzado

```bash
# Desarrollo con análisis completo
versacompiler --watch --verbose --typeCheck

# Compilación específica de componente
versacompiler --file src/components/Dashboard.vue --typeCheck

# Build para producción con limpieza completa
versacompiler --all --prod --cleanOutput --cleanCache --yes

# Solo análisis de código
versacompiler --linter --verbose

# Solo verificación de tipos en archivos específicos
versacompiler --typeCheck src/types/ src/components/

# Compilación de múltiples archivos específicos
versacompiler src/main.ts src/App.vue src/router.ts
```

## Troubleshooting

### Problemas Comunes

#### Error de configuración

```bash
# Verificar que el archivo de configuración tenga la sintaxis correcta
node versacompile.config.ts

# Inicializar configuración desde cero
versacompiler --init
```

#### Cache corrupto o problemas de rendimiento

```bash
# Limpiar cache y recompilar
versacompiler --cleanCache --cleanOutput

# Limpiar solo cache de compilación
versacompiler --cleanCache

# Limpiar solo directorio de salida
versacompiler --cleanOutput
```

#### Linting muy lento

```bash
# Usar solo OxLint para máxima velocidad
versacompiler --linter --verbose

# Verificar configuración de cache en eslintConfig
{
    eslintConfig: {
        cache: true  // Asegurar que cache está habilitado
    }
}
```

#### Problemas de TypeScript

```bash
# Verificar configuración de decorators en tsconfig.json
{
    "compilerOptions": {
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true
    }
}

# Solo verificación de tipos con verbose
versacompiler --typeCheck --verbose
```

#### Errores de archivos Vue

```bash
# Compilar archivo Vue específico con debug
versacompiler --file src/components/Problem.vue --verbose

# Verificar tipos en archivo Vue
versacompiler --typeCheck --file src/components/Problem.vue
```

### Configuraciones de Performance

#### Para proyectos grandes

```typescript
export default {
    // Optimizaciones para proyectos grandes
    linter: [
        {
            name: 'oxlint', // Usar OxLint para velocidad
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            eslintConfig: {
                cache: true, // Cache obligatorio
                quiet: true, // Solo errores
            },
        },
    ],
};
```

#### Para desarrollo rápido

```typescript
export default {
    // Solo lo esencial para desarrollo
    linter: [
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            fix: true, // Auto-fix para desarrollo
            paths: ['src/'], // Solo directorio principal
        },
    ],
};
```

## Validación de Integridad

VersaCompiler incluye un sistema de validación de integridad que detecta automáticamente código corrupto durante la compilación. Esta característica es especialmente útil para builds de producción y deploy.

### ¿Qué Valida el Sistema de Integridad?

El validador verifica que el código compilado/minificado:

- ✅ **No esté vacío** - Previene archivos vacíos por errores de minificación
- ✅ **Mantenga la estructura** - Verifica paréntesis, llaves y corchetes balanceados
- ✅ **Preserve exports** - Asegura que los exports no se eliminen por error
- ✅ **Sea sintácticamente válido** - Detecta errores de sintaxis introducidos por transformaciones

### Uso del Flag --checkIntegrity / -ci

La validación de integridad es **opcional** y se activa con el flag CLI:

```bash
# Compilar con validación de integridad
versacompiler build --all --prod --checkIntegrity

# O usar el shorthand
versacompiler build --all --prod -ci

# En modo verbose para ver detalles de validación
versacompiler build --all --prod --checkIntegrity --verbose
```

### ¿Cuándo Usar Validación de Integridad?

✅ **Recomendado:**

- Antes de hacer deploy a producción
- En pipelines CI/CD para validar builds
- Después de actualizar dependencias de minificación
- Cuando se introducen nuevas transformaciones de código

❌ **NO recomendado:**

- Durante desarrollo activo (agrega ~5ms por archivo)
- En modo watch (se ejecuta en cada cambio)
- Para iteraciones rápidas de desarrollo

### Comportamiento en Caso de Error

Si la validación detecta problemas:

- ❌ El build se **detiene inmediatamente** con código de error
- 📋 Se muestra en consola el archivo que falló y la razón
- 🚫 No se genera output corrupto

Ejemplo de salida en caso de error:

```
❌ Validación de integridad fallida para App.vue
   Error: Exports fueron eliminados o modificados incorrectamente

✖ Build failed - Integrity check error
```

### Performance

El sistema de validación de integridad está optimizado para mínimo impacto:

- ⚡ **<5ms por archivo** (típicamente 1-3ms)
- 💾 **Cache inteligente** - Validaciones repetidas son instantáneas
- 🎯 **Validación selectiva** - Skipea checks de sintaxis cuando es seguro
- 📊 **Métricas disponibles** en modo verbose

### Ejemplo de Uso en CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
    push:
        branches: [main]

jobs:
    build-and-deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - uses: pnpm/action-setup@v2

            # Instalar dependencias
            - run: pnpm install

            # Build con validación de integridad
            - run: pnpm versacompiler build --all --prod --checkIntegrity

            # Solo hacer deploy si la validación pasa
            - run: pnpm deploy
```

### Package.json Scripts

```json
{
    "scripts": {
        "dev": "versacompiler --watch",
        "build": "versacompiler --all --prod",
        "build:deploy": "versacompiler --all --prod --checkIntegrity",
        "build:safe": "versacompiler --all --prod -ci --verbose"
    }
}
```

### Archivos de Configuración Relacionados

- `tsconfig.json`: Configuración de TypeScript
- `eslint.config.js`: Configuración de ESLint
- `.oxlintrc.json`: Configuración de OxLint
- `tailwind.config.js`: Configuración de TailwindCSS

## Estructura de Proyecto Típica

```
mi-proyecto/
├── src/                       # Código fuente
│   ├── components/            # Componentes Vue
│   ├── css/                   # Estilos
│   └── main.ts               # Punto de entrada
├── dist/                     # Archivos compilados
├── public/                   # Archivos estáticos
├── versacompile.config.ts    # Configuración VersaCompiler
├── tsconfig.json             # Configuración TypeScript
└── package.json
```

Para más información, consulta la [documentación completa](./getting-started.md).
