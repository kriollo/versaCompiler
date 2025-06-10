# 🚀 VersaCompiler Performance System

Sistema completo de testing, benchmarking y análisis de performance con persistencia histórica, dashboards interactivos, detección automática de regresiones y **TypeScript Workers** para compilación paralela.

## 📊 Overview del Sistema

VersaCompiler incluye un sistema avanzado de performance que proporciona:

- 🕒 **Tracking histórico** de resultados de performance
- 📈 **Dashboard interactivo** con gráficos en tiempo real
- 🔍 **Detección automática** de regresiones y mejoras
- 📋 **Reportes** en múltiples formatos (JSON, Markdown, HTML)
- 🧪 **Tests comprehensivos** para diferentes tipos de archivos
- 🎯 **Generadores de archivos** para tests de escala
- 🌍 **Información de entorno** (Node.js, git, sistema)
- ⚡ **TypeScript Workers** - Compilación paralela para mejor performance
- 🎨 **TailwindCSS benchmarks** - Tests específicos para CSS
- 🔍 **Dual Linting performance** - ESLint + OxLint simultáneo

## 🚀 Comandos Rápidos

```bash
# Tests de performance con persistencia y reporte automático
npm run test:performance:persist

# Generar dashboard interactivo
npm run perf:dashboard

# Abrir dashboard en el navegador
npm run perf:dashboard:open

# Ver historial de performance
npm run perf:history

# Generar reporte detallado
npm run perf:report

# Limpiar resultados históricos
npm run perf:clean
```

## 📋 Sistema de Tests

### Tests Incluidos (15 tests, 100% tasa de éxito)

1. **JavaScript Simple** - Compilación básica de archivos JS
2. **TypeScript** - Type checking y compilación TS
3. **TypeScript con Workers** - Compilación paralela con workers
4. **Vue Components** - Procesamiento de componentes Vue 3.5
5. **Vue SFC Complex** - Componentes complejos con Composition API
6. **TailwindCSS Compilation** - Compilación de estilos Tailwind
7. **Dual Linting** - ESLint + OxLint simultáneo
8. **Funciones Directas** - Tests de APIs específicas
9. **Batch Compilation** - Compilación de múltiples archivos
10. **Memory Usage** - Análisis de uso de memoria
11. **Concurrency** - Tests de compilación concurrente
12. **Large Files** - Archivos generados automáticamente (24KB TS, 7KB Vue, 44KB JS)
13. **Baseline Performance** - Test de referencia básico
14. **Performance Consistency** - Validación de consistencia entre ejecuciones
15. **TypeScript Decorators** - Tests con decoradores experimentales

### Métricas Actuales (Última Ejecución)

- **Tests Ejecutados**: 15 tests
- **Tasa de Éxito**: 100%
- **Tiempo Promedio**: 67.12ms (mejorado con TypeScript workers)
- **Throughput**: 78.45 files/sec (compilación batch)
- **Archivos Grandes**: TS (24KB), Vue (7KB), JS (44KB)
- **Worker Performance**: 40% más rápido en proyectos TypeScript grandes

## 🗂️ Sistema de Persistencia

### Archivos Generados

```
performance-results/
├── performance-history.json     # Historial completo de resultados
├── dashboard.html              # Dashboard interactivo
├── latest-report.json          # Último reporte en JSON
└── latest-report.md           # Último reporte en Markdown
```

### Estructura de Datos

```typescript
interface PerformanceResult {
    duration: number;
    success: boolean;
    error?: string;
    outputSize?: number;
    memoryUsage?: NodeJS.MemoryUsage;
    timestamp?: number;
    // Nuevos campos para TypeScript workers
    workerUsed?: boolean;
    workerPerformance?: {
        mainThread: number;
        workerThread: number;
        speedup: number;
    };
    // Campos para TailwindCSS
    tailwindStats?: {
        inputSize: number;
        outputSize: number;
        classesProcessed: number;
    };
}

interface BenchmarkStats {
    name: string;
    avg: number;
    min: number;
    max: number;
    median: number;
    std: number;
    runs: number;
    successRate: number;
    avgOutputSize?: number;
    avgMemoryUsage?: number;
    timestamp: number;
    environment: PerformanceEnvironment;
    // Performance específico de TypeScript workers
    workerPerformance?: {
        avgSpeedup: number;
        workerUtilization: number;
    };
}
```

### Información de Entorno

El sistema captura automáticamente:

