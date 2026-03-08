import createInjection from '@/dashboard/js/composables/injectStrict';

export interface Factura {
    id?: number;
    id_empresa?: number;
    numero_factura?: string;
    periodo_mes?: number;
    periodo_anio?: number;
    subtotal?: number;
    impuestos?: number;
    total?: number;
    moneda?: string;
    estado?: 'pendiente' | 'pagada' | 'vencida' | 'cancelada';
    fecha_emision?: string;
    fecha_vencimiento?: string;
    fecha_pago?: string;
    notas?: string;
    metodo_pago?: string;
    referencia_pago?: string;
    items?: FacturaItem[];
    empresa_nombre?: string;
    empresa_ruc?: string;
    empresa_email?: string;
    empresa_direccion?: string;
}

export interface FacturaItem {
    id?: number;
    id_factura?: number;
    tipo?: 'plan_base' | 'adicional' | 'consumo' | 'descuento' | 'otros';
    descripcion?: string;
    cantidad?: number;
    precio_unitario?: number;
    subtotal?: number;
    detalles?: string;
}

export interface ConsumoMes {
    plan?: {
        nombre: string;
        descripcion: string;
        tipo_plan: string;
        precio_por_video: number;
        precio_mensual: number;
        moneda: string;
        max_campanas_activas: number;
        max_videos_por_campana: number;
        max_usuarios_admin: number;
    };
    consumo?: {
        campanas_activas: number;
        total_videos: number;
        videos_aprobados: number;
        videos_rechazados: number;
        limite_campanas: number;
        limite_videos_por_campana: number;
        costo_videos: number;
    };
    adicionales?: {
        id: number;
        id_empresa: number;
        descripcion: string;
        valor: number;
        moneda: string;
        estado: boolean;
    }[];
    periodo?: {
        mes: number;
        anio: number;
    };
}

export interface showModalFactura {
    show: boolean;
    itemSelected: Factura;
    loading: boolean;
}

export const factura: Factura = {
    id: 0,
    numero_factura: '',
    periodo_mes: new Date().getMonth() + 1,
    periodo_anio: new Date().getFullYear(),
    subtotal: 0,
    impuestos: 0,
    total: 0,
    moneda: 'USD',
    estado: 'pendiente',
};

export const useModalFactura = createInjection<showModalFactura>('showModalFactura');
