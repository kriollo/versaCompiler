# VersaCompiler Performance Report

Generated: 5/6/2025

## 📊 Summary

- **Total Tests**: 11
- **Passed Tests**: 11
- **Success Rate**: 100.0%
- **Average Performance**: 49.82ms
- **Total Time**: 547.97ms

## 🖥️ Environment

- **Node.js**: v23.11.0
- **Platform**: win32 x64
- **CPUs**: 8
- **Memory**: 31.4 GB


## 🚀 Performance Highlights

**Fastest Test**: Performance Baseline (3.13ms)

**Slowest Test**: Large File Compilation (138.23ms)

## 📈 Changes Since Last Run

### ⚠️ Regressions
- **TypeScript Simple**: +39.4% (89.56ms → 124.80ms)
- **preCompileTS Direct**: +63.3% (14.30ms → 23.35ms)
- **Memory Usage**: +30.2% (11.16ms → 14.53ms)
- **Concurrent Compilation**: +106.6% (37.82ms → 78.14ms)

### 🎯 Improvements
- **JavaScript Simple**: 19.4% faster (24.57ms → 19.80ms)
- **Batch Compilation**: 12.1% faster (98.22ms → 86.30ms)
- **Large File Compilation**: 27.1% faster (189.58ms → 138.23ms)
- **Performance Baseline**: 20.5% faster (3.93ms → 3.13ms)
- **Performance Consistency**: 13.2% faster (7.91ms → 6.86ms)

## 📋 Detailed Results

| Test Name | Avg (ms) | Min (ms) | Max (ms) | Success Rate |
|-----------|----------|----------|----------|--------------|
| JavaScript Simple | 19.80 | 19.80 | 19.80 | 100.0% |
| TypeScript Simple | 124.80 | 124.80 | 124.80 | 100.0% |
| Vue Simple | 46.54 | 46.54 | 46.54 | 100.0% |
| preCompileVue Direct | 6.28 | 6.28 | 6.28 | 100.0% |
| preCompileTS Direct | 23.35 | 23.35 | 23.35 | 100.0% |
| Batch Compilation | 86.30 | 86.30 | 86.30 | 100.0% |
| Memory Usage | 14.53 | 14.53 | 14.53 | 100.0% |
| Concurrent Compilation | 78.14 | 78.14 | 78.14 | 100.0% |
| Large File Compilation | 138.23 | 138.23 | 138.23 | 100.0% |
| Performance Baseline | 3.13 | 3.13 | 3.13 | 100.0% |
| Performance Consistency | 6.86 | 6.86 | 6.86 | 100.0% |

---

*Report generated automatically by VersaCompiler Performance Testing System*
