// Utilidades para el módulo de documentos

/**
 * Formatea el tamaño de archivo en bytes a una representación legible
 */
export const formatearTamanoArchivo = (bytes: number): string => {
    if (bytes === 0) {
        return '0 Bytes';
    }

    const kilobyte = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const indice = Math.floor(Math.log(bytes) / Math.log(kilobyte));

    return `${Number.parseFloat((bytes / kilobyte ** indice).toFixed(2))} ${sizes[indice]}`;
};

/**
 * Obtiene la clase de ícono Bootstrap para un tipo de archivo
 */
export const obtenerIconoArchivo = (tipoArchivo: string): string => {
    const tipo = tipoArchivo?.toLowerCase();

    if (!tipo) {
        return 'bi bi-file-earmark text-secondary';
    }

    if (tipo.includes('pdf')) {
        return 'bi bi-file-earmark-pdf text-danger';
    }
    if (
        tipo.includes('image') ||
        tipo.includes('jpg') ||
        tipo.includes('jpeg') ||
        tipo.includes('png') ||
        tipo.includes('gif')
    ) {
        return 'bi bi-file-earmark-image text-success';
    }
    if (tipo.includes('word') || tipo.includes('doc')) {
        return 'bi bi-file-earmark-word text-primary';
    }
    if (tipo.includes('excel') || tipo.includes('xls') || tipo.includes('csv')) {
        return 'bi bi-file-earmark-excel text-success';
    }
    if (tipo.includes('powerpoint') || tipo.includes('ppt')) {
        return 'bi bi-file-earmark-ppt text-warning';
    }
    if (tipo.includes('text') || tipo.includes('txt')) {
        return 'bi bi-file-earmark-text text-info';
    }
    if (tipo.includes('zip') || tipo.includes('rar') || tipo.includes('7z')) {
        return 'bi bi-file-earmark-zip text-warning';
    }
    if (tipo.includes('video')) {
        return 'bi bi-file-earmark-play text-danger';
    }
    if (tipo.includes('audio')) {
        return 'bi bi-file-earmark-music text-purple';
    }

    return 'bi bi-file-earmark text-secondary';
};

/**
 * Formatea una fecha en formato español
 */
