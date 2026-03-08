<script setup lang="ts">
    import type { AccionData, actionsType } from 'versaTypes';
    import { computed, inject, ref, type Ref, watch } from 'vue';

    import Modal from '@/dashboard/js/components/modal.vue';
    import {
        monedasDisponibles,
        nivelesSoporte,
        plan,
        type Plan,
        tiposPlan,
        useModalPlan,
    } from '@/dashboard/js/planes/planType';

    const showModalPlan = useModalPlan.inject();
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));

    const dataFormLocal = ref<Plan>({ ...plan });

    // Control de apertura/cierre del modal
    watch(
        () => showModalPlan.show,
        newVal => {
            if (newVal) {
                dataFormLocal.value = { ...showModalPlan.itemSelected };
                dataFormLocal.value.csrf_token = csrf_token.value;
            } else {
                dataFormLocal.value = { ...plan };
            }
        },
    );

    // Sincronización de datos
    watch(
        () => showModalPlan.itemSelected,
        newVal => {
            if (showModalPlan.show) {
                dataFormLocal.value = { ...newVal };
                dataFormLocal.value.csrf_token = csrf_token.value;
            }
        },
        { deep: true },
    );

    const emit = defineEmits(['accion']);

    const accion = (data: AccionData) => {
        const actions: actionsType = {
            closeModal: () => {
                showModalPlan.show = false;
            },
            saveForm: () => {
                emit('accion', { accion: 'saveForm', item: dataFormLocal.value });
            },
            default: () => {
                emit('accion', { ...data });
            },
        };
        const fn = actions[data.accion] || actions.default;
        if (typeof fn === 'function') {
            fn();
        }
    };

    // Computed para validaciones visuales
    const duracionAlmacenamientoValido = computed(() => dataFormLocal.value.duracion_almacenamiento_dias <= 30);
    const duracionVideoValido = computed(
        () => dataFormLocal.value.duracion_video_max_segundos >= dataFormLocal.value.duracion_video_min_segundos,
    );
    const esTransaccional = computed(() => dataFormLocal.value.tipo_plan === 'transaccional');
    const labelPrecio = computed(() => (esTransaccional.value ? 'Precio por Video' : 'Precio Mensual'));
</script>

