# 🚀 VersaCompiler Performance System

Sistema completo de testing, benchmarking y análisis de performance con persistencia histórica, dashboards interactivos y detección automática de regresiones.

## 📊 Overview del Sistema

VersaCompiler incluye un sistema avanzado de performance que proporciona:

- 🕒 **Tracking histórico** de resultados de performance
- 📈 **Dashboard interactivo** con gráficos en tiempo real
- 🔍 **Detección automática** de regresiones y mejoras
- 📋 **Reportes** en múltiples formatos (JSON, Markdown, HTML)
- 🧪 **Tests comprehensivos** para diferentes tipos de archivos
- 🎯 **Generadores de archivos** para tests de escala
- 🌍 **Información de entorno** (Node.js, git, sistema)

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

### Tests Incluidos (11 tests, 100% tasa de éxito)

1. **JavaScript Simple** - Compilación básica de archivos JS
2. **TypeScript** - Type checking y compilación TS
3. **Vue Components** - Procesamiento de componentes Vue
4. **Funciones Directas** - Tests de APIs específicas
5. **Batch Compilation** - Compilación de múltiples archivos
6. **Memory Usage** - Análisis de uso de memoria
7. **Concurrency** - Tests de compilación concurrente
8. **Large Files** - Archivos generados automáticamente (24KB TS, 7KB Vue, 44KB JS)
9. **Baseline Performance** - Test de referencia básico
10. **Performance Consistency** - Validación de consistencia entre ejecuciones
11. **TypeScript Overhead** - Medición del overhead de type checking

### Métricas Actuales (Última Ejecución)

- **Tests Ejecutados**: 11 tests
- **Tasa de Éxito**: 100%
- **Tiempo Promedio**: 87.21ms
- **Throughput**: 62.61 files/sec (compilación batch)
- **Archivos Grandes**: TS (24KB), Vue (7KB), JS (44KB)

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

📉 REGRESIONES DETECTADAS:
  ❌ Vue Complex: +12.7% (156ms → 176ms)

📊 ESTABLES:
  → JavaScript Simple: +2.1% (dentro del rango normal)
```

## 🏗️ Generadores de Archivos

### Tipos de Generadores

```typescript
// Generar archivo TypeScript de 200 líneas
const largeTSContent = FileGenerators.generateLargeTS(200);

// Generar archivo Vue con 10 componentes
const largeVueContent = FileGenerators.generateLargeVue(10);

// Generar archivo JavaScript con 50 funciones
const largeJSContent = FileGenerators.generateLargeJS(50);
```

### Contenido Generado

- **TypeScript**: Interfaces, clases, generics, funciones async
- **Vue**: Componentes con props, emits, computed, watchers
- **JavaScript**: Funciones, clases, exports, imports

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
