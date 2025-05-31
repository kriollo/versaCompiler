# 🤝 Guía de Contribución

¡Gracias por tu interés en contribuir a VersaCompiler! Esta guía te ayudará a empezar y te explicará cómo puedes aportar al proyecto.

## 🚀 Primeros Pasos

### Requisitos Previos

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0 o **pnpm** >= 7.0.0
- **Git**
- **TypeScript** conocimiento básico

### Configuración del Entorno de Desarrollo

1. **Fork del repositorio**

    ```bash
    # En GitHub, haz click en "Fork"
    # Luego clona tu fork
    git clone https://github.com/TU_USUARIO/versaCompiler.git
    cd versaCompiler
    ```

2. **Instalación de dependencias**

    ```bash
    npm install
    # o
    pnpm install
    ```

3. **Configurar upstream**

    ```bash
    git remote add upstream https://github.com/kriollo/versaCompiler.git
    ```

4. **Verificar instalación**
    ```bash
    npm test
    npm run build
    ```

## 🏗️ Estructura del Proyecto

```
versaCompiler/
├── src/                    # Código fuente principal
│   ├── main.ts            # CLI principal
│   ├── compiler/          # Motor de compilación
│   │   ├── compile.ts     # Coordinador principal
│   │   ├── vuejs.ts       # Compilador Vue SFC
│   │   ├── typescript.ts  # Transpilador TypeScript
│   │   ├── linter.ts      # Sistema de linting
│   │   └── minify.ts      # Minificación
│   ├── servicios/         # Servicios del servidor
│   │   ├── browserSync.ts # Servidor HMR
│   │   ├── chokidar.ts    # File watcher
│   │   └── logger.ts      # Sistema de logging
│   ├── utils/             # Utilidades
│   └── wrappers/          # Wrappers de herramientas externas
├── tests/                 # Tests
├── docs/                  # Documentación
├── examples/              # Archivos de ejemplo
└── public/                # Archivos compilados de ejemplo
```

## 📝 Tipos de Contribuciones

### 🐛 Reportar Bugs

Antes de reportar un bug:

