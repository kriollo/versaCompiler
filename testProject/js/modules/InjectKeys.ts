import createInjection from '@/dashboard/js/composables/injectStrict';

// Import type { InjectionKey } from 'vue';

export interface ItemSubModule {
    id_menu: number;
    action: 'create' | 'edit';
    nombre: string;
    descripcion: string;
    url: string;
    estado: boolean;
    csrf_token: string | undefined;
}

interface ShowModalSubForm {
    showModalSubForm: boolean;
    itemSelected: ItemSubModule | null;
    action: string;
}

const ShowModalSubFormInjection = createInjection<ShowModalSubForm>('ShowModalSubForm');

export interface itemSelectedType {
    id: number | null;
    action: 'create' | 'edit';
    seccion: string;
    nombre: string;
    descripcion: string;
    icono: string;
    fill: boolean;
    url: string;
    estado: boolean;
    csrf_token: string | undefined;
}

interface ShowModalForm {
    showModalForm: boolean;
    itemSelected: itemSelectedType | null;
    action: string;
}

const ShowModalFormInjection = createInjection<ShowModalForm>('ShowModalForm');

export { ShowModalFormInjection, ShowModalSubFormInjection, type ShowModalForm, type ShowModalSubForm };
