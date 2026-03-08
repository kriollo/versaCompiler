import { type Component, markRaw } from 'vue';

import type { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import type { NodeModule } from './baseNode';

export type NodeModuleLoader = () => Promise<{ default: NodeModule }>;

class NodeRegistry {
    private modules = new Map<NodeType, NodeModule>();

    private loaders = new Map<NodeType, NodeModuleLoader>();

    /**
     * Registra un nuevo módulo de nodo (síncrono)
     */
    register(module: NodeModule) {
        // Usamos markRaw para que Vue no intente hacer reactivos los componentes inyectados
        const rawModule = {
            ...module,
            editor: markRaw(module.editor),
            visual: module.visual ? markRaw(module.visual) : undefined,
        };
        this.modules.set(module.type, rawModule);
    }

    /**
     * Registra un cargador asíncrono para un módulo
     */
    registerLoader(type: NodeType, loader: NodeModuleLoader) {
        this.loaders.set(type, loader);
    }

    /**
     * Obtiene un módulo por su tipo (asíncrono)
     */
    async get(type: NodeType): Promise<NodeModule | undefined> {
        if (this.modules.has(type)) {
            return this.modules.get(type);
        }

        const loader = this.loaders.get(type);
        if (loader) {
            try {
                const moduleImport = await loader();
                const module = moduleImport.default;
                this.register(module);
                return this.modules.get(type);
            } catch (error) {
                console.error(`Error loading node module for type ${type}:`, error);
                return undefined;
            }
        }

        return undefined;
    }

    /**
     * Obtiene el componente editor de un nodo (asíncrono)
     */
    async getEditor(type: NodeType): Promise<Component | undefined> {
        const module = await this.get(type);
        return module?.editor;
    }

    /**
     * Obtiene la función de ejecución de un nodo (asíncrono)
     */
    async getExecute(type: NodeType): Promise<NodeModule['execute'] | undefined> {
        const module = await this.get(type);
        return module?.execute;
    }

    /**
     * Obtiene todos los tipos registrados (tanto síncronos como asíncronos)
     */
    getRegisteredTypes(): NodeType[] {
        const types = new Set([...this.modules.keys(), ...this.loaders.keys()]);
        return [...types];
    }

    /**
     * Verifica si un tipo de nodo está registrado
     */
    has(type: NodeType): boolean {
        return this.modules.has(type) || this.loaders.has(type);
    }
}

// Exportamos una instancia única (Singleton)
// oxlint-disable-next-line import/prefer-default-export
export const nodeRegistry = new NodeRegistry();
