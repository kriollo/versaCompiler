import createInjection from '@/dashboard/js/composables/injectStrict';

export interface Empresa {
    action: 'create' | 'edit';
    id: number;
    rut: string;
    nombre: string;
    telefono: string;
    email: string;
    estado: boolean;
    requiere_plan: boolean;
    csrf_token: string | undefined;
    cuenta_suspendida: boolean;
    logo?: string;
}
export interface ShowModalEmpresa {
    showModalEmpresa: boolean;
    itemSelected: Empresa | null;
    action: 'create' | 'edit';
}

export interface ShowModalAsociaModulo {
    showModalAsociaModulo: boolean;
    itemSelected: Empresa | null;
}

export interface AdicionalItem {
    id?: number;
    descripcion: string;
    valor: number;
    moneda: string;
    estado: boolean;
    isEditing?: boolean;
}

export interface AdicionalFactura {
    empresa_id: number;
    showModal: boolean;
}

export interface PlanEmpresa {
    empresa_plan_id?: number;
    id_empresa: number;
    id_plan: number;
    plan_nombre: string;
    plan_descripcion?: string;
    tipo_plan: string;

    // Valores efectivos (personalizados o del plan base)
    duracion_almacenamiento_dias: number;
    moderacion_ia: boolean;
    duracion_video_min_segundos: number;
    duracion_video_max_segundos: number;
    tiempo_vida_rechazado_dias: number;
    max_videos_por_campana: number | null;
    max_campanas_activas: number | null;
    max_usuarios_admin: number;
    nivel_soporte: string;
    precio_mensual: number;
    moneda: string;

    // Valores originales del plan (para comparación)
    plan_duracion_almacenamiento_dias?: number;
    plan_moderacion_ia?: boolean;
    plan_duracion_video_min_segundos?: number;
    plan_duracion_video_max_segundos?: number;
    plan_tiempo_vida_rechazado_dias?: number;
    plan_max_videos_por_campana?: number | null;
    plan_max_campanas_activas?: number | null;
    plan_max_usuarios_admin?: number;
    plan_nivel_soporte?: string;
    plan_precio_mensual?: number;
    plan_moneda?: string;

    // Valores personalizados (null si no se personalizó)
    custom_duracion_almacenamiento_dias?: number | null;
    custom_moderacion_ia?: boolean | null;
    custom_duracion_video_min_segundos?: number | null;
    custom_duracion_video_max_segundos?: number | null;
    custom_tiempo_vida_rechazado_dias?: number | null;
    custom_max_videos_por_campana?: number | null;
    custom_max_campanas_activas?: number | null;
    custom_max_usuarios_admin?: number | null;
    custom_nivel_soporte?: string | null;
    custom_precio_mensual?: number | null;
    custom_moneda?: string | null;

    estado: boolean;
}

export interface ShowModalAsociaPlan {
    showModalAsociaPlan: boolean;
    itemSelected: Empresa | null;
}

export const empresa: Empresa = {
    action: 'create',
    id: 0,
    nombre: '',
    rut: '',
    telefono: '',
    email: '',
    estado: true,
    requiere_plan: true,
    csrf_token: undefined,
    cuenta_suspendida: false,
};

export const ShowModalEmpresaInjection = createInjection<ShowModalEmpresa>('ShowModalEmpresa');
export const showModalAsociaModuloInjection = createInjection<ShowModalAsociaModulo>('ShowModalAsociaModulo');
export const showModalAsociaPlanInjection = createInjection<ShowModalAsociaPlan>('ShowModalAsociaPlan');
export const AdicionalFacturaInjection = createInjection<AdicionalFactura>('AdicionalFactura');
