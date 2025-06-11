# VersaCompiler Performance Report

Generated: 10/6/2025

## 📊 Summary

- **Total Tests**: 11
- **Passed Tests**: 11
- **Success Rate**: 100.0%
- **Average Performance**: 43.36ms
- **Total Time**: 477.01ms

## 🖥️ Environment

- **Node.js**: v23.11.0
- **Platform**: win32 x64
- **CPUs**: 8
- **Memory**: 31.4 GB


## 🚀 Performance Highlights

**Fastest Test**: Performance Baseline (4.11ms)

**Slowest Test**: Large File Compilation (150.72ms)

## 📈 Changes Since Last Run

### ⚠️ Regressions
- **preCompileVue Direct**: +17.3% (6.20ms → 7.27ms)
- **Memory Usage**: +10.1% (8.65ms → 9.52ms)
- **Concurrent Compilation**: +11.6% (23.73ms → 26.47ms)
- **Large File Compilation**: +22.9% (122.68ms → 150.72ms)
- **Performance Baseline**: +16.3% (3.53ms → 4.11ms)

### 🎯 Improvements
📊 No significant improvements

## 📋 Detailed Results

| Test Name | Avg (ms) | Min (ms) | Max (ms) | Success Rate |
|-----------|----------|----------|----------|--------------|
| JavaScript Simple | 29.57 | 29.57 | 29.57 | 100.0% |
| TypeScript Simple | 95.88 | 95.88 | 95.88 | 100.0% |
| Vue Simple | 47.90 | 47.90 | 47.90 | 100.0% |
| preCompileVue Direct | 7.27 | 7.27 | 7.27 | 100.0% |
| preCompileTS Direct | 15.93 | 15.93 | 15.93 | 100.0% |
| Batch Compilation | 82.76 | 82.76 | 82.76 | 100.0% |
| Memory Usage | 9.52 | 9.52 | 9.52 | 100.0% |
| Concurrent Compilation | 26.47 | 26.47 | 26.47 | 100.0% |
| Large File Compilation | 150.72 | 150.72 | 150.72 | 100.0% |
| Performance Baseline | 4.11 | 4.11 | 4.11 | 100.0% |
| Performance Consistency | 6.88 | 6.88 | 6.88 | 100.0% |

---

*Report generated automatically by VersaCompiler Performance Testing System*
