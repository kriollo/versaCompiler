export type ModuleNode = {
    id: string;
    importers: Set<string>;
    imports: Set<string>;
    lastUpdated: number;
};

export class ModuleGraph {
    private nodes = new Map<string, ModuleNode>();

    getNode(id: string): ModuleNode | undefined {
        return this.nodes.get(id);
    }

    ensureNode(id: string): ModuleNode {
        const existing = this.nodes.get(id);
        if (existing) return existing;
        const node: ModuleNode = {
            id,
            importers: new Set(),
            imports: new Set(),
            lastUpdated: Date.now(),
        };
        this.nodes.set(id, node);
        return node;
    }

    updateImports(id: string, imports: Iterable<string>): void {
        const node = this.ensureNode(id);
        node.imports.clear();
        for (const dep of imports) {
            node.imports.add(dep);
            const depNode = this.ensureNode(dep);
            depNode.importers.add(id);
        }
        node.lastUpdated = Date.now();
    }

    invalidate(id: string): string[] {
        const invalidated = new Set<string>();
        const queue: string[] = [id];
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (invalidated.has(current)) continue;
            invalidated.add(current);
            const node = this.nodes.get(current);
            if (!node) continue;
            for (const importer of node.importers) {
                queue.push(importer);
            }
        }
        return Array.from(invalidated);
    }

    remove(id: string): void {
        const node = this.nodes.get(id);
        if (!node) return;
        for (const dep of node.imports) {
            const depNode = this.nodes.get(dep);
            if (depNode) depNode.importers.delete(id);
        }
        for (const importer of node.importers) {
            const importerNode = this.nodes.get(importer);
            if (importerNode) importerNode.imports.delete(id);
        }
        this.nodes.delete(id);
    }
}
