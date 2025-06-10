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
