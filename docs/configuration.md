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

Array de configuraciones de linters:

- `name`: Nombre del linter (`'eslint'` o `'oxlint'`)
- `bin`: Ruta al binario del linter
- `configFile`: Archivo de configuración del linter
- `fix`: Auto-fix de errores
- `paths`: Rutas a analizar

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

VersaCompiler se ejecuta mediante comandos de línea:

| Comando       | Descripción                             |
| ------------- | --------------------------------------- |
| `--watch`     | Modo observación con auto-recompilación |
| `--all`       | Compilar todos los archivos             |
| `--prod`      | Modo producción con minificación        |
| `--clean`     | Limpiar directorio de salida            |
| `--lint-only` | Solo ejecutar linting                   |
| `--verbose`   | Salida detallada                        |
| `--help`      | Mostrar ayuda                           |

## Troubleshooting

### Problemas Comunes

#### Error de configuración

```bash
# Verificar que el archivo de configuración tenga la sintaxis correcta
node versacompile.config.ts
```

#### Cache corrupto

```bash
# Limpiar y recompilar
versacompiler --clean --all
```

#### Linting lento

```bash
# Usar solo uno de los linters para mayor velocidad
# Modificar el array linter en la configuración
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
