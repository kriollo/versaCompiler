import { inject, provide, reactive } from 'vue';

// =====================================================
// INTERFACES
// =====================================================

export interface AgendaHorario {
    id: number;
    nombre: string;
    hora_inicio: string;
    hora_fin: string;
    duracion_minutos: number;
    dias_semana: number[];
    estado: boolean;
    action?: 'create' | 'edit';
}

export interface AgendaDescanso {
    id?: number;
    nombre: string;
    hora_inicio: string;
    hora_fin: string;
    dias_semana: number[];
}

export interface AgendaRecurso {
    id: number;
    nombre: string;
    descripcion: string;
    email: string;
    id_horario: number;
    nombre_horario?: string;
    hora_inicio?: string;
    hora_fin?: string;
    duracion_minutos?: number;
    dias_semana?: number[];
    estado: boolean;
    descansos?: AgendaDescanso[];
    action?: 'create' | 'edit';
}

export interface AgendaCliente {
    id: number;
    rut: string;
    nombre: string;
    correo: string;
    telefono: string;
    platform?: string;
    estado: boolean;
    action?: 'create' | 'edit';
}

export interface AgendaCita {
    id: number;
    id_cliente: number;
    id_recurso: number;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    estado: 'programada' | 'confirmada' | 'cancelada' | 'completada';
    notas?: string;
    nombre_cliente?: string;
    rut_cliente?: string;
    telefono_cliente?: string;
    nombre_recurso?: string;
}

// =====================================================
// INJECTION KEYS PATTERN
// =====================================================

function createInjection<T>(key: string) {
    return {
        provide: (value: T) => provide(key, reactive(value as object) as T),
        inject: (): T => inject<T>(key) as T,
    };
}

// ---- Horario Modal ----
interface ShowModalHorario {
    show: boolean;
    item: AgendaHorario | null;
}

export const ShowModalHorarioInject = createInjection<ShowModalHorario>('agenda:modalHorario');

export const defaultHorario: AgendaHorario = {
    id: 0,
    nombre: '',
    hora_inicio: '08:00',
    hora_fin: '18:00',
    duracion_minutos: 30,
    dias_semana: [1, 2, 3, 4, 5],
    estado: true,
    action: 'create',
};

// ---- Recurso Modal ----
interface ShowModalRecurso {
    show: boolean;
    item: AgendaRecurso | null;
}

export const ShowModalRecursoInject = createInjection<ShowModalRecurso>('agenda:modalRecurso');

export const defaultRecurso: AgendaRecurso = {
    id: 0,
    nombre: '',
    descripcion: '',
    email: '',
    id_horario: 0,
    estado: true,
    descansos: [],
    action: 'create',
};

// ---- Cliente Modal ----
interface ShowModalCliente {
    show: boolean;
    item: AgendaCliente | null;
}

export const ShowModalClienteInject = createInjection<ShowModalCliente>('agenda:modalCliente');

export const defaultCliente: AgendaCliente = {
    id: 0,
    rut: '',
    nombre: '',
    correo: '',
    telefono: '',
    platform: 'whatsapp',
    estado: true,
    action: 'create',
};

// ---- Cita Modal / Wizard ----
interface ShowModalCita {
    show: boolean;
    fechaInicial?: string;
}

export const ShowModalCitaInject = createInjection<ShowModalCita>('agenda:modalCita');
