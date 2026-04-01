export type LinterConfig = {
    name: string;
    bin: string;
    configFile: string;
    fix?: boolean;
    paths?: string[];
};

export type BundlerEntry = {
    name: string;
    fileInput: string;
    fileOutput: string;
};

export type VersaConfig = {
    root: string;
    build: {
        outDir: string;
        bundlers?: BundlerEntry[] | false;
    };
    resolve: {
        alias: Record<string, string | string[]>;
    };
    server?: {
        proxyUrl?: string;
        assetsOmit?: boolean;
        watch?: {
            additional?: string[];
        };
    };
    watch?: {
        additional?: string[];
    };
    plugins?: unknown[];
    tsconfig?: string;
    tailwindConfig?:
        | {
              bin: string;
              input: string;
              output: string;
          }
        | false;
    linter?: LinterConfig[] | false;
    typeCheckOptions?: {
        maxWorkers?: number;
    };
    /**
     * Controla la inyección del shim HMR en archivos compilados.
     * Establecer en `false` para deshabilitar globalmente (ej. builds de librería Node.js).
     * Para excluir archivos individuales usa `hmrExclude`.
     * @default true
     */
    hmr?: boolean;
    /**
     * Lista de patrones de archivos de **salida** que no recibirán el shim HMR.
     * Útil cuando un archivo compilado se carga con `<script src="...">` en lugar
     * de `<script type="module" src="...">`, evitando el error:
     * `SyntaxError: Cannot use 'import.meta' outside a module`
     *
     * El resto de archivos sigue recibiendo HMR normalmente.
     *
     * Acepta nombres de archivo (`'early-init.js'`), sufijos de ruta
     * (`'js/early-init.js'`) o patrones glob simples (`'*.legacy.js'`).
     * @example ['early-init.js', 'vendor.js']
     * @default []
     */
    hmrExclude?: string[];
};

export const defineConfig = (config: VersaConfig) => config;
