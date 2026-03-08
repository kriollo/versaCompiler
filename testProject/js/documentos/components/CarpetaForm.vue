<template>
    <Modal :id-modal="`carpeta-form-modal`" :show-modal="true" size="max-w-lg" @accion="$emit('cerrar')">
        <template #modalTitle>
            <div class="flex justify-between items-center">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    <i class="bi bi-folder-plus me-2 text-brand dark:text-brand-400"></i>
                    {{ carpeta ? 'Editar Carpeta' : 'Nueva Carpeta' }}
                </h3>
                <button
                    type="button"
                    class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                    @click="$emit('cerrar')">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        </template>

        <template #modalBody>
            <form @submit.prevent="guardar" class="space-y-6">
                <div>
                    <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        <i class="bi bi-folder me-1"></i>
                        Nombre de la carpeta
                    </label>
                    <input
                        type="text"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand dark:focus:border-brand"
                        v-model="form.nombre"
                        required
                        placeholder="Ingrese el nombre de la carpeta"
                        autofocus />
                </div>

                <div v-if="!carpeta">
                    <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        <i class="bi bi-folder-symlink me-1"></i>
                        Carpeta padre (opcional)
                    </label>
                    <select
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand dark:focus:border-brand"
                        v-model="form.parent_id">
                        <option value="">📁 Carpeta raíz</option>
                        <option v-for="carpetaOp in carpetasPlanas" :key="carpetaOp.id" :value="carpetaOp.id">
                            📂 {{ carpetaOp.path }}
                        </option>
                    </select>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Seleccione una carpeta padre si desea crear una subcarpeta
                    </p>
                </div>
            </form>
        </template>

        <template #modalFooter>
            <button
                type="button"
                class="py-2.5 px-5 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-brand-600 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
                @click="$emit('cerrar')">
                <i class="bi bi-x-circle me-1"></i>
                Cancelar
            </button>
            <button
                type="button"
                class="text-white bg-brand-600 hover:bg-brand-700 focus:ring-4 focus:ring-brand/30 font-medium rounded-lg text-sm px-5 py-2.5 me-2 dark:bg-brand dark:hover:bg-brand-600 focus:outline-none dark:focus:ring-brand-600"
                @click="guardar"
                :disabled="!form.nombre.trim()">
                <i class="bi bi-check-circle me-1"></i>
                {{ carpeta ? 'Actualizar' : 'Crear' }}
            </button>
        </template>
    </Modal>
</template>

<script setup lang="ts">
    import { computed, onMounted, ref } from 'vue';

    import Modal from '@/dashboard/js/components/modal.vue';

    interface Carpeta {
        id: number;
        nombre: string;
        parent_id?: number;
        hijos?: Carpeta[];
    }

    const props = defineProps<{
        carpeta?: Carpeta | null;
        carpetas: Carpeta[];
        clienteId: string;
    }>();

    const emit = defineEmits<{
        guardar: [datos: any];
        cerrar: [];
    }>();

    const form = ref({
        nombre: '',
        parent_id: '',
        cliente_id: props.clienteId,
    });

    const carpetasPlanas = computed(() => {
        const resultado: { id: number; path: string }[] = [];

        const procesar = (carpetas: Carpeta[], prefijo = '') => {
            for (const carpeta of carpetas) {
                const path = prefijo + carpeta.nombre;
                resultado.push({ id: carpeta.id, path });

                if (carpeta.hijos) {
                    procesar(carpeta.hijos, `${path} > `);
                }
            }
        };

        procesar(props.carpetas);
        return resultado;
    });

    const guardar = () => {
        if (!form.value.nombre.trim()) {
            return;
        }

        const datos: any = {
            nombre: form.value.nombre.trim(),
        };

        if (form.value.parent_id) {
            datos.parent_id = form.value.parent_id;
        }

        emit('guardar', datos);
    };

    onMounted(() => {
        if (props.carpeta) {
            form.value.nombre = props.carpeta.nombre;
            form.value.parent_id = props.carpeta.parent_id?.toString() || '';
        }
    });
</script>
