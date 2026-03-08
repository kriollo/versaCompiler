<template>
    <div class="min-h-[200px]">
        <div v-if="cargando" class="text-center py-4">
            <div
                class="inline-block w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"
                role="status">
                <span class="sr-only">Cargando...</span>
            </div>
        </div>

        <div v-else-if="enlaces.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
            <i class="bi bi-share text-6xl mb-3"></i>
            <p class="mb-0">No hay enlaces compartidos</p>
            <small>Los enlaces que generes aparecerán aquí</small>
        </div>

        <div v-else>
            <!-- Vista de tabla para pantallas grandes -->
            <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th class="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Documento</th>
                            <th class="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Token</th>
                            <th class="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Fecha Creación</th>
                            <th class="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Expira</th>
                            <th class="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                            <th class="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300 text-center">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="enlace in enlaces"
                            :key="enlace.id"
                            class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-brand-50 dark:hover:bg-gray-700 transition-colors">
                            <td class="px-6 py-4">
                                <div class="flex items-center">
                                    <div class="min-w-8 mr-3">
                                        <i
                                            :class="obtenerIconoArchivo(enlace.documento.tipo_archivo)"
                                            class="text-xl"></i>
                                    </div>
                                    <div>
                                        <div class="font-medium text-gray-900 dark:text-gray-100">
                                            {{ enlace.documento.nombre_original }}
                                        </div>
                                        <small class="text-gray-500 dark:text-gray-400">
                                            {{ enlace.documento.descripcion || 'Sin descripción' }}
                                        </small>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="flex items-center">
                                    <code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm mr-2">
                                        {{ enlace.token.substring(0, 12) }}...
                                    </code>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <div>
                                    <div class="text-sm text-gray-900 dark:text-gray-100">
                                        {{ formatearFecha(enlace.fecha_creacion) }}
                                    </div>
                                    <small class="text-gray-500 dark:text-gray-400">
                                        {{ formatearHora(enlace.fecha_creacion) }}
                                    </small>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <div v-if="enlace.fecha_expiracion">
                                    <div class="text-sm text-gray-900 dark:text-gray-100">
                                        {{ formatearFecha(enlace.fecha_expiracion) }}
                                    </div>
                                    <small class="text-gray-500 dark:text-gray-400">
                                        {{ formatearHora(enlace.fecha_expiracion) }}
                                    </small>
                                    <div
                                        v-if="estaExpirado(enlace.fecha_expiracion)"
                                        class="text-red-600 dark:text-red-400 text-xs flex items-center mt-1">
                                        <i class="bi bi-exclamation-triangle-fill mr-1"></i>
                                        Expirado
                                    </div>
                                    <div
                                        v-else-if="expiraPronto(enlace.fecha_expiracion)"
                                        class="text-yellow-600 dark:text-yellow-400 text-xs flex items-center mt-1">
                                        <i class="bi bi-clock-fill mr-1"></i>
                                        Expira pronto
                                    </div>
                                </div>
                                <span
                                    v-else
                                    class="inline-flex items-center px-2 py-1 text-xs font-medium bg-cyan-100 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-400 rounded-full">
                                    Sin expiración
                                </span>
                            </td>
                            <td class="px-6 py-4">
                                <span
                                    :class="obtenerClaseEstado(enlace)"
                                    class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full">
                                    {{ obtenerTextoEstado(enlace) }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-center">
                                <div class="flex justify-center gap-1">
                                    <button
                                        type="button"
                                        class="text-brand hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 px-2 py-1 rounded border border-brand/30 dark:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        @click="copiarEnlace(enlace)"
                                        :disabled="estaExpirado(enlace.fecha_expiracion)"
                                        title="Copiar enlace">
                                        <i class="bi bi-clipboard"></i>
                                    </button>
                                    <button
                                        type="button"
                                        class="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        @click="abrirEnlace(enlace)"
                                        :disabled="estaExpirado(enlace.fecha_expiracion)"
                                        title="Abrir enlace">
                                        <i class="bi bi-box-arrow-up-right"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Vista de tarjetas para móviles -->
            <div class="block md:hidden space-y-3">
                <div
                    v-for="enlace in enlaces"
                    :key="enlace.id"
                    class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                    <div class="p-4">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 mr-3">
                                <i :class="obtenerIconoArchivo(enlace.documento.tipo_archivo)" class="text-3xl"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h6 class="text-gray-900 dark:text-gray-100 font-medium mb-1 truncate">
                                    {{ enlace.documento.nombre_original }}
                                </h6>
                                <p class="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate">
                                    {{ enlace.documento.descripcion || 'Sin descripción' }}
                                </p>

                                <div class="mb-2">
                                    <code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                                        {{ enlace.token.substring(0, 16) }}...
                                    </code>
                                </div>

                                <div class="flex flex-wrap gap-2 mb-2">
                                    <span
                                        :class="obtenerClaseEstado(enlace)"
                                        class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full">
                                        {{ obtenerTextoEstado(enlace) }}
                                    </span>
                                    <span
                                        v-if="enlace.fecha_expiracion"
                                        class="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                                        Expira: {{ formatearFecha(enlace.fecha_expiracion) }}
                                    </span>
                                    <span
                                        v-else
                                        class="inline-flex items-center px-2 py-1 text-xs font-medium bg-cyan-100 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-400 rounded-full">
                                        Sin expiración
                                    </span>
                                </div>

                                <small class="text-gray-500 dark:text-gray-400">
                                    Creado: {{ formatearFecha(enlace.fecha_creacion) }}
                                    {{ formatearHora(enlace.fecha_creacion) }}
                                </small>
                            </div>

                            <div class="flex-shrink-0 ml-3">
                                <div class="flex flex-col gap-1">
                                    <button
                                        type="button"
                                        class="text-brand hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 px-2 py-1 rounded border border-brand/30 dark:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        @click="copiarEnlace(enlace)"
                                        :disabled="estaExpirado(enlace.fecha_expiracion)">
                                        <i class="bi bi-clipboard"></i>
                                    </button>
                                    <button
                                        type="button"
                                        class="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        @click="abrirEnlace(enlace)"
                                        :disabled="estaExpirado(enlace.fecha_expiracion)">
                                        <i class="bi bi-box-arrow-up-right"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { inject } from 'vue';

    import { useFileTypes } from '@/dashboard/js/composables/useFileTypes';

    // Props
    interface Props {
        enlaces: any[];
        cargando?: boolean;
    }

    const props = withDefaults(defineProps<Props>(), {
        cargando: false,
    });

    // Eventos
    const emit = defineEmits<{
        copiarEnlace: [url: string];
    }>();

    // Inyecciones
    const panelUrl = inject<string>('panelUrl', '');

    const { obtenerIconoArchivo, formatearTamano } = useFileTypes();

    // Métodos
    const formatearFecha = (fecha: string): string => {
        const date = new Date(fecha);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatearHora = (fecha: string): string => {
        const date = new Date(fecha);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const estaExpirado = (fechaExpiracion: string | null): boolean => {
        if (!fechaExpiracion) {
            return false;
        }
        return new Date(fechaExpiracion) < new Date();
    };

    const expiraPronto = (fechaExpiracion: string | null): boolean => {
        if (!fechaExpiracion) {
            return false;
        }
        const ahora = new Date();
        const expiracion = new Date(fechaExpiracion);
        const unDiaEnMs = 24 * 60 * 60 * 1000;

        return expiracion.getTime() - ahora.getTime() <= unDiaEnMs && expiracion > ahora;
    };

    const obtenerClaseEstado = (enlace: any): string => {
        if (estaExpirado(enlace.fecha_expiracion)) {
            return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400';
        }
        if (expiraPronto(enlace.fecha_expiracion)) {
            return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400';
        }
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400';
    };

    const obtenerTextoEstado = (enlace: any): string => {
        if (estaExpirado(enlace.fecha_expiracion)) {
            return 'Expirado';
        }
        if (expiraPronto(enlace.fecha_expiracion)) {
            return 'Expira pronto';
        }
        return 'Activo';
    };

    const copiarEnlace = (enlace: any) => {
        const url = `${window.location.origin}/${panelUrl}/shared/${enlace.token}`;
        emit('copiarEnlace', url);
    };

    const abrirEnlace = (enlace: any) => {
        const url = `${window.location.origin}/${panelUrl}/shared/${enlace.token}`;
        window.open(url, '_blank');
    };
</script>
