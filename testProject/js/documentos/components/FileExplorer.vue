<template>
    <div
        class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm min-h-[500px] flex flex-col">
        <!-- Toolbar Superior -->
        <div
            class="flex justify-between items-center px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-1">
                <!--
                <button
                    class="bg-transparent border border-transparent rounded p-1.5 text-gray-900 dark:text-gray-100 cursor-pointer transition-all duration-200 min-w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    @click="navegarAtras"
                    :disabled="!puedeNavegar"
                    title="Atrás">
                    <i class="bi bi-arrow-left"></i>
                </button>
                <button
                    class="bg-transparent border border-transparent rounded p-1.5 text-gray-900 dark:text-gray-100 cursor-pointer transition-all duration-200 min-w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    @click="navegarAdelante"
                    :disabled="!puedeNavegar"
                    title="Adelante">
                    <i class="bi bi-arrow-right"></i>
                </button>
                <button
                    class="bg-transparent border border-transparent rounded p-1.5 text-gray-900 dark:text-gray-100 cursor-pointer transition-all duration-200 min-w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    @click="subirNivel"
                    :disabled="!carpetaActual || carpetaActual.carpeta_padre_id === null"
                    title="Subir un nivel">
                    <i class="bi bi-arrow-up"></i>
                </button>
                <div class="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
            -->
                <button
                    v-if="current_user.role === 'superadmin'"
                    class="bg-transparent border border-transparent rounded p-1.5 text-gray-900 dark:text-gray-100 cursor-pointer transition-all duration-200 min-w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-600"
                    @click="crearNuevaCarpeta"
                    title="Nueva carpeta">
                    <i class="bi bi-folder-plus"></i>
                </button>
            </div>

            <div
                class="flex bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                <button
                    class="bg-transparent border-none px-2.5 py-1.5 text-gray-500 dark:text-gray-400 cursor-pointer transition-all duration-200 border-r border-gray-300 dark:border-gray-600 last:border-r-0 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                    :class="{ 'bg-brand text-white': vistaActual === 'tree' }"
                    @click="cambiarVista('tree')"
                    title="Vista de árbol">
                    <i class="bi bi-list-nested"></i>
                </button>
                <button
                    class="bg-transparent border-none px-2.5 py-1.5 text-gray-500 dark:text-gray-400 cursor-pointer transition-all duration-200 border-r border-gray-300 dark:border-gray-600 last:border-r-0 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                    :class="{ 'bg-brand text-white': vistaActual === 'grid' }"
                    @click="cambiarVista('grid')"
                    title="Vista de cuadrícula">
                    <i class="bi bi-grid-3x3-gap"></i>
                </button>
                <button
                    class="bg-transparent border-none px-2.5 py-1.5 text-gray-500 dark:text-gray-400 cursor-pointer transition-all duration-200 border-r border-gray-300 dark:border-gray-600 last:border-r-0 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                    :class="{ 'bg-brand text-white': vistaActual === 'details' }"
                    @click="cambiarVista('details')"
                    title="Vista detallada">
                    <i class="bi bi-list-ul"></i>
                </button>
            </div>
        </div>

        <!-- Breadcrumb Navigation -->
        <div class="px-3 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                <button
                    class="bg-transparent border border-transparent rounded px-2 py-1 text-brand dark:text-brand-400 cursor-pointer transition-all duration-200 flex items-center gap-1 whitespace-nowrap text-sm hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                    :class="{ 'text-gray-900 dark:text-gray-100 font-medium': !carpetaActual }"
                    @click="navegarACarpeta(null)">
                    <i class="bi bi-house-fill"></i>
                    <span>Inicio</span>
                </button>
                <template v-if="rutaBreadcrumb.length > 0">
                    <i class="bi bi-chevron-right text-gray-500 dark:text-gray-400 text-xs"></i>
                    <template v-for="(carpeta, index) in rutaBreadcrumb" :key="carpeta.id">
                        <button
                            class="bg-transparent border border-transparent rounded px-2 py-1 text-gray-500 dark:text-gray-400 cursor-pointer transition-all duration-200 flex items-center gap-1 whitespace-nowrap text-sm hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                            :class="{
                                'text-gray-900 dark:text-gray-100 font-medium':
                                    Number(index) === rutaBreadcrumb.length - 1,
                            }"
                            @click="navegarACarpeta(carpeta.id)">
                            <i class="bi bi-folder-fill"></i>
                            <span>{{ carpeta.nombre }}</span>
                        </button>
                        <i
                            v-if="Number(index) < rutaBreadcrumb.length - 1"
                            class="bi bi-chevron-right text-gray-500 dark:text-gray-400 text-xs"></i>
                    </template>
                </template>
            </div>
        </div>

        <!-- Contenido Principal -->
        <div class="flex-1 overflow-hidden relative">
            <!-- Vista de Árbol -->
            <div v-if="vistaActual === 'tree'" class="h-full overflow-y-auto">
                <div v-if="!carpetas.length" class="flex flex-col items-center justify-center p-16 text-center">
                    <div class="text-6xl text-gray-400 dark:text-gray-500 mb-4">
                        <i class="bi bi-folder-x"></i>
                    </div>
                    <h5 class="text-gray-900 dark:text-gray-100 mb-2">No hay carpetas</h5>
                    <p class="text-gray-500 dark:text-gray-400 mb-5">
                        Crea tu primera carpeta para comenzar a organizar documentos
                    </p>
                    <button
                        v-if="current_user.role === 'superadmin'"
                        class="bg-brand hover:bg-brand text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        @click="crearNuevaCarpeta">
                        <i class="bi bi-folder-plus"></i>
                        Crear Carpeta
                    </button>
                </div>
                <div v-else class="p-2">
                    <TreeNode
                        v-for="carpeta in carpetasVisibles"
                        :key="carpeta.id"
                        :carpeta="carpeta"
                        :nivel="0"
                        :carpeta-seleccionada="carpetaSeleccionada"
                        @seleccionar="seleccionarCarpeta"
                        @menu-contextual="mostrarMenuContextual" />
                </div>
            </div>

            <!-- Vista de Cuadrícula -->
            <div v-if="vistaActual === 'grid'" class="h-full overflow-y-auto">
                <div v-if="!carpetasVisibles.length" class="flex flex-col items-center justify-center p-16 text-center">
                    <div class="text-6xl text-gray-400 dark:text-gray-500 mb-4">
                        <i class="bi bi-folder-x"></i>
                    </div>
                    <h5 class="text-gray-900 dark:text-gray-100 mb-2">Carpeta vacía</h5>
                    <p class="text-gray-500 dark:text-gray-400">No hay subcarpetas en esta ubicación</p>
                </div>
                <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 p-4">
                    <div
                        v-for="carpeta in carpetasVisibles"
                        :key="carpeta.id"
                        class="flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all duration-200 border-2 border-transparent relative hover:bg-gray-100 dark:hover:bg-gray-700"
                        :class="{
                            'bg-brand-50 dark:bg-brand-900/20 border-brand ring-2 ring-brand/40 dark:ring-brand/30':
                                carpetaSeleccionada === carpeta.id,
                        }"
                        @click="seleccionarCarpeta(carpeta.id)"
                        @dblclick="navegarACarpeta(carpeta.id)"
                        @contextmenu.prevent="mostrarMenuContextual($event, carpeta)">
                        <div
                            class="text-4xl mb-2 relative"
                            :class="
                                carpetaSeleccionada === carpeta.id
                                    ? 'text-brand dark:text-brand-400'
                                    : 'text-yellow-500 dark:text-yellow-400'
                            ">
                            <i
                                :class="
                                    carpetaSeleccionada === carpeta.id ? 'bi bi-folder2-open' : 'bi bi-folder-fill'
                                "></i>
                            <div
                                v-if="carpeta.hijos && carpeta.hijos.length > 0"
                                class="absolute -top-1 -right-1 bg-brand text-white rounded-full px-1.5 py-0.5 text-xs font-bold">
                                {{ carpeta.hijos.length }}
                            </div>
                        </div>
                        <div class="text-sm font-medium text-gray-900 dark:text-gray-100 text-center break-words mb-1">
                            {{ carpeta.nombre }}
                        </div>
                        <div class="flex flex-col items-center text-xs text-gray-500 dark:text-gray-400">
                            <span>{{ carpeta.documento_count || 0 }} docs</span>
                            <span>{{ formatearFecha(carpeta.updated_at) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Vista Detallada -->
            <div v-if="vistaActual === 'details'" class="h-full overflow-y-auto">
                <div
                    class="grid grid-cols-[1fr_120px_140px_100px] gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-gray-100 sticky top-0 z-10">
                    <div class="flex items-center gap-1 text-sm">
                        <span>Nombre</span>
                        <i class="bi bi-chevron-down text-xs text-gray-500 dark:text-gray-400"></i>
                    </div>
                    <div class="text-sm">Tipo</div>
                    <div class="text-sm">Modificado</div>
                    <div class="text-sm">Elementos</div>
                </div>

                <div v-if="!carpetasVisibles.length" class="flex flex-col items-center justify-center p-16 text-center">
                    <div class="text-6xl text-gray-400 dark:text-gray-500 mb-4">
                        <i class="bi bi-folder-x"></i>
                    </div>
                    <h5 class="text-gray-900 dark:text-gray-100 mb-2">Carpeta vacía</h5>
                    <p class="text-gray-500 dark:text-gray-400">No hay subcarpetas en esta ubicación</p>
                </div>

                <div v-else class="bg-white dark:bg-gray-900">
                    <div
                        v-for="carpeta in carpetasVisibles"
                        :key="carpeta.id"
                        class="grid grid-cols-[1fr_120px_140px_100px] gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                        :class="{
                            'bg-brand-50 dark:bg-brand-900/20 ring-2 ring-brand/40 dark:ring-brand/30':
                                carpetaSeleccionada === carpeta.id,
                        }"
                        @click="seleccionarCarpeta(carpeta.id)"
                        @dblclick="navegarACarpeta(carpeta.id)"
                        @contextmenu.prevent="mostrarMenuContextual($event, carpeta)">
                        <div
                            class="flex items-center text-sm gap-2"
                            :class="
                                carpetaSeleccionada === carpeta.id
                                    ? 'text-brand dark:text-brand-400'
                                    : 'text-gray-900 dark:text-gray-100'
                            ">
                            <div class="text-base min-w-4">
                                <i
                                    :class="
                                        carpetaSeleccionada === carpeta.id ? 'bi bi-folder2-open' : 'bi bi-folder-fill'
                                    "></i>
                            </div>
                            <span class="whitespace-nowrap overflow-hidden text-ellipsis">{{ carpeta.nombre }}</span>
                        </div>
                        <div class="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <span>Carpeta de archivos</span>
                        </div>
                        <div class="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <span>{{ formatearFechaCompleta(carpeta.updated_at) }}</span>
                        </div>
                        <div class="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <span>{{ carpeta.documento_count || 0 }} elementos</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Menu Contextual -->
        <div
            v-if="menuContextual.visible"
            class="fixed bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-[1000] min-w-44 overflow-hidden"
            :style="{
                left: menuContextual.posX + 'px',
                top: menuContextual.posY + 'px',
            }"
            @click.stop>
            <div
                class="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="abrirCarpeta">
                <i class="bi bi-folder-fill"></i>
                <span>Abrir</span>
            </div>
            <div class="h-px bg-gray-200 dark:bg-gray-600 my-1"></div>
            <div
                class="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="editarCarpeta">
                <i class="bi bi-pencil"></i>
                <span>Renombrar</span>
            </div>
            <div
                class="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="eliminarCarpeta">
                <i class="bi bi-trash"></i>
                <span>Eliminar</span>
            </div>
            <div class="h-px bg-gray-200 dark:bg-gray-600 my-1"></div>
            <div
                class="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="propiedadesCarpeta">
                <i class="bi bi-info-circle"></i>
                <span>Propiedades</span>
            </div>
        </div>

        <!-- Overlay para cerrar menu contextual -->
        <div v-if="menuContextual.visible" class="fixed inset-0 z-[999]" @click="cerrarMenuContextual"></div>
    </div>
</template>

<script setup lang="ts">
    import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue';

    import TreeNode from '@/dashboard/js/documentos/components/TreeNode.vue';

    // Tipos
    interface Carpeta {
        id: number;
        nombre: string;
        carpeta_padre_id?: number;
        documento_count?: number;
        updated_at: string;
        hijos?: Carpeta[];
    }

    interface Props {
        carpetas: Carpeta[];
        carpetaSeleccionada: number | null;
        soloLectura?: boolean;
    }

    const props = withDefaults(defineProps<Props>(), {
        soloLectura: false,
    });

    const emit = defineEmits<{
        'seleccionar-carpeta': [carpetaId: number];
        'crear-carpeta': [parentId?: number];
        'editar-carpeta': [carpeta: Carpeta];
        'eliminar-carpeta': [carpetaId: number];
    }>();

    // Estado del explorador
    const vistaActual = ref<'tree' | 'grid' | 'details'>('tree');
    const carpetaNavegacion = ref<number | null>(null);
    const historialNavegacion = ref<(number | null)[]>([null]);
    const posicionHistorial = ref(0);
    const carpetasExpandidas = ref<Set<number>>(new Set());
    const current_user = inject<{ id: number; role: string }>('current_user', { id: 0, role: 'user' });
    // Menu contextual
    const menuContextual = ref({
        visible: false,
        posX: 0,
        posY: 0,
        carpeta: null as Carpeta | null,
    });

    // Definición reactiva para carpetaSeleccionada
    const carpetaSeleccionada = ref<number | null>(null);

    // Computeds
    const carpetaActual = computed(() => {
        if (!carpetaNavegacion.value) {
            return null;
        }
        return buscarCarpetaPorId(props.carpetas, carpetaNavegacion.value);
    });

    const carpetasVisibles = computed(() => {
        if (!carpetaNavegacion.value) {
            return props.carpetas.filter(carpeta => !carpeta.carpeta_padre_id);
        }

        const carpeta = carpetaActual.value;
        return carpeta?.hijos || [];
    });

    const rutaBreadcrumb = computed(() => {
        if (!carpetaNavegacion.value) {
            return [];
        }

        const ruta: Carpeta[] = [];
        let carpetaId: number | null = carpetaNavegacion.value;

        while (carpetaId) {
            const carpeta = buscarCarpetaPorId(props.carpetas, carpetaId);
            if (carpeta) {
                ruta.unshift(carpeta);
                carpetaId = carpeta.carpeta_padre_id || null;
            } else {
                break;
            }
        }

        return ruta;
    });

    const puedeNavegar = computed(() => historialNavegacion.value.length > 1);

    // Métodos
    const buscarCarpetaPorId = (carpetas: Carpeta[], id: number): Carpeta | null => {
        for (const carpeta of carpetas) {
            if (carpeta.id === id) {
                return carpeta;
            }
            if (carpeta.hijos) {
                const encontrada = buscarCarpetaPorId(carpeta.hijos, id);
                if (encontrada) {
                    return encontrada;
                }
            }
        }
        return null;
    };

    const navegarACarpeta = (carpetaId: number | null) => {
        // Limpiar historial desde la posición actual
        historialNavegacion.value = historialNavegacion.value.slice(0, posicionHistorial.value + 1);

        // Agregar nueva posición
        historialNavegacion.value.push(carpetaId);
        posicionHistorial.value = historialNavegacion.value.length - 1;

        carpetaNavegacion.value = carpetaId;
    };

    const navegarAtras = () => {
        if (posicionHistorial.value > 0) {
            posicionHistorial.value--;
            const nuevaPos = historialNavegacion.value[posicionHistorial.value];
            carpetaNavegacion.value = nuevaPos !== undefined ? nuevaPos : null;
        }
    };

    const navegarAdelante = () => {
        if (posicionHistorial.value < historialNavegacion.value.length - 1) {
            posicionHistorial.value++;
            const nuevaPos = historialNavegacion.value[posicionHistorial.value];
            carpetaNavegacion.value = nuevaPos !== undefined ? nuevaPos : null;
        }
    };

    const subirNivel = () => {
        const carpeta = carpetaActual.value;
        if (carpeta?.carpeta_padre_id) {
            navegarACarpeta(carpeta.carpeta_padre_id);
        } else {
            navegarACarpeta(null);
        }
    };

    const cambiarVista = (vista: 'tree' | 'grid' | 'details') => {
        vistaActual.value = vista;
        localStorage.setItem('fileExplorerView', vista);
    };

    // Aseguramos que la selección de carpeta actual se actualice correctamente
    const seleccionarCarpeta = (carpetaId: number) => {
        emit('seleccionar-carpeta', Number(carpetaId));
        carpetaSeleccionada.value = Number(carpetaId);
    };

    const toggleExpandir = (carpetaId: number) => {
        if (carpetasExpandidas.value.has(carpetaId)) {
            carpetasExpandidas.value.delete(carpetaId);
        } else {
            carpetasExpandidas.value.add(carpetaId);
        }
    };

    const crearNuevaCarpeta = () => {
        emit('crear-carpeta', carpetaNavegacion.value || undefined);
    };

    const mostrarMenuContextual = (event: MouseEvent, carpeta: Carpeta) => {
        event.preventDefault();
        menuContextual.value = {
            visible: true,
            posX: event.clientX,
            posY: event.clientY,
            carpeta,
        };
    };

    const cerrarMenuContextual = () => {
        menuContextual.value.visible = false;
    };

    const abrirCarpeta = () => {
        if (menuContextual.value.carpeta) {
            navegarACarpeta(menuContextual.value.carpeta.id);
        }
        cerrarMenuContextual();
    };

    const editarCarpeta = () => {
        if (menuContextual.value.carpeta) {
            emit('editar-carpeta', menuContextual.value.carpeta);
        }
        cerrarMenuContextual();
    };

    const eliminarCarpeta = () => {
        if (menuContextual.value.carpeta) {
            emit('eliminar-carpeta', menuContextual.value.carpeta.id);
        }
        cerrarMenuContextual();
    };

    const propiedadesCarpeta = () => {
        // Pendiente: implementar modal de propiedades
        cerrarMenuContextual();
    };

    const formatearFecha = (fecha: string) =>
        new Date(fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
        });

    const formatearFechaCompleta = (fecha: string) =>
        new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    // Watchers
    watch(
        () => props.carpetaSeleccionada,
        nuevaSeleccion => {
            if (nuevaSeleccion) {
                // Auto-expandir la ruta hacia la carpeta seleccionada
                const ruta = rutaBreadcrumb.value;
                ruta.forEach(carpeta => {
                    carpetasExpandidas.value.add(carpeta.id);
                });
            }
        },
    );

    // En el setup, sincronizamos la prop con el estado local y forzamos a número
    watch(
        () => props.carpetaSeleccionada,
        nuevoId => {
            carpetaSeleccionada.value = nuevoId !== null ? Number(nuevoId) : null;
        },
    );

    // Lifecycle
    onMounted(() => {
        // Restaurar vista preferida
        const vistaGuardada = localStorage.getItem('fileExplorerView') as 'tree' | 'grid' | 'details';
        if (vistaGuardada) {
            vistaActual.value = vistaGuardada;
        }

        // Expandir carpetas raíz por defecto
        props.carpetas.forEach(carpeta => {
            if (!carpeta.carpeta_padre_id) {
                carpetasExpandidas.value.add(carpeta.id);
            }
        });

        // Listener para cerrar menu contextual
        document.addEventListener('click', cerrarMenuContextual);
    });

    onUnmounted(() => {
        document.removeEventListener('click', cerrarMenuContextual);
    });
</script>

<style scoped>
    /* Utility classes for scrollbar hide */
    .scrollbar-hide {
        scrollbar-width: none;
        -ms-overflow-style: none;
    }

    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
</style>
