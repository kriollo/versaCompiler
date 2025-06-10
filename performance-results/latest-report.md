# VersaCompiler Performance Report

Generated: 10/6/2025

## 📊 Summary

- **Total Tests**: 11
- **Passed Tests**: 11
- **Success Rate**: 100.0%
- **Average Performance**: 67.56ms
- **Total Time**: 743.14ms

## 🖥️ Environment

- **Node.js**: v23.11.0
- **Platform**: win32 x64
- **CPUs**: 8
- **Memory**: 31.4 GB


## 🚀 Performance Highlights

**Fastest Test**: Performance Baseline (4.09ms)

**Slowest Test**: Large File Compilation (371.47ms)

## 📈 Changes Since Last Run

### ⚠️ Regressions
- **Concurrent Compilation**: +11.2% (26.37ms → 29.32ms)
- **Large File Compilation**: +258.8% (103.54ms → 371.47ms)

### 🎯 Improvements
- **JavaScript Simple**: 91.0% faster (329.13ms → 29.73ms)
- **TypeScript Simple**: 81.8% faster (521.41ms → 94.71ms)
- **Vue Simple**: 23.4% faster (62.61ms → 47.96ms)
- **preCompileTS Direct**: 13.2% faster (22.12ms → 19.19ms)
- **Batch Compilation**: 65.2% faster (342.06ms → 119.20ms)
- **Memory Usage**: 64.0% faster (31.06ms → 11.17ms)
- **Performance Baseline**: 11.5% faster (4.63ms → 4.09ms)
- **Performance Consistency**: 43.1% faster (11.68ms → 6.64ms)

## 📋 Detailed Results

| Test Name | Avg (ms) | Min (ms) | Max (ms) | Success Rate |
|-----------|----------|----------|----------|--------------|
| JavaScript Simple | 29.73 | 29.73 | 29.73 | 100.0% |
| TypeScript Simple | 94.71 | 94.71 | 94.71 | 100.0% |
| Vue Simple | 47.96 | 47.96 | 47.96 | 100.0% |
| preCompileVue Direct | 9.66 | 9.66 | 9.66 | 100.0% |
| preCompileTS Direct | 19.19 | 19.19 | 19.19 | 100.0% |
| Batch Compilation | 119.20 | 119.20 | 119.20 | 100.0% |
| Memory Usage | 11.17 | 11.17 | 11.17 | 100.0% |
| Concurrent Compilation | 29.32 | 29.32 | 29.32 | 100.0% |
| Large File Compilation | 371.47 | 371.47 | 371.47 | 100.0% |
| Performance Baseline | 4.09 | 4.09 | 4.09 | 100.0% |
| Performance Consistency | 6.64 | 6.64 | 6.64 | 100.0% |

---

*Report generated automatically by VersaCompiler Performance Testing System*
