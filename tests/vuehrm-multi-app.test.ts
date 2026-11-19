import { afterEach, describe, expect, it, vi } from 'vitest';
import { reloadComponent } from '../src/hrm/VueHRM.js';

// Regresión: la página monta varias apps Vue (la de la página y otras chicas
// en la barra superior). El HMR solo buscaba el componente en la primera app
// del DOM, así que editar un componente de la página no hacía nada.

vi.mock('../src/hrm/getInstanciaVue.js', () => ({
    obtenerInstanciaVue: vi.fn(),
}));

// Date.now está fijo, así que la URL del import es determinista
vi.mock('http://localhost:3000/components/Tabla.js?t=1234567890', () => ({
    default: { name: 'Tabla', render: () => null },
}));

const componente = (name: string) => ({
    type: { name },
    subTree: { type: { name: 'div' }, children: [] },
    update: vi.fn(),
});

const app = (rootName: string, ...hijos: any[]) => ({
    _instance: {
        type: { name: rootName },
        subTree: {
            type: { name: 'div' },
            children: hijos.map(component => ({
                type: component.type,
                component,
            })),
        },
    },
});

describe('VueHRM - varias apps montadas', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        delete (globalThis as any).window;
        delete (globalThis as any).document;
    });

    it('actualiza el componente en todas las apps, no solo en la primera', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(1234567890);
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        const campana = app('Campana', componente('Icono'));
        const tablaPagina = componente('Tabla');
        const pagina = app('App', tablaPagina);
        const tablaModal = componente('Tabla');
        const modal = app('Modal', tablaModal);

        (globalThis as any).window = {
            location: {
                href: 'http://localhost:3000/',
                origin: 'http://localhost:3000',
                reload: vi.fn(),
            },
        };
        // Contenedores en orden de DOM: la barra va antes que la página
        const contenedores = [campana, pagina, modal].map(a => ({
            __vue_app__: a,
        }));
        (globalThis as any).document = {
            querySelectorAll: (sel: string) =>
                sel === '[data-v-app]' ? contenedores : [],
        };

        // Lo que recibe reloadComponent hoy: la primera app encontrada
        const result = await reloadComponent(campana as any, {
            normalizedPath: 'components/Tabla.js',
            nameFile: 'Tabla',
        });

        expect(result).toBe(true);
        expect(tablaPagina.update).toHaveBeenCalled();
        expect(tablaModal.update).toHaveBeenCalled();
    });
});
