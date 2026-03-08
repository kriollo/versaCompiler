import createInjection from '@/dashboard/js/composables/injectStrict';

export interface Plan {
    id: number;
    nombre: string;
    descripcion: string;
    tipo_plan: string;

    // Duración y vigencia
    duracion_almacenamiento_dias: number;

    // Moderación IA
    moderacion_ia: boolean;

    // Duración de videos
    duracion_video_min_segundos: number;
    duracion_video_max_segundos: number;

    // Videos rechazados
    tiempo_vida_rechazado_dias: number;

    // Límites de videos
    max_videos_por_campana: number | null;
    max_tamano_video_mb: number;

    // Usuarios y soporte
    max_usuarios_admin: number;
    nivel_soporte: string;

    // Costos
    precio_mensual: number;
    moneda: string;

    // Estado
    estado: boolean;
    csrf_token?: string;
}

export interface ShowModalPlan {
    show: boolean;
    itemSelected: Plan;
}

export const plan: Plan = {
    id: 0,
    nombre: '',
    descripcion: '',
    tipo_plan: 'mensual',

    duracion_almacenamiento_dias: 30,
    moderacion_ia: false,
    duracion_video_min_segundos: 10,
    duracion_video_max_segundos: 15,
    tiempo_vida_rechazado_dias: 0,
    max_videos_por_campana: null,

    max_tamano_video_mb: 100,

    max_usuarios_admin: 1,
    nivel_soporte: 'basico',
    precio_mensual: 0,
    moneda: 'CLP',
    estado: true,
    csrf_token: undefined,
};

export const useModalPlan = createInjection<ShowModalPlan>('ShowModalPlan');

export const tiposPlan = [
    { value: 'mensual', label: 'Plan Mensual' },
    { value: 'transaccional', label: 'Plan Transaccional (por video)' },
];

export const nivelesSoporte = [
    { value: 'basico', label: 'Básico' },
    { value: 'premium', label: 'Premium' },
    { value: 'enterprise', label: 'Enterprise' },
];

export const monedasDisponibles = [
    { value: 'CLP', label: 'CLP - Peso Chileno' },
    { value: 'USD', label: 'USD - Dólar Americano' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'ARS', label: 'ARS - Peso Argentino' },
    { value: 'MXN', label: 'MXN - Peso Mexicano' },
];
