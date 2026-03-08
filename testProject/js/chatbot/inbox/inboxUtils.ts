/**
 * Utilidades puras del módulo Inbox — sin dependencias de Vue.
 * Estas funciones se usan en TicketList.vue y ChatWindow.vue.
 * Al estar aquí centralizadas, son testables con Vitest.
 */

// ─── Avatares ────────────────────────────────────────────────────────────────

/** Extrae hasta 2 iniciales del nombre completo en mayúsculas. */
export const getInitials = (name: string | null | undefined): string => {
    if (!name || typeof name !== 'string') {
        return '?';
    }
    return name
        .trim()
        .split(/\s+/)
        .filter(n => n.length > 0)
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

// ─── Colores de plataforma ────────────────────────────────────────────────────

/** Clase Tailwind de fondo según la plataforma. */
export const getPlatformColor = (platform: string): string => {
    const colors: Record<string, string> = {
        whatsapp: 'bg-green-500',
        facebook: 'bg-blue-600',
        facebookmessenger: 'bg-blue-600',
        messenger: 'bg-blue-600',
        fb_messenger: 'bg-blue-600',
        instagram: 'bg-pink-600',
        telegram: 'bg-sky-500',
        web: 'bg-gray-600',
    };
    return colors[platform] ?? 'bg-gray-500';
};

// ─── Prioridad ────────────────────────────────────────────────────────────────

/** Clases de color por prioridad del ticket. */
export const getPriorityClass = (priority: string): string => {
    const classes: Record<string, string> = {
        urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return classes[priority] ?? classes['normal'] ?? '';
};

/** Etiqueta en español para cada nivel de prioridad. */
export const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
        urgent: 'Urgente',
        high: 'Alta',
        normal: 'Normal',
        low: 'Baja',
    };
    return labels[priority] ?? priority;
};

// ─── Estado ───────────────────────────────────────────────────────────────────

/** Clases de color por estado del ticket. */
export const getStatusClass = (status: string): string => {
    const classes: Record<string, string> = {
        pending_assignment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        in_progress: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        transferred: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return classes[status] ?? '';
};

/** Etiqueta en español para cada estado de ticket. */
export const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
        pending_assignment: 'En cola',
        assigned: 'Asignado',
        in_progress: 'En progreso',
        transferred: 'Transferido',
        cancelled: 'Cancelado',
        closed: 'Cerrado',
    };
    return labels[status] ?? status;
};

// ─── Formato de fechas ────────────────────────────────────────────────────────

/**
 * Formatea un timestamp en texto relativo para la lista de tickets:
 * "Ahora" / "5m" / "3h" / "2d" / "23/01"
 */
export const formatTime = (dateString: unknown): string => {
    if (dateString === null || dateString === undefined || dateString === '') {
        return '-';
    }
    let date: Date = new Date();

    if (typeof dateString === 'number') {
        // Asume milisegundos si es muy grande, sino segundos
        date = new Date(dateString > 1e11 ? dateString : dateString * 1000);
    } else {
        const str = String(dateString);
        // Si el string es solo digitos
        if (/^\d+$/.test(str)) {
            const num = Number.parseInt(str, 10);
            date = new Date(num > 1e11 ? num : num * 1000);
        } else {
            const normalized = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str;
            date = new Date(normalized);
        }
    }
    if (Number.isNaN(date.getTime())) {
        return '-';
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);

    if (diffMins < 1) {
        return 'Ahora';
    }
    if (diffMins < 60) {
        return `${diffMins}m`;
    }

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
        return `${diffHours}h`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
        return `${diffDays}d`;
    }

    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
};

/** Formatea un timestamp mostrando solo la hora HH:MM. */
export const formatMessageTime = (dateString: unknown): string => {
    if (dateString === null || dateString === undefined || dateString === '') {
        return '--:--';
    }
    let date: Date = new Date();

    if (typeof dateString === 'number') {
        date = new Date(dateString > 1e11 ? dateString : dateString * 1000);
    } else {
        const str = String(dateString);
        if (/^\d+$/.test(str)) {
            const num = Number.parseInt(str, 10);
            date = new Date(num > 1e11 ? num : num * 1000);
        } else {
            const normalized = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str;
            date = new Date(normalized);
        }
    }
    if (Number.isNaN(date.getTime())) {
        return '--:--';
    }

    return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

/** Formatea una fecha completa: DD/MM/YYYY HH:MM. */
export const formatDate = (dateString: unknown): string => {
    if (!dateString || typeof dateString !== 'string') {
        return '-';
    }
    const normalized =
        dateString.includes(' ') && !dateString.includes('T') ? dateString.replace(' ', 'T') : dateString;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// ─── Tipo de mensaje ──────────────────────────────────────────────────────────

// ─── Estado del Agente ──────────────────────────────────────────────────────────

/** Clases de color para el estado del agente. */
export const getAgentStatusClass = (status?: string): string => {
    const classes: Record<string, string> = {
        online: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        away: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        busy: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        offline: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        custom: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    const key = status ?? 'offline';
    return classes[key] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
};

/** Etiqueta en español para el estado del agente. */
export const getAgentStatusLabel = (status?: string): string => {
    const labels: Record<string, string> = {
        online: 'En línea',
        away: 'Ausente',
        busy: 'Ocupado',
        offline: 'Desconectado',
        custom: 'Personalizado',
    };
    const key = status ?? 'offline';
    return labels[key] ?? 'Desconectado';
};
