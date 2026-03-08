// Ajustar el manejo de cookies para eliminar el uso directo de `document.cookie`
const CookieManager = {
    /**
     * Obtiene el valor de una cookie por su nombre.
     * @param name Nombre de la cookie.
     * @returns Valor de la cookie como el tipo especificado o null si no existe.
     */
    async get<T = string>(name: string): Promise<T | null> {
        if ('cookieStore' in window) {
            const cookie = await (window as any).cookieStore.get(name);
            try {
                return cookie?.value ? (JSON.parse(cookie.value) as T) : null;
            } catch {
                return (cookie?.value as T) || null;
            }
        }

        return null;
    },

    /**
     * Establece una cookie con opciones avanzadas.
     * @param name Nombre de la cookie.
     * @param value Valor de la cookie.
     * @param options Opciones avanzadas para la cookie.
     */
    async set(
        name: string,
        value: string,
        options: { expires?: number | Date; path?: string; domain?: string; secure?: boolean } = {},
    ): Promise<void> {
        if ('cookieStore' in window) {
            const cookieOptions: any = { name, value };

            if (options.expires) {
                cookieOptions.expires =
                    options.expires instanceof Date ? options.expires : new Date(Date.now() + options.expires * 1000);
            }

            if (options.path) {
                cookieOptions.path = options.path;
            }

            if (options.domain) {
                cookieOptions.domain = options.domain;
            }

            if (options.secure) {
                cookieOptions.secure = options.secure;
            }

            await (window as any).cookieStore.set(cookieOptions);
        }
    },

    /**
     * Elimina una cookie por su nombre.
     * @param name Nombre de la cookie.
     */
    async delete(name: string): Promise<void> {
        if ('cookieStore' in window) {
            await (window as any).cookieStore.delete(name);
        }
    },

    /**
     * Obtiene todas las cookies disponibles.
     * @returns Un objeto con todas las cookies en formato clave-valor.
     */
    async getAll(): Promise<Record<string, string>> {
        if ('cookieStore' in window) {
            const cookies = await (window as any).cookieStore.getAll();
            return cookies.reduce((acc: Record<string, string>, cookie: any) => {
                acc[cookie.name] = cookie.value;
                return acc;
            }, {});
        }

        return {};
    },

    async find(name: string): Promise<boolean> {
        const cookie = await this.get(name);
        return cookie !== '';
    },
};

export default CookieManager;