- Versión de Node.js
- Plataforma del sistema
- Cantidad de CPUs
- Memoria total
- Git commit hash (8 chars)
- Branch actual
- Timestamp de ejecución
- **TypeScript Workers habilitados**
- **Configuración de linters activos**
- **TailwindCSS configurado**

## 📊 Dashboard Interactivo

### Características del Dashboard

- 📈 **Gráficos Chart.js** con tendencias históricas
- 🔄 **Actualización automática** cada 30 segundos
- 📱 **Diseño responsivo** para móviles y desktop
- 🎨 **Tema oscuro** profesional
- 📊 **Métricas en tiempo real**
- 🔍 **Información detallada** al hacer hover

### Componentes Visuales

1. **Línea de Tiempo** - Evolución de tiempos promedio
2. **Tasa de Éxito** - Porcentaje de tests exitosos
3. **Distribución de Tests** - Gráfico de dona con breakdown
4. **Métricas Clave** - Cards con estadísticas principales
5. **Información de Entorno** - Detalles técnicos
6. **Worker Performance** - Gráfico de speedup de TypeScript workers
7. **Linting Performance** - Comparación ESLint vs OxLint
8. **TailwindCSS Stats** - Métricas de compilación CSS

## 🔍 Detección de Regresiones

### Sistema Automático

El sistema detecta automáticamente:

- 📉 **Regresiones**: Degradación > 10% en tiempo promedio
- 📈 **Mejoras**: Optimización > 10% en tiempo promedio
- ⚠️ **Cambios de Ambiente**: Diferentes versiones/plataformas

### Ejemplo de Salida

```bash
🔥 ANÁLISIS DE REGRESIONES Y MEJORAS:

📈 MEJORAS DETECTADAS:
  ✅ TypeScript Simple: -15.3% (245ms → 208ms)
  ✅ TypeScript con Workers: -28.7% (340ms → 242ms)
  ✅ Dual Linting: -12.1% (180ms → 158ms)

📉 REGRESIONES DETECTADAS:
  ❌ Vue Complex: +12.7% (156ms → 176ms)

📊 ESTABLES:
  → JavaScript Simple: +2.1% (dentro del rango normal)
  → TailwindCSS: +1.8% (compilación estable)

⚡ WORKERS PERFORMANCE:
  → Speedup promedio: 35.2%
  → Utilización de workers: 78%
```

## 🏗️ Generadores de Archivos

### Tipos de Generadores

```typescript
// Generar archivo TypeScript de 200 líneas con decoradores
const largeTSContent = FileGenerators.generateLargeTS(200, {
    includeDecorators: true,
    includeGenerics: true,
});

// Generar archivo Vue con 10 componentes usando Composition API
const largeVueContent = FileGenerators.generateLargeVue(10, {
    useCompositionAPI: true,
    includeTypeScript: true,
});

// Generar archivo JavaScript con 50 funciones y ES6+ features
const largeJSContent = FileGenerators.generateLargeJS(50, {
    useES6: true,
    includeAsyncFunctions: true,
});

// Generar TailwindCSS con múltiples componentes
const tailwindContent = FileGenerators.generateTailwindCSS(20, {
    includeCustomComponents: true,
    responsiveVariants: true,
});
```

### Contenido Generado

- **TypeScript**: Interfaces, clases, generics, funciones async, decoradores experimentales
- **Vue**: Componentes con props, emits, computed, watchers, Composition API, script setup
- **JavaScript**: Funciones, clases, exports, imports, ES6+ features
- **TailwindCSS**: Utilidades, componentes personalizados, variantes responsivas

## 📋 Reportes Automáticos

### Formato JSON

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": {
    "nodeVersion": "v20.10.0",
    "platform": "win32 x64",
    "cpuCount": 8,
    "totalMemory": 17179869184,
    "gitCommit": "a1b2c3d4",
    "branch": "main"
  },
  "totalTests": 11,
  "passedTests": 11,
  "avgPerformance": 87.21,
  "regressions": [],
  "improvements": ["TypeScript Simple"],
  "results": [...]
}
```

### Formato Markdown

```markdown
# 📊 Performance Report - VersaCompiler

**Generated**: 2024-01-15 10:30:00
**Environment**: Node.js v20.10.0 on win32 x64
**Git**: a1b2c3d4 (main)

## 📈 Summary

- **Total Tests**: 11
- **Passed**: 11 (100%)
- **Average Performance**: 87.21ms
- **Performance Status**: ✅ All tests within acceptable limits
```

## 🔧 Configuración Avanzada

### Variables de Entorno

```bash
# Personalizar número de iteraciones
PERF_ITERATIONS=10

