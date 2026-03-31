# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

This project uses **pnpm** (v10.15). Always use `pnpm` instead of `npm` or `yarn`.

## Commands

```bash
# Development (runs src/main.ts with watch + tailwind)
pnpm dev

# Build the compiler itself (compiles src/ → dist/)
pnpm build

# Run tests (single run)
pnpm test

# Tests in watch mode
pnpm test:watch

# Tests with coverage
pnpm test:coverage

# Run a single test file
pnpm exec vitest run tests/<test-file>.test.ts

# Lint with oxlint (fast, auto-fix)
pnpm lint

# Lint with ESLint
pnpm lint:eslint

# Compile with linting + type check + integrity check
pnpm compileDev
```

## Architecture Overview

VersaCompiler is a CLI build tool (Node.js/TypeScript ESM) that compiles Vue 3 SFCs, TypeScript, and JavaScript files with HMR, linting, and minification. It is both used to build itself (`pnpm build` runs `src/main.ts --all`) and distributed as a CLI package.

### Entry Point & CLI

`src/main.ts` — parses CLI args with yargs and dispatches to compiler modules. Uses **lazy loading** for all heavy dependencies (chalk, yargs, compiler modules) to minimize startup time. Sets environment variables (`env.isPROD`, `env.TAILWIND`, `env.VERBOSE`, etc.) consumed throughout the codebase.

### Source Directories

| Directory        | Purpose                                                                     |
| ---------------- | --------------------------------------------------------------------------- |
| `src/compiler/`  | Core compilation logic                                                      |
| `src/servicios/` | Infrastructure services (logger, config reader, browser-sync, file watcher) |
| `src/hrm/`       | HMR client-side scripts injected into the browser                           |
| `src/utils/`     | Shared utilities, module resolver, prompt helper                            |
| `src/types/`     | TypeScript type definitions                                                 |
| `src/wrappers/`  | Thin wrappers for excluded modules and Vue types setup                      |

### Key Compiler Files

- **`src/compiler/compile.ts`** — Main orchestrator. Contains `OptimizedModuleManager` (lazy module pool), `initCompileAll()`, `compileFile()`, `runLinter()`. All heavy imports are deferred here.
- **`src/compiler/vuejs.ts`** — Vue SFC compilation using `@vue/compiler-sfc`: script, template, styles (scoped/CSS modules/SCSS), custom blocks.
- **`src/compiler/transformTStoJS.ts`** — TypeScript→JavaScript transpilation via oxc-transform.
- **`src/compiler/typescript-compiler.ts`** — Full type checking via TypeScript Language Service Host (spawns worker threads).
- **`src/compiler/typescript-worker-pool.ts`** / **`typescript-worker.ts`** — Worker thread pool for parallel type validation.
- **`src/compiler/minify.ts`** — OxcMinify-based minification for `--prod` builds.
- **`src/compiler/integrity-validator.ts`** — 4-level post-compilation integrity checks (size, exports, syntax via oxc-parser). Has LRU cache.
- **`src/compiler/linter.ts`** — Runs ESLint and/or OxLint as child processes.
- **`src/compiler/transforms.ts`** — Code transformations (import alias resolution, path rewrites).
- **`src/compiler/parser.ts`** — File parsing utilities.
- **`src/compiler/error-reporter.ts`** — Formats compiler errors for display.
- **`src/servicios/readConfig.ts`** — Loads and validates `versacompile.config.ts` from the project root.
- **`src/servicios/file-watcher.ts`** — Chokidar-based file watcher; triggers recompilation on changes.
- **`src/servicios/browserSync.ts`** — BrowserSync server setup for HMR in watch mode.

### Configuration

VersaCompiler reads `versacompile.config.ts` from the **consumer project's root** (not its own root). The repo's own `versacompile.config.ts` is used when compiling `examples/`. Key config fields:

- `compilerOptions.sourceRoot` / `outDir` — input/output directories
- `compilerOptions.pathsAlias` — import alias map
- `tailwindConfig` — TailwindCSS binary and I/O paths
- `linter[]` — array of ESLint/OxLint configs
- `bundlers[]` — post-compilation bundle specs
- `aditionalWatch` — extra glob patterns for watch mode

### TypeScript Configuration

- `tsconfig.json` — main config for `src/` and `examples/`; `noEmit: true` (type-checking only)
- `tsconfig.build.json` — used during the build process
- `tsconfig.vitest.json` — test-specific overrides
- Strict mode enabled with `strictNullChecks`, `noUncheckedIndexedAccess`, etc.
- `experimentalDecorators` and `emitDecoratorMetadata` are enabled

### Testing

Tests live in `tests/` and run with **Vitest** using `pool: 'forks'` with `singleFork: true` (important: the TypeScript worker pool detects the test environment and falls back to synchronous validation to avoid nested worker threads). Test timeout is 30 seconds. Path aliases `@/`, `@compiler/`, `@utils/`, `@servicios/` resolve to `src/` subdirectories.

### Environment Variables (runtime)

The compiler communicates between modules via `process.env`:

- `env.isPROD` — production mode
- `env.VERBOSE` — verbose logging
- `env.TAILWIND` — enable TailwindCSS
- `env.ENABLE_LINTER` — enable linting
- `env.typeCheck` — enable TypeScript type checking
- `env.CHECK_INTEGRITY` — enable integrity validation
- `env.PATH_PROY` — path to `src/` directory
- `env.PATH_DIST` — output directory
- `env.PATH_CONFIG_FILE` — absolute path to `versacompile.config.ts`
