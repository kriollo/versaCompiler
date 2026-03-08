// Tipos TypeScript para el módulo de documentos

export interface Documento {
    id: number;
    nombre_original: string;
    nombre_archivo: string;
    descripcion?: string;
    tipo_archivo: string;
    tamano: number;
    ruta_archivo: string;
    carpeta_id: number;
    empresa_id: number;
    subido_por: number;
    fecha_subida: string;
    visto_por_cliente: boolean;
    metadata?: any;
    created_at: string;
    updated_at: string;
}

export interface Carpeta {
    id: number;
    nombre: string;
    descripcion?: string;
    carpeta_padre_id?: number;
    empresa_id: number;
    created_at: string;
    updated_at: string;
    hijos?: Carpeta[];
    documentos?: Documento[];
}

export interface EnlaceCompartido {
    id: number;
    documento_id: number;
    token: string;
    fecha_creacion: string;
    fecha_expiracion?: string;
    documento: Documento;
}

export interface EstadisticasDocumentos {
    total_documentos: number;
    total_carpetas: number;
    tamano_total: number;
    tamano_total_formateado: string;
    documentos_mes_actual: number;
    documentos_no_vistos: number;
}

export interface AuditoriaDocumento {
    id: number;
    documento_id: number;
    usuario_id: number;
    accion: 'subir' | 'descargar' | 'eliminar' | 'compartir' | 'ver';
    fecha: string;
    ip_address: string;
    user_agent: string;
    documento: Documento;
    usuario: {
        id: number;
        nombre: string;
        email: string;
    };
}

export interface ConfiguracionCompartir {
    duracion: number; // En horas
    requiere_password: boolean;
    password?: string;
    permitir_descarga: boolean;
}

export interface FiltrosDocumento {
    carpeta_id?: number;
    tipo_archivo?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    busqueda?: string;
    solo_no_vistos?: boolean;
}

export interface NotificacionToast {
    id: number;
    tipo: 'success' | 'error' | 'warning' | 'info';
    mensaje: string;
}

export interface RespuestaAPI<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Eventos de los componentes
export interface EventosDocumentoList {
    seleccionar: [documento: Documento];
    eliminar: [documentoId: number];
    descargar: [documentoId: number];
    previsualizar: [documento: Documento];
    compartir: [documento: Documento];
    marcarVisto: [documentoId: number];
    editarDescripcion: [documento: Documento, nuevaDescripcion: string];
}

export interface EventosFileExplorer {
    seleccionarCarpeta: [carpetaId: number];
    crearCarpeta: [nombre: string, carpetaPadreId?: number];
    editarCarpeta: [carpetaId: number, nuevoNombre: string];
    eliminarCarpeta: [carpetaId: number];
}

export interface EventosUploadModal {
    subir: [archivos: File[], carpetaId: number];
    cerrar: [];
}

export interface EventosCompartirModal {
    compartir: [configuracion: ConfiguracionCompartir];
    cerrar: [];
}

export interface EventosPreviewModal {
    cerrar: [];
    descargar: [documentoId: number];
    compartir: [documento: Documento];
}

// Constantes
export const TIPOS_ARCHIVO_PERMITIDOS = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
];

export const TAMANO_MAXIMO_ARCHIVO = 50 * 1024 * 1024; // 50MB

export const EXTENSIONES_PREVISUALIZABLE = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'csv'];

export const DURACIONES_ENLACE = [
    { valor: 1, texto: '1 hora' },
    { valor: 6, texto: '6 horas' },
    { valor: 24, texto: '1 día' },
    { valor: 72, texto: '3 días' },
    { valor: 168, texto: '1 semana' },
    { valor: 720, texto: '1 mes' },
    { valor: 0, texto: 'Sin expiración' },
];