# Cambiar directorio de resultados
PERF_RESULTS_DIR=./custom-results

# Habilitar logs detallados
PERF_VERBOSE=true

# Configurar umbral de regresión (default: 10%)
PERF_REGRESSION_THRESHOLD=15
```

### Scripts npm Disponibles

```json
{
    "test:performance": "jest tests/performance.test.ts",
    "test:performance:persist": "npm run test:performance && npm run perf:report",
    "perf:report": "node scripts/generate-performance-report.js",
    "perf:dashboard": "node scripts/generate-performance-report.js --dashboard",
    "perf:dashboard:open": "npm run perf:dashboard && start performance-results/dashboard.html",
    "perf:history": "node -e \"console.log(JSON.stringify(require('./performance-results/performance-history.json'), null, 2))\"",
    "perf:clean": "rimraf performance-results"
}
```

## 🚀 Integración CI/CD

### GitHub Actions (Recomendado)

```yaml
name: Performance Tests

on: [push, pull_request]

jobs:
    performance:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: '20'

            - name: Install dependencies
              run: npm ci

            - name: Run performance tests
              run: npm run test:performance:persist

            - name: Upload performance results
              uses: actions/upload-artifact@v4
              with:
                  name: performance-results
                  path: performance-results/
```

### Azure DevOps

```yaml
trigger:
    - main
    - develop

pool:
    vmImage: 'ubuntu-latest'

steps:
    - task: NodeTool@0
      inputs:
          versionSpec: '20.x'
      displayName: 'Install Node.js'

    - script: npm ci
      displayName: 'Install dependencies'

    - script: npm run test:performance:persist
      displayName: 'Run performance tests'

    - task: PublishTestResults@2
      inputs:
          testResultsFiles: 'performance-results/*.json'
          testRunTitle: 'Performance Tests'
```

## 🔍 Troubleshooting

### Problemas Comunes

#### Tests Fallan Intermitentemente

```bash
# Incrementar número de iteraciones para más estabilidad
PERF_ITERATIONS=20 npm run test:performance
```

#### Dashboard No Se Genera

```bash
# Verificar permisos de escritura
chmod 755 performance-results/

# Regenerar manualmente
npm run perf:dashboard
```

#### Resultados Inconsistentes

```bash
# Limpiar cache y volver a ejecutar
npm run perf:clean
npm run test:performance:persist
```

### Logs de Debug

Para habilitar logs detallados:

```bash
DEBUG=versacompiler:* npm run test:performance
```

## 📚 Ejemplos de Uso

### Análisis de Regresión

```bash
# Ejecutar antes del cambio
npm run test:performance:persist

# Implementar cambios...

# Ejecutar después y comparar automáticamente
npm run test:performance:persist
```

### Monitoreo Continuo

```bash
# Script de monitoreo cada hora
*/60 * * * * cd /path/to/project && npm run test:performance:persist
```

### Benchmarking Específico

```typescript
// Medir función específica
const result = await measurePerformance(async () => {
    return await myCustomFunction();
}, 5); // 5 iteraciones

const stats = calculateStats('Mi Test Custom', result);
console.log(`Tiempo promedio: ${stats.avg}ms`);
```

## 🎯 Mejores Prácticas

### Para Desarrollo

1. **Ejecutar tests localmente** antes de push
2. **Revisar dashboard** después de cambios importantes
3. **Mantener umbral** de regresión en 10%
4. **Documentar optimizaciones** significativas

### Para CI/CD

1. **Fallar build** en regresiones > 20%
2. **Archivar resultados** para análisis histórico
3. **Notificar equipo** de regresiones importantes
4. **Ejecutar en ambiente** consistente

### Para Monitoreo

1. **Revisar tendencias** semanalmente
2. **Investigar regresiones** inmediatamente
3. **Celebrar mejoras** del equipo
4. **Mantener histórico** por al menos 3 meses

## 📞 Soporte

Para problemas con el sistema de performance:

1. Revisar este documento
2. Verificar [Issues en GitHub](https://github.com/tu-repo/issues)
3. Ejecutar con logs debug habilitados
4. Contactar al equipo de desarrollo

---

**💡 Tip**: El sistema está diseñado para ser autónomo. Una vez configurado, proporcionará tracking automático de performance y alertas de regresiones sin intervención manual.
