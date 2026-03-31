import type {
    BuildResult,
    EndArgs,
    HotUpdateArgs,
    HotUpdateResult,
    LoadArgs,
    LoadResult,
    Plugin,
    ResolveArgs,
    ResolveResult,
    TransformArgs,
    TransformResult,
} from './types';

export class PluginDriver {
    private readonly plugins: Plugin[];

    constructor(plugins: Plugin[]) {
        this.plugins = plugins;
    }

    async resolve(args: ResolveArgs): Promise<ResolveResult> {
        for (const plugin of this.plugins) {
            if (!plugin.onResolve) continue;
            const result = await plugin.onResolve(args);
            if (result && (result.path || result.external || result.errors)) {
                return result;
            }
        }
        return {};
    }

    async load(args: LoadArgs): Promise<LoadResult> {
        for (const plugin of this.plugins) {
            if (!plugin.onLoad) continue;
            const result = await plugin.onLoad(args);
            if (result && (result.contents || result.errors)) {
                return result;
            }
        }
        return {};
    }

    async transform(args: TransformArgs): Promise<TransformResult> {
        let current = args.contents;
        let currentLoader = args.loader;
        let currentMeta = args.meta;
        let errors: string[] = [];
        for (const plugin of this.plugins) {
            if (!plugin.onTransform) continue;
            const result = await plugin.onTransform({
                ...args,
                contents: current,
                loader: currentLoader,
                meta: currentMeta,
            });
            if (result.errors?.length) errors = errors.concat(result.errors);
            if (result.contents) current = result.contents;
            if (result.loader) currentLoader = result.loader;
            if (result.meta)
                currentMeta = {
                    ...(currentMeta || {}),
                    ...result.meta,
                };
        }
        return {
            contents: current,
            loader: currentLoader,
            meta: currentMeta,
            errors: errors.length ? errors : undefined,
        };
    }

    async hotUpdate(args: HotUpdateArgs): Promise<HotUpdateResult> {
        let reload: HotUpdateResult['reload'] = 'none';
        let errors: string[] = [];
        for (const plugin of this.plugins) {
            if (!plugin.onHotUpdate) continue;
            const result = await plugin.onHotUpdate(args);
            if (result.errors?.length) errors = errors.concat(result.errors);
            if (result.reload === 'full') reload = 'full';
            if (result.reload === 'module' && reload !== 'full')
                reload = 'module';
        }
        return { reload, errors: errors.length ? errors : undefined };
    }

    async end(errors: string[]): Promise<BuildResult> {
        const args: EndArgs = { errors };
        for (const plugin of this.plugins) {
            if (!plugin.onEnd) continue;
            await plugin.onEnd(args);
        }
        return { errors };
    }
}
