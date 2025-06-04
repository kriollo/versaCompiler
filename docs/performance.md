# VersaCompiler Performance Testing & Benchmarks

Este documento describe los tests de performance y benchmarks disponibles para evaluar el rendimiento del VersaCompiler.

## 📊 Overview

VersaCompiler incluye un conjunto completo de tests de performance y benchmarks que miden:

- **Tiempo de compilación** para diferentes tipos de archivos
- **Uso de memoria** durante la compilación
- **Confiabilidad** (tasa de éxito de las compilaciones)
- **Overhead** del type checking de TypeScript
- **Comparación** entre diferentes enfoques de compilación

## 🚀 Ejecución Rápida

```powershell
# Tests de performance completos (Jest)
pnpm test:performance

# Benchmark independiente (más rápido)
pnpm benchmark

# Benchmark detallado (10 iteraciones por test)
pnpm benchmark:detailed
```

## 📋 Tipos de Tests

### 1. Tests de Performance (Jest)

Ubicados en `tests/performance.test.ts`, estos tests ejecutan con Jest y proporcionan:

- ✅ Validaciones automáticas de rendimiento
- 📊 Métricas detalladas por test
- 🔍 Análisis de memoria y tamaño de output
- 📈 Comparaciones estadísticas

**Características:**

- 5 iteraciones por test por defecto
- Timeout de 60-120 segundos por test
- Setup/teardown automático de ambiente de pruebas
- Reportes en consola con colores

### 2. Benchmark Independiente

Script standalone en `benchmark.ts` que ejecuta sin Jest:

- ⚡ Más rápido de ejecutar
- 🎨 Output colorizado y estructurado
- 📋 Tabla resumen de resultados
- 💡 Recomendaciones automáticas

## 🔬 Escenarios de Prueba

### Archivos Individuales

| Tipo                        | Descripción                            | Tiempo Esperado |
| --------------------------- | -------------------------------------- | --------------- |
| **JavaScript Simple**       | Archivo JS básico (baseline)           | < 2 segundos    |
| **TypeScript (sin tipado)** | TS con `typeCheck: false`              | < 3 segundos    |
| **TypeScript (con tipado)** | TS con `typeCheck: true`               | < 5 segundos    |
| **TypeScript Complejo**     | Tipos avanzados, generics              | < 8 segundos    |
| **Vue Simple**              | Componente Vue básico                  | < 4 segundos    |
| **Vue Complejo**            | Componente con TS, múltiples secciones | < 10 segundos   |

### Funciones Directas

- `preCompileVue()` - Compilación directa de Vue
- `preCompileTS()` - Compilación directa de TypeScript

### Compilación Múltiple

- Batch de 5 archivos mixtos (JS, TS, Vue)
- Prueba del sistema de cache
- Tiempo total esperado < 15 segundos

### Comparaciones

- **Overhead TypeScript**: Mide el impacto del type checking
- **Factor de Complejidad Vue**: Simple vs complejo
- **Uso de Memoria**: Análisis de heap usage

## 📊 Métricas Recolectadas

### Tiempo

- **Promedio**: Tiempo medio de compilación
- **Mínimo/Máximo**: Rango de tiempos observados
- **Mediana**: Valor central de las mediciones
- **Desviación Estándar**: Consistencia del rendimiento

### Calidad

- **Tasa de Éxito**: % de compilaciones exitosas
- **Tamaño de Output**: Tamaño del archivo compilado
- **Uso de Memoria**: Heap usage durante compilación

### Umbrales de Calidad

- ✅ **Excelente**: Tasa de éxito > 95%, tiempo promedio < 5s
- ⚠️ **Aceptable**: Tasa de éxito > 85%, tiempo promedio < 10s
- ❌ **Necesita optimización**: Valores por debajo de los aceptables

## 🛠️ Configuración

### Variables de Entorno para Tests

Los tests configuran automáticamente:

```typescript
env.PATH_SOURCE = './tests/temp-performance/src';
env.PATH_DIST = './tests/temp-performance/dist';
env.VERBOSE = 'false';
env.ENABLE_LINTER = 'false';
env.clean = 'false';
```

### Archivos de Muestra

Los tests incluyen archivos de muestra predefinidos:

- **JavaScript Simple**: Funciones básicas, exports
- **TypeScript Simple**: Interfaces, clases, async/await
- **TypeScript Complejo**: Generics, tipos avanzados, utilidades
- **Vue Simple**: Template, script setup, estilos básicos
- **Vue Complejo**: TypeScript, computed, watchers, lifecycle

## 📈 Interpretación de Resultados

### Benchmark Output Ejemplo

```
🔥 VERSACOMPILER BENCHMARK SUITE
═══════════════════════════════════════

📊 JavaScript Simple Performance:
  ✅ JavaScript Simple
  ⏱️  Tiempo promedio: 245.67ms
  📈 Min/Max: 198.23ms / 312.45ms
  📊 Mediana: 241.32ms
  📏 Desv. estándar: 23.45ms
  ✅ Tasa de éxito: 100.0%
  📦 Tamaño promedio: 1.23KB
```

### Interpretación

- **Tiempo < 1000ms**: Excelente rendimiento
- **Tasa éxito 100%**: Compilación confiable
- **Desv. estándar < 50ms**: Rendimiento consistente
- **Tamaño output**: Verificar que la minificación funciona

## 🔧 Personalización

### Modificar Iteraciones

```powershell
# Benchmark con más iteraciones (más preciso)
tsx benchmark.ts --iterations 20

# Tests Jest con timeout personalizado
pnpm test:performance --testTimeout=600000
```

### Agregar Nuevos Tests

Para agregar un nuevo test de performance:

1. **En Jest** (`tests/performance.test.ts`):

```typescript
test('Mi nuevo test', async () => {
    const results = await measurePerformance(async () => {
        // Tu función a medir
        return await compileFile(filePath);
    });

    const stats = calculateStats('Mi Test', results);
    expect(stats.successRate).toBe(1);
    // Más assertions...
});
```

2. **En Benchmark** (`benchmark.ts`):

```typescript
await this.measureFunction('Mi Nuevo Test', async () => {
    // Tu función a medir
    return await miFunction();
});
```

## 🎯 Casos de Uso

### Desarrollo Diario

```powershell
# Verificación rápida antes de commit
pnpm benchmark
```

### CI/CD Pipeline

```powershell
# Tests completos con validaciones
pnpm test:performance
```

### Optimización de Performance

```powershell
# Benchmark detallado para análisis profundo
pnpm benchmark:detailed
```

### Debugging de Performance

1. Ejecutar benchmark antes del cambio
2. Implementar optimización
3. Ejecutar benchmark después
4. Comparar resultados

## 🚨 Troubleshooting

### Tests Fallan

- Verificar que no hay procesos de fondo usando recursos
- Aumentar timeout si es necesario
- Revisar configuración de variables de entorno

### Rendimiento Bajo

- Verificar versión de Node.js (recomendado: 18+)
- Cerrar aplicaciones pesadas durante tests
- Considerar hardware (CPU, RAM, SSD)

### Inconsistencia en Resultados

- Ejecutar múltiples veces para confirmar
- Verificar que no hay cache interferiendo
- Usar `--iterations` mayor para más precisión

## 📚 Recursos Adicionales

- [Documentación Principal](./docs/getting-started.md)
- [Configuración](./docs/configuration.md)
- [Ejemplos](./docs/examples.md)
- [FAQ Performance](./docs/faq.md#performance)

---

**💡 Tip**: Ejecuta los benchmarks regularmente para detectar regresiones de performance temprano en el desarrollo.