export const formatearFecha = (fecha: string | Date): string => {
    const date = fecha instanceof Date ? fecha : new Date(fecha);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

/**
 * Formatea una hora en formato español
 */
export const formatearHora = (fecha: string | Date): string => {
    const date = fecha instanceof Date ? fecha : new Date(fecha);
    return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Formatea fecha y hora juntas
 */
export const formatearFechaHora = (fecha: string | Date): string => `${formatearFecha(fecha)} ${formatearHora(fecha)}`;

/**
 * Verifica si un enlace está expirado
 */
export const estaExpirado = (fechaExpiracion: string | null): boolean => {
    if (!fechaExpiracion) {
        return false;
    }
    return new Date(fechaExpiracion) < new Date();
};

/**
 * Verifica si un enlace expira pronto (dentro de 24 horas)
 */
export const expiraPronto = (fechaExpiracion: string | null): boolean => {
    if (!fechaExpiracion) {
        return false;
    }
    const ahora = new Date();
    const expiracion = new Date(fechaExpiracion);
    const unDiaEnMs = 24 * 60 * 60 * 1000;

    return expiracion.getTime() - ahora.getTime() <= unDiaEnMs && expiracion > ahora;
};

/**
 * Obtiene el texto de estado para un enlace compartido
 */
export const obtenerEstadoEnlace = (
    fechaExpiracion: string | null,
): {
    texto: string;
    clase: string;
} => {
    if (estaExpirado(fechaExpiracion)) {
        return { texto: 'Expirado', clase: 'bg-red-500 text-white' };
    }
    if (expiraPronto(fechaExpiracion)) {
        return { texto: 'Expira pronto', clase: 'bg-yellow-500 text-white' };
    }
    return { texto: 'Activo', clase: 'bg-green-500 text-white' };
};

/**
 * Valida que un archivo sea de un tipo permitido
 */
export const esArchivoPermitido = (tipoArchivo: string, tiposPermitidos: string[]): boolean =>
    tiposPermitidos.includes(tipoArchivo);

/**
 * Valida que un archivo no exceda el tamaño máximo
 */
export const validarTamanoArchivo = (tamano: number, tamanoMaximo: number): boolean => tamano <= tamanoMaximo;

/**
 * Determina si un archivo se puede previsualizar
 */
export const esPrevisualizable = (tipoArchivo: string): boolean => {
    const tipo = tipoArchivo?.toLowerCase();

    if (!tipo) {
        return false;
    }

    return tipo.includes('pdf') || tipo.includes('image') || tipo.includes('text') || tipo.includes('csv');
};

/**
 * Genera un token único
 */
export const generarToken = (longitud: number = 32): string => {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let resultado = '';

    for (let indice = 0; indice < longitud; indice++) {
        resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }

    return resultado;
};

/**
 * Copia texto al portapapeles
 */
export const copiarAlPortapapeles = async (texto: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(texto);
        return true;
    } catch {
        // Fallback para navegadores que no soportan clipboard API
        const elementoTexto = document.createElement('textarea');
        elementoTexto.value = texto;
        document.body.append(elementoTexto);
        elementoTexto.select();
        document.execCommand('copy');
        elementoTexto.remove();
        return true;
    }
};

/**
 * Busca una carpeta por ID en un árbol de carpetas
 */
export const buscarCarpetaEnArbol = (carpetas: any[], carpetaId: number): any | null => {
    for (const carpeta of carpetas) {
        if (carpeta.id === carpetaId) {
            return carpeta;
        }
        if (carpeta.hijos && carpeta.hijos.length > 0) {
            const resultado = buscarCarpetaEnArbol(carpeta.hijos, carpetaId);
            if (resultado) {
                return resultado;
            }
        }
    }
    return null;
};

/**
 * Función auxiliar para buscar ruta recursivamente
 */
const buscarRuta = (carpetasList: any[], targetId: number, rutaActual: string[] = []): string[] | null => {
    for (const carpeta of carpetasList) {
        const nuevaRuta = [...rutaActual, carpeta.nombre];

        if (carpeta.id === targetId) {
            return nuevaRuta;
        }

        if (carpeta.hijos && carpeta.hijos.length > 0) {
            const resultado = buscarRuta(carpeta.hijos, targetId, nuevaRuta);
            if (resultado) {
                return resultado;
            }
        }
    }
    return null;
};

/**
 * Obtiene la ruta completa de una carpeta
 */
export const obtenerRutaCarpeta = (carpetas: any[], carpetaId: number): string => {
    const ruta = buscarRuta(carpetas, carpetaId);
    return ruta ? ruta.join(' / ') : '';
};

/**
 * Debounce para búsquedas
 */
export const debounce = <ArgumentTypes extends unknown[]>(
    funcion: (...args: ArgumentTypes) => void,
    espera: number,
): ((...args: ArgumentTypes) => void) => {
    let timeout: ReturnType<typeof setTimeout> | undefined = undefined;

    return (...args: ArgumentTypes): void => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => funcion(...args), espera);
    };
};

/**
 * Convierte bytes a un tamaño legible con unidades específicas
 */
export const convertirBytes = (bytes: number, decimales: number = 2): { valor: number; unidad: string } => {
    if (bytes === 0) {
        return { valor: 0, unidad: 'Bytes' };
    }

    const kilobyte = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const indice = Math.floor(Math.log(bytes) / Math.log(kilobyte));

    return {
        valor: Number.parseFloat((bytes / kilobyte ** indice).toFixed(decimales)),
        unidad: sizes[indice] || 'Bytes', // Fallback para evitar undefined
    };
};
