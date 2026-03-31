export type ResolveArgs = {
    path: string;
    importer?: string;
    kind: 'entry' | 'import' | 'dynamic-import';
};

export type ResolveResult = {
    path?: string;
    external?: boolean;
    errors?: string[];
};

export type LoadArgs = {
    path: string;
};

export type LoadResult = {
    contents?: string;
    loader?: 'js' | 'ts' | 'vue' | 'json' | 'css' | 'text';
    meta?: Record<string, unknown>;
    errors?: string[];
};

export type TransformArgs = {
    path: string;
    contents: string;
    loader: 'js' | 'ts' | 'vue' | 'json' | 'css' | 'text';
    meta?: Record<string, unknown>;
};

export type TransformResult = {
    contents?: string;
    loader?: 'js' | 'ts' | 'vue' | 'json' | 'css' | 'text';
    meta?: Record<string, unknown>;
    errors?: string[];
};

export type HotUpdateArgs = {
    path: string;
    type: 'add' | 'change' | 'unlink';
};

export type HotUpdateResult = {
    reload?: 'none' | 'module' | 'full';
    errors?: string[];
};

export type EndArgs = {
    errors: string[];
};

export type Plugin = {
    name: string;
    onResolve?: (args: ResolveArgs) => Promise<ResolveResult> | ResolveResult;
    onLoad?: (args: LoadArgs) => Promise<LoadResult> | LoadResult;
    onTransform?: (
        args: TransformArgs,
    ) => Promise<TransformResult> | TransformResult;
    onHotUpdate?: (
        args: HotUpdateArgs,
    ) => Promise<HotUpdateResult> | HotUpdateResult;
    onEnd?: (args: EndArgs) => Promise<void> | void;
};

export type BuildResult = {
    errors: string[];
};