1. Busca en [issues existentes](https://github.com/kriollo/versaCompiler/issues)
2. Verifica que uses la última versión
3. Crea un ejemplo mínimo reproducible

**Template para reportar bugs:**

```markdown
## Descripción del Bug

[Descripción clara y concisa del problema]

## Pasos para Reproducir

1. Configuración: ...
2. Ejecuta: ...
3. Observa: ...

## Comportamiento Esperado

[Qué esperabas que sucediera]

## Comportamiento Actual

[Qué sucedió realmente]

## Entorno

- OS: [Windows/macOS/Linux]
- Node.js: [versión]
- VersaCompiler: [versión]
- Browser: [si aplica]

## Ejemplo Mínimo

[Código o configuración mínima que reproduce el problema]
```

### ✨ Solicitar Features

**Template para features:**

```markdown
## Descripción del Feature

[Descripción clara de la funcionalidad propuesta]

## Motivación

[¿Por qué es necesario? ¿Qué problema resuelve?]

## Solución Propuesta

[Cómo debería funcionar]

## Alternativas Consideradas

[Otras opciones que consideraste]

## Implementación

[Ideas sobre cómo implementarlo]
```

### 🔧 Contribuir Código

#### Workflow de Desarrollo

1. **Crear rama feature**

    ```bash
    git checkout -b feature/nombre-descriptivo
    ```

2. **Hacer cambios**

    - Escribe código
    - Agrega tests
    - Actualiza documentación

3. **Verificar cambios**

    ```bash
    npm run lint
    npm test
    npm run build
    ```

4. **Commit con mensaje descriptivo**

    ```bash
    git commit -m "feat: agregar soporte para source maps en Vue SFC"
    ```

5. **Push y crear PR**
    ```bash
    git push origin feature/nombre-descriptivo
    ```

#### Convenciones de Código

**Naming Conventions:**

```typescript
// Variables y funciones: camelCase
const fileName = 'example.vue';
function compileFile() {}

// Clases: PascalCase
class VueCompiler {}

// Constantes: UPPER_SNAKE_CASE
const DEFAULT_PORT = 3000;

// Interfaces: PascalCase con prefijo 'I' opcional
interface CompilerConfig {}
interface IUserSettings {} // Solo si es necesario distinguir
```

**Estilo de Código:**

```typescript
// Usar TypeScript estricto
function processFile(filePath: string): Promise<CompileResult> {
    // Preferir async/await sobre Promises
    const result = await compileAsync(filePath);

    // Usar destructuring cuando sea apropiado
    const { code, sourceMap, errors } = result;

    // Early returns para reducir nesting
    if (errors.length > 0) {
        return { success: false, errors };
    }

    return { success: true, code, sourceMap };
}

// Documentar funciones públicas
/**
 * Compila un archivo Vue SFC
 * @param filePath Ruta al archivo .vue
 * @param options Opciones de compilación
 * @returns Resultado de la compilación
 */
export async function compileVue(
    filePath: string,
    options: CompileOptions = {},
): Promise<CompileResult> {
    // Implementación...
}
```

## 🧪 Testing

### Escribir Tests

**Test Structure:**

```typescript
// tests/compiler.test.ts
describe('Compiler', () => {
    describe('compileVue', () => {
        it('should compile basic Vue SFC', async () => {
            // Arrange
            const input = `
        <template>
          <div>{{ message }}</div>
        </template>
        <script>
        export default {
          data() {
            return { message: 'Hello' };
          }
        };
        </script>
      `;

            // Act
            const result = await compileVue(input, 'test.vue');

            // Assert
            expect(result.success).toBe(true);
            expect(result.code).toContain('Hello');
        });

        it('should handle compilation errors', async () => {
            const invalidInput = '<template><div></template>'; // Invalid

            const result = await compileVue(invalidInput, 'invalid.vue');

            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
        });
    });
});
```

**Test Categories:**

- **Unit Tests**: Funciones individuales
- **Integration Tests**: Flujos completos
- **E2E Tests**: Casos de uso reales

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests específicos
npm test -- --testNamePattern="Compiler"

# Tests en modo watch
npm run test:watch

# Coverage
npm run test:coverage
```

## 📚 Documentación

### Actualizar Documentación

**JSDoc para APIs:**

````typescript
/**
 * Configura el compilador con las opciones especificadas
 *
 * @param config - Configuración del compilador
 * @param config.sourceRoot - Directorio de archivos fuente
 * @param config.outDir - Directorio de salida
 * @returns Instancia del compilador configurado
 *
 * @example
 * ```typescript
 * const compiler = await configureCompiler({
 *   sourceRoot: './src',
 *   outDir: './dist'
 * });
 * ```
 */
export async function configureCompiler(
    config: CompilerConfig,
): Promise<Compiler> {
    // ...
}
````

**Markdown para guías:**

- Usa headers claros (`##`, `###`)
- Incluye ejemplos de código
- Agrega enlaces a referencias relacionadas
- Mantén ejemplos actualizados

## 🚀 Release Process

### Versionado

Seguimos [Semantic Versioning](https://semver.org/):

- **MAJOR**: Cambios breaking
- **MINOR**: Nuevas features (backward compatible)
- **PATCH**: Bug fixes

### Convenciones de Commit

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Features
git commit -m "feat: agregar soporte para source maps"
git commit -m "feat(vue): mejorar compilación de SFC"

# Bug fixes
git commit -m "fix: resolver error en resolución de módulos"
git commit -m "fix(linter): corregir detección de errores ESLint"

# Breaking changes
git commit -m "feat!: cambiar API de configuración"
git commit -m "feat(compiler)!: requerir Node.js 18+"

# Otros tipos
git commit -m "docs: actualizar README con nuevos ejemplos"
git commit -m "test: agregar tests para compilador Vue"
git commit -m "refactor: simplificar lógica de cache"
git commit -m "perf: optimizar compilación paralela"
git commit -m "chore: actualizar dependencias"
```

## 🔍 Code Review

### Para Reviewers

**Checklist de Review:**

- [ ] ¿El código sigue las convenciones del proyecto?
- [ ] ¿Están incluidos los tests apropiados?
- [ ] ¿La documentación está actualizada?
- [ ] ¿Los commits siguen conventional commits?
- [ ] ¿No hay cambios breaking sin justificación?
- [ ] ¿El performance se mantiene o mejora?

**Feedback Constructivo:**

```markdown
# ✅ Bueno

"Considera usar `Promise.all()` aquí para mejorar el performance"

# ❌ Evitar

"Este código está mal"
```

### Para Contributors

**Preparar PR para Review:**

1. Descripción clara del cambio
2. Tests que demuestren funcionalidad
3. Documentación actualizada
4. Commits limpios y descriptivos

**Template de PR:**

```markdown
## Descripción

[Resumen de los cambios realizados]

## Tipo de Cambio

- [ ] Bug fix (cambio que no rompe funcionalidad existente)
- [ ] Nueva feature (cambio que agrega funcionalidad)
- [ ] Breaking change (fix o feature que causa que funcionalidad existente no funcione como se esperaba)
- [ ] Actualización de documentación

## ¿Cómo se ha probado?

[Describe las pruebas que ejecutaste para verificar tus cambios]

## Checklist

- [ ] Mi código sigue las convenciones del proyecto
- [ ] He realizado una auto-revisión de mi código
- [ ] He comentado mi código, especialmente en áreas difíciles de entender
- [ ] He hecho cambios correspondientes a la documentación
- [ ] Mis cambios no generan nuevos warnings
- [ ] He agregado tests que prueban que mi fix es efectivo o que mi feature funciona
- [ ] Tests unitarios nuevos y existentes pasan localmente con mis cambios
```

## 🐛 Debugging

### Setup de Debug

**VS Code Launch Config:**

```json
{
    "type": "node",
    "request": "launch",
    "name": "Debug VersaCompiler",
    "program": "${workspaceFolder}/src/main.ts",
    "args": ["--all", "--verbose"],
    "runtimeArgs": ["-r", "tsx/cjs"],
    "env": {
        "NODE_ENV": "development"
    }
}
```

### Logging para Debug

```typescript
import { logger } from '../servicios/logger';

// Diferentes niveles de logging
logger.debug('Información detallada para debugging');
logger.info('Información general');
logger.warn('Advertencia');
logger.error('Error', error);

// Logging condicional
if (env.VERBOSE === 'true') {
    logger.debug(`Procesando archivo: ${filePath}`);
}
```

## 📊 Performance

### Profiling

```bash
# Profiling con Node.js
node --prof src/main.ts --all

# Analizar profile
node --prof-process isolate-*.log > profile.txt
```

### Benchmarking

```typescript
// Ejemplo de benchmark en tests
describe('Performance', () => {
    it('should compile 100 files under 5 seconds', async () => {
        const start = Date.now();

        await compileAll(testFiles);

        const duration = Date.now() - start;
        expect(duration).toBeLessThan(5000);
    });
});
```

## 🤝 Comunidad

### Canales de Comunicación

- **Issues**: Para bugs y feature requests
- **Discussions**: Para preguntas y conversaciones
- **Discord**: Para chat en tiempo real (próximamente)

### Código de Conducta

Nos comprometemos a mantener un ambiente acogedor y libre de acoso. Por favor:

- Sé respetuoso y constructivo
- Escucha diferentes perspectivas
- Acepta críticas constructivas
- Enfócate en lo que es mejor para la comunidad

## 🎉 Reconocimientos

### Contributors

Agradecemos a todos los contributors:

- Apareces automáticamente en GitHub contributors
- Contributors destacados se mencionan en releases
- Reconocimiento especial en el README

### Primeros Contributors

Para hacer tu primera contribución más fácil:

- Busca issues etiquetados como `good first issue`
- Pregunta en issues si necesitas orientación
- No tengas miedo de hacer preguntas

¡Esperamos tu contribución! 🚀
