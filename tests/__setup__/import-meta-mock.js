// Mock global para import.meta en Jest
Object.defineProperty(globalThis, 'import.meta', {
  value: { url: 'file://' + process.cwd() + '/src/compiler/compile.ts' },
  configurable: true,
});