<template>
    <Modal :idModal="'plan'" :showModal="showModalPlan.show" @accion="accion" :size="'max-w-7xl'">
        <template v-slot:modalTitle>
            <div
                class="flex justify-between items-center w-full border-b border-gray-100 dark:border-gray-800 pb-6 mb-8">
                <div class="flex items-center gap-4">
                    <div
                        class="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center text-white shadow-lg shadow-brand/20">
                        <i class="bi bi-award-fill text-2xl"></i>
                    </div>
                    <div>
                        <h3 class="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                            {{ dataFormLocal.id ? 'Editar Plan' : 'Nuevo Plan' }}
                        </h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            Configura los límites y funcionalidades premium del plan
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    class="group w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:bg-black hover:text-brand dark:hover:bg-brand dark:hover:text-white transition-all"
                    @click="accion({ accion: 'closeModal' })">
                    <i class="bi bi-x-lg text-sm"></i>
                </button>
            </div>
        </template>

        <template v-slot:modalBody>
            <div class="space-y-8">
                <!-- Sección: Información Básica -->
                <div
                    class="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                    <h4
                        class="text-xs font-black text-gray-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                        <i class="bi bi-info-circle-fill text-brand"></i>
                        Información Básica del Plan
                    </h4>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <!-- Nombre -->
                        <div class="group">
                            <label
                                for="nombre"
                                class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                Nombre del Plan
                                <span class="text-red-500">*</span>
                            </label>
                            <div class="relative">
                                <div
                                    class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none transition-colors group-focus-within:text-brand">
                                    <i class="bi bi-award text-gray-400 text-lg"></i>
                                </div>
                                <input
                                    type="text"
                                    id="nombre"
                                    v-model="dataFormLocal.nombre"
                                    class="w-full pl-11 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all placeholder-gray-400 dark:text-white"
                                    placeholder="Ej: Plan Corporativo"
                                    required />
                            </div>
                        </div>

                        <!-- Tipo de Plan -->
                        <div class="group">
                            <label
                                for="tipo_plan"
                                class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                Tipo de Plan
                                <span class="text-red-500">*</span>
                            </label>
                            <div class="relative">
                                <div
                                    class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-brand">
                                    <i class="bi bi-bookmark-star-fill text-lg"></i>
                                </div>
                                <select
                                    id="tipo_plan"
                                    v-model="dataFormLocal.tipo_plan"
                                    class="w-full pl-11 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all dark:text-white appearance-none cursor-pointer">
                                    <option v-for="tipo in tiposPlan" :key="tipo.value" :value="tipo.value">
                                        {{ tipo.label }}
                                    </option>
                                </select>
                            </div>
                        </div>

                        <!-- Descripción -->
                        <div class="group">
                            <label
                                for="descripcion"
                                class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                Descripción
                            </label>
                            <div class="relative">
                                <div
                                    class="absolute top-4 left-4 pointer-events-none transition-colors group-focus-within:text-brand">
                                    <i class="bi bi-card-text text-gray-400 text-lg"></i>
                                </div>
                                <textarea
                                    id="descripcion"
                                    v-model="dataFormLocal.descripcion"
                                    rows="1"
                                    class="w-full pl-11 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all placeholder-gray-400 dark:text-white resize-none"
                                    placeholder="Breve descripción..."></textarea>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Grid para Almacenamiento y Funcionalidades -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Sección: Almacenamiento -->
                    <div
                        class="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h4
                            class="text-xs font-black text-gray-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="bi bi-database-fill text-purple-500"></i>
                            Almacenamiento (Días)
                        </h4>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div class="group">
                                <label
                                    for="duracion_almacenamiento_dias"
                                    class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                    Vida en nube
                                </label>
                                <div class="relative">
                                    <div
                                        class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none"
                                        :class="duracionAlmacenamientoValido ? 'text-purple-500' : 'text-red-500'">
                                        <i class="bi bi-clock-history text-lg"></i>
                                    </div>
                                    <input
                                        type="number"
                                        id="duracion_almacenamiento_dias"
                                        v-model.number="dataFormLocal.duracion_almacenamiento_dias"
                                        min="1"
                                        max="30"
                                        class="w-full pl-11 pr-4 py-4 bg-white dark:bg-gray-900 border rounded-2xl text-sm font-bold focus:ring-4 outline-none transition-all dark:text-white"
                                        :class="
                                            duracionAlmacenamientoValido
                                                ? 'border-gray-200 dark:border-gray-700 focus:ring-brand/10 focus:border-purple-500'
                                                : 'border-red-300 dark:border-red-700 focus:ring-red-500/10 focus:border-red-500'
                                        " />
                                </div>
                                <p
                                    v-if="!duracionAlmacenamientoValido"
                                    class="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wider flex items-center gap-1">
                                    <i class="bi bi-exclamation-circle-fill"></i>
                                    Máx. 30 días
                                </p>
                            </div>

                            <div class="group">
                                <label
                                    for="tiempo_vida_rechazado_dias"
                                    class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                    Rechazados
                                </label>
                                <div class="relative">
                                    <div
                                        class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                                        <i class="bi bi-trash-fill text-lg"></i>
                                    </div>
                                    <input
                                        type="number"
                                        id="tiempo_vida_rechazado_dias"
                                        v-model.number="dataFormLocal.tiempo_vida_rechazado_dias"
                                        min="0"
                                        class="w-full pl-11 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand/10 focus:border-gray-500 outline-none transition-all dark:text-white" />
                                </div>
                                <p
                                    class="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest whitespace-nowrap">
                                    0 = Inmediato
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Sección: Funcionalidades -->
                    <div
                        class="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h4
                            class="text-xs font-black text-gray-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="bi bi-lightning-charge-fill text-brand"></i>
                            Funcionalidades
                        </h4>

                        <div
                            class="flex items-start gap-4 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 group cursor-pointer hover:border-brand transition-colors"
                            @click="dataFormLocal.moderacion_ia = !dataFormLocal.moderacion_ia">
                            <div class="flex items-center pt-1">
                                <input
                                    type="checkbox"
                                    id="moderacion_ia"
                                    v-model="dataFormLocal.moderacion_ia"
                                    @click.stop
                                    class="w-6 h-6 rounded-lg border-gray-300 text-black focus:ring-brand cursor-pointer" />
                            </div>
                            <label for="moderacion_ia" class="flex-1 cursor-pointer" @click.stop>
                                <div class="text-sm font-black text-gray-900 dark:text-white">Moderación IA</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    Análisis automático inteligente
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Sección: Videos -->
                <div
                    class="bg-gray-50 dark:bg-gray-900/30 p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-sm">
                    <h4
                        class="text-xs font-black text-gray-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                        <i class="bi bi-play-btn-fill text-red-500"></i>
                        Configuración de Video y Contenido
                    </h4>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <!-- Duración Mínima -->
                        <div class="group">
                            <label
                                for="duracion_video_min_segundos"
                                class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                Duración Mínima (seg)
                            </label>
                            <div class="relative">
                                <div
                                    class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-red-500">
                                    <i class="bi bi-hourglass-top text-lg"></i>
                                </div>
                                <input
                                    type="number"
                                    id="duracion_video_min_segundos"
                                    v-model.number="dataFormLocal.duracion_video_min_segundos"
                                    min="1"
                                    class="w-full pl-11 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand/10 focus:border-red-500 outline-none transition-all dark:text-white" />
                            </div>
                        </div>

                        <!-- Duración Máxima -->
                        <div class="group">
                            <label
                                for="duracion_video_max_segundos"
                                class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                Duración Máxima (seg)
                            </label>
                            <div class="relative">
                                <div
                                    class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none"
                                    :class="duracionVideoValido ? 'text-red-500' : 'text-red-700'">
                                    <i class="bi bi-hourglass-bottom text-lg"></i>
                                </div>
                                <input
                                    type="number"
                                    id="duracion_video_max_segundos"
                                    v-model.number="dataFormLocal.duracion_video_max_segundos"
                                    min="1"
                                    class="w-full pl-11 pr-4 py-4 bg-white dark:bg-gray-900 border rounded-2xl text-sm font-bold focus:ring-4 outline-none transition-all dark:text-white"
                                    :class="
                                        duracionVideoValido
                                            ? 'border-gray-200 dark:border-gray-700 focus:ring-brand/10 focus:border-red-500'
                                            : 'border-red-300 dark:border-red-700 focus:ring-red-500/10 focus:border-red-500'
                                    " />
                            </div>
                            <p
                                v-if="!duracionVideoValido"
                                class="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wider flex items-center gap-1">
                                <i class="bi bi-exclamation-circle-fill"></i>
                                Debe ser mayor al mínimo
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Sección: Límites -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Capacidad -->
                    <div
                        class="bg-white dark:bg-gray-900/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-500 group">
                        <h4
                            class="text-xs font-black text-gray-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="bi bi-megaphone-fill text-purple-500"></i>
                            Límites de Campaña
                        </h4>

                        <div class="grid grid-cols-1 gap-8">
                            <div class="group">
                                <label
                                    for="max_videos_por_campana"
                                    class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                    Máx. Videos por Campaña
                                </label>
                                <div class="relative">
                                    <div
                                        class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-purple-600">
                                        <i class="bi bi-collection-play-fill text-lg"></i>
                                    </div>
                                    <input
                                        type="number"
                                        id="max_videos_por_campana"
                                        v-model.number="dataFormLocal.max_videos_por_campana"
                                        min="0"
                                        class="w-full pl-11 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand/10 focus:border-purple-500 outline-none transition-all dark:text-white"
                                        placeholder="Vacio si es ilimitado" />
                                </div>
                            </div>
                            <div class="group">
                                <label
                                    for="max_campanas_activas"
                                    class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                    Campañas Activas
                                </label>
                                <div class="relative">
                                    <div
                                        class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-purple-600">
                                        <i class="bi bi-broadcast text-lg"></i>
                                    </div>
                                    <input
                                        type="number"
                                        id="max_campanas_activas"
                                        v-model.number="dataFormLocal.max_campanas_activas"
                                        min="0"
                                        class="w-full pl-11 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand/10 focus:border-purple-500 outline-none transition-all dark:text-white"
                                        placeholder="Vacio si es ilimitado" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Usuarios y Soporte -->
                    <div
                        class="bg-white dark:bg-gray-900/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-500 group">
                        <h4
                            class="text-xs font-black text-gray-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="bi bi-people-fill text-brand"></i>
                            Usuarios y Soporte
                        </h4>

                        <div class="grid grid-cols-1 gap-8">
                            <div class="group">
                                <label
                                    for="max_usuarios_admin"
                                    class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                    Cupo Usuarios Admin
                                </label>
                                <div class="relative">
                                    <div
                                        class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-brand">
                                        <i class="bi bi-person-badge-fill text-lg"></i>
                                    </div>
                                    <input
                                        type="number"
                                        id="max_usuarios_admin"
                                        v-model.number="dataFormLocal.max_usuarios_admin"
                                        min="1"
                                        class="w-full pl-11 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all dark:text-white" />
                                </div>
                            </div>

                            <div class="group">
                                <label
                                    for="nivel_soporte"
                                    class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                    Nivel de Soporte
                                </label>
                                <div class="relative">
                                    <div
                                        class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-brand">
                                        <i class="bi bi-headset text-lg"></i>
                                    </div>
                                    <select
                                        id="nivel_soporte"
                                        v-model="dataFormLocal.nivel_soporte"
                                        class="w-full pl-11 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all dark:text-white appearance-none cursor-pointer">
                                        <option v-for="nivel in nivelesSoporte" :key="nivel.value" :value="nivel.value">
                                            {{ nivel.label }}
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sección: Precios -->
                <div
                    class="bg-black dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl shadow-black/20 overflow-hidden relative group">
                    <!-- Decorative Elements -->
                    <div
                        class="absolute -top-12 -right-12 w-32 h-32 bg-brand/10 rounded-full blur-2xl transition-all group-hover:bg-brand/20"></div>

                    <h4
                        class="text-xs font-black text-brand mb-8 uppercase tracking-[0.2em] relative z-10 flex items-center gap-2">
                        <i class="bi bi-wallet2"></i>
                        Configuración de Precios
                    </h4>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <!-- Precio -->
                        <div class="group">
                            <label
                                for="precio_mensual"
                                class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                {{ labelPrecio }}
                                <span class="text-red-500">*</span>
                            </label>
                            <div class="relative">
                                <div
                                    class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-brand">
                                    <i class="bi bi-cash text-lg"></i>
                                </div>
                                <input
                                    type="number"
                                    id="precio_mensual"
                                    v-model.number="dataFormLocal.precio_mensual"
                                    min="0"
                                    step="0.01"
                                    class="w-full pl-11 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-2xl font-black text-brand focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all placeholder-white/20" />
                            </div>
                        </div>

                        <!-- Moneda -->
                        <div class="group">
                            <label
                                for="moneda"
                                class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                Moneda
                            </label>
                            <div class="relative">
                                <div
                                    class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-brand">
                                    <i class="bi bi-coin text-lg"></i>
                                </div>
                                <select
                                    id="moneda"
                                    v-model="dataFormLocal.moneda"
                                    class="w-full pl-11 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-black text-white focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all appearance-none cursor-pointer">
                                    <option v-for="mon in monedasDisponibles" :key="mon.value" :value="mon.value">
                                        {{ mon.label }}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <template v-slot:modalFooter>
            <div
                class="flex items-center justify-end gap-4 w-full border-t border-gray-100 dark:border-gray-800 pt-8 mt-10">
                <button
                    type="button"
                    @click="accion({ accion: 'closeModal' })"
                    class="px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                    Cancelar
                </button>
                <button
                    type="button"
                    @click="accion({ accion: 'saveForm' })"
                    class="px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] bg-brand text-white hover:scale-105 transition-all shadow-xl shadow-brand/20 flex items-center gap-3">
                    <i class="bi bi-check-lg text-lg"></i>
                    Guardar Plan
                </button>
            </div>
        </template>
    </Modal>
</template>

<style scoped>
    /* Custom Date Input Icon Adjustment */
    select {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
        background-position: right 0.5rem center;
        background-repeat: no-repeat;
        background-size: 1.5em 1.5em;
    }

    .dark select {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
    }
</style>
