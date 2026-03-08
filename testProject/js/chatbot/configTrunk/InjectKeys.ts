import createInjection from '@/dashboard/js/composables/injectStrict';

export interface ChannelField {
    key: string;
    name: string;
    value: string;
    type: string;
    required: boolean;
    class?: string;
}

export interface Channel {
    id: number;
    codigo_interno: string;
    nombre: string;
    imagen: string;
    required_register: boolean;
    count?: number;
    settings: ChannelField[];
}

export interface ChannelSelected {
    value: Channel;
}

export const channelSelectedInjection = createInjection<ChannelSelected>('ChannelSelected');

export interface Trunk {
    id: number;
    action: string;
    nombre: string;
    descripcion: string;
    flow_id?: number | null;
    token: string;
    url_webhook: string;
    token_trunk: string;
    created_at: string;
    updated_at: string;
    csrf_token: string;
    estado?: boolean;
    verificado?: boolean;
    access_token?: string;
    settings: Record<string, string>;
}

export interface ShowModalFormTrunk {
    showModal: boolean;
    itemSelected: Trunk | null;
    action: string;
}
export const FormTrunkInjection = createInjection<ShowModalFormTrunk>('FormTrunk');
