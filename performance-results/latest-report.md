# VersaCompiler Performance Report

Generated: 9/6/2025

## 📊 Summary

- **Total Tests**: 11
- **Passed Tests**: 11
- **Success Rate**: 100.0%
- **Average Performance**: 73.45ms
- **Total Time**: 807.95ms

## 🖥️ Environment

- **Node.js**: v23.11.0
- **Platform**: win32 x64
- **CPUs**: 8
- **Memory**: 31.4 GB


## 🚀 Performance Highlights

**Fastest Test**: Performance Baseline (3.49ms)

**Slowest Test**: JavaScript Simple (255.34ms)

## 📈 Changes Since Last Run

### ⚠️ Regressions
- **JavaScript Simple**: +96.3% (130.08ms → 255.34ms)
- **TypeScript Simple**: +31.5% (81.39ms → 106.99ms)
- **Vue Simple**: +266.0% (19.74ms → 72.25ms)
- **Memory Usage**: +217.0% (9.92ms → 31.46ms)
- **Concurrent Compilation**: +41.0% (23.94ms → 33.77ms)
- **Performance Consistency**: +68.5% (7.54ms → 12.70ms)

### 🎯 Improvements
- **preCompileTS Direct**: 15.3% faster (17.72ms → 15.00ms)
- **Batch Compilation**: 74.0% faster (364.48ms → 94.83ms)

## 📋 Detailed Results

| Test Name | Avg (ms) | Min (ms) | Max (ms) | Success Rate |
|-----------|----------|----------|----------|--------------|
| JavaScript Simple | 255.34 | 255.34 | 255.34 | 100.0% |
| TypeScript Simple | 106.99 | 106.99 | 106.99 | 100.0% |
| Vue Simple | 72.25 | 72.25 | 72.25 | 100.0% |
| preCompileVue Direct | 7.42 | 7.42 | 7.42 | 100.0% |
| preCompileTS Direct | 15.00 | 15.00 | 15.00 | 100.0% |
| Batch Compilation | 94.83 | 94.83 | 94.83 | 100.0% |
| Memory Usage | 31.46 | 31.46 | 31.46 | 100.0% |
| Concurrent Compilation | 33.77 | 33.77 | 33.77 | 100.0% |
| Large File Compilation | 174.70 | 174.70 | 174.70 | 100.0% |
| Performance Baseline | 3.49 | 3.49 | 3.49 | 100.0% |
| Performance Consistency | 12.70 | 12.70 | 12.70 | 100.0% |

---

*Report generated automatically by VersaCompiler Performance Testing System*
