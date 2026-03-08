import { useFileTypes } from '@/dashboard/js/composables/useFileTypes';
import { GLOBAL_CONSTANTS } from '@/dashboard/js/constants';

/**
 * Comprueba si un archivo es válido según una lista de tipos de archivo permitidos.
 * @param filesPermitidos - La lista de extensiones permitidas (ej: ['pdf','jpg'])
 * @param file - El archivo a comprobar
 * @returns true si el archivo es válido, false si no
 */
export const useValidFile = (filesPermitidos: string[], file: File): boolean => {
    const { fileTypes } = useFileTypes();
    // Buscar por tipo MIME o por extensión
    const fileType = fileTypes.find(item => item.type === file.type);
    const ext = fileType ? fileType.ext : file.name.split('.').pop()?.toLowerCase();
    if (!ext) {
        return false;
    }
    return filesPermitidos.includes(ext);
};

/**
 * Verifica si el tamaño de un archivo es menor o igual al máximo permitido (en MB)
 * @param file - Archivo a validar
 * @param size - Tamaño máximo en MB
 * @returns true si el archivo cumple, false si no
 */
export const useFileZise = (file: File, size: number): boolean => {
    const fileSize = file.size / GLOBAL_CONSTANTS.MILLION;
    return fileSize <= size;
};
