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
};

export const defineConfig = (config: VersaConfig) => config;
