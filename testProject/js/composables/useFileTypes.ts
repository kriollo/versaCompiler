// Tipos y datos de archivos soportados
export interface FileType {
    ext: string;
    icon: string;
    color: string;
    type: string;
}

const fileTypes: FileType[] = [
    { ext: 'jpg', icon: 'bi bi-image', color: 'text-green-800', type: 'image/jpeg' },
    { ext: 'jpeg', icon: 'bi bi-image', color: 'text-green-800', type: 'image/jpeg' },
    { ext: 'png', icon: 'bi bi-image', color: 'text-green-800', type: 'image/png' },
    { ext: 'svg', icon: 'bi bi-image', color: 'text-green-800', type: 'image/svg+xml' },
    { ext: 'gif', icon: 'bi bi-image', color: 'text-green-800', type: 'image/gif' },
    { ext: 'pdf', icon: 'bi bi-file-earmark-pdf', color: 'text-red-800', type: 'application/pdf' },
    { ext: 'doc', icon: 'bi bi-file-earmark-word', color: 'text-blue-800', type: 'application/msword' },
    {
        ext: 'docx',
        icon: 'bi bi-file-earmark-word',
        color: 'text-blue-800',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    { ext: 'xls', icon: 'bi bi-file-earmark-excel', color: 'text-green-800', type: 'application/vnd.ms-excel' },
    {
        ext: 'xlsx',
        icon: 'bi bi-file-earmark-excel',
        color: 'text-green-800',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    { ext: 'ppt', icon: 'bi bi-file-earmark-ppt', color: 'text-red-800', type: 'application/vnd.ms-powerpoint' },
    {
        ext: 'pptx',
        icon: 'bi bi-file-earmark-ppt',
        color: 'text-red-800',
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    },
    { ext: 'zip', icon: 'bi bi-file-earmark-zip', color: 'text-yellow-800', type: 'application/zip' },
    { ext: 'rar', icon: 'bi bi-file-earmark-zip', color: 'text-yellow-800', type: 'application/x-rar-compressed' },
    { ext: 'mp3', icon: 'bi bi-file-earmark-music', color: 'text-yellow-800', type: 'audio/mpeg' },
    { ext: 'mp4', icon: 'bi bi-file-earmark-play', color: 'text-yellow-800', type: 'video/mp4' },
    { ext: 'txt', icon: 'bi bi-file-earmark-text', color: 'text-yellow-800', type: 'text/plain' },
    { ext: 'csv', icon: 'bi bi-file-earmark-excel', color: 'text-yellow-800', type: 'text/csv' },
];

// Devuelve la clase de icono (con color) según la extensión, compatible con dark mode
function obtenerIconoArchivo(extension: string): string {
    const ext = extension.toLowerCase();
    const tipo = fileTypes.find(f => f.ext === ext);
    if (!tipo) {
        return 'bi bi-file-earmark text-gray-500 dark:text-gray-400';
    }
    // Mapeo de colores para dark mode
    const colorMap: Record<string, string> = {
        'text-green-800': 'text-cyan-600 dark:text-cyan-400',
        'text-red-800': 'text-red-600 dark:text-red-400',
        'text-blue-800': 'text-blue-600 dark:text-blue-400',
        'text-yellow-800': 'text-yellow-600 dark:text-yellow-400',
    };
    const color = colorMap[tipo.color] || 'text-gray-600 dark:text-gray-400';
    return `${tipo.icon} ${color}`;
}

// Formatea el tamaño de bytes a una cadena legible
function formatearTamano(bytes: number): string {
    if (Number.isNaN(bytes) || bytes < 0) {
        return '0 B';
    }
    const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
    let tamano = bytes;
    let unidadIndex = 0;
    while (tamano >= 1024 && unidadIndex < unidades.length - 1) {
        tamano /= 1024;
        unidadIndex++;
    }
    return `${Math.round(tamano * 100) / 100} ${unidades[unidadIndex]}`;
}

// Composable principal
export function useFileTypes(): {
    fileTypes: FileType[];
    obtenerIconoArchivo: (extension: string) => string;
    formatearTamano: (bytes: number) => string;
} {
    return {
        fileTypes,
        obtenerIconoArchivo,
        formatearTamano,
    };
}
