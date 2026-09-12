<script setup lang="ts">
    import { computed, ref, watch } from 'vue';

    import { useFolders } from '@/dashboard/js/dms/composables/useFolders';
    import type { DMSFolder } from '@/dashboard/js/dms/types';

    // Nombre del componente necesario para permitir recursión en <script setup>
    defineOptions({ name: 'FolderNode' });

    interface Props {
        folder: DMSFolder;
        depth?: number;
        activeFolderId?: number | null;
        /** Se incrementa desde FolderTree cada vez que el árbol cambia (crear/renombrar/eliminar/restaurar), para invalidar la caché de hijos de este nodo aunque esté anidado. */
        version?: number;
        /** Cadena de IDs (raíz → destino) que FolderTree quiere revelar, p. ej. tras crear una carpeta. Si este nodo es el siguiente eslabón, se auto-expande y recarga sus hijos. */
        expandPath?: number[];
    }

    const props = withDefaults(defineProps<Props>(), {
            depth: 0,
            activeFolderId: null,
            version: 0,
            expandPath: [],
        }),

        emit = defineEmits<{
            select: [folder: DMSFolder];
            refresh: [];
            deleteFolder: [folder: DMSFolder];
        }>(),

        // Normalizar expandPath para garantizar que siempre sea un arreglo (evita warnings de TS sobre 'posiblemente undefined')
        safeExpandPath = computed<number[]>(() => props.expandPath ?? []),        { folders: childFolders, fetchFolders } = useFolders(),
        isOpen = ref(false),
        childrenLoaded = ref(false),
        localChildren = ref<DMSFolder[]>([]);

    async function loadChildren(): Promise<void> {
        await fetchFolders(props.folder.id);
        localChildren.value = childFolders.value;
        childrenLoaded.value = true;
    }

    async function toggle(): Promise<void> {
        if (!isOpen.value && !childrenLoaded.value) {
            await loadChildren();
        }
        isOpen.value = !isOpen.value;
    }

    watch(
        () => props.version,
        async () => {
            if (isOpen.value) {
                await loadChildren();
            } else {
                childrenLoaded.value = false;
            }
        },
    );

    const childExpandPath = computed<number[]>(() =>
        safeExpandPath.value.length > 0 && safeExpandPath.value[0] === props.folder.id ? safeExpandPath.value.slice(1) : [],
    );

    watch(
        () => props.expandPath,
        async path => {
            if (path.length > 0 && path[0] === props.folder.id) {
                await loadChildren();
                isOpen.value = true;
            }
        },
        { immediate: true },
    );

    function selectFolder(): void {
        emit('select', props.folder);
    }

    function deleteFolder(): void {
        emit('deleteFolder', props.folder);
    }
</script>

<template>
    <div :class="['pl-' + depth * 3]">
        <div
            :class="[
                'group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors',
                activeFolderId === folder.id
                    ? 'bg-brand text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
            ]">
            <button class="w-4 h-4 flex-shrink-0 flex items-center justify-center" @click.stop="toggle">
                <svg
                    :class="['w-3 h-3 transition-transform', isOpen ? 'rotate-90' : '']"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                </svg>
            </button>

            <svg
                class="w-4 h-4 flex-shrink-0"
                :class="activeFolderId === folder.id ? 'text-white' : 'text-yellow-400'"
                fill="currentColor"
                viewBox="0 0 24 24">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            </svg>

            <span class="flex-1 truncate" @click="selectFolder">{{ folder.name }}</span>

            <button
                class="w-5 h-5 flex-shrink-0 items-center justify-center rounded hidden group-hover:flex"
                :class="
                    activeFolderId === folder.id
                        ? 'hover:bg-white/20 text-white'
                        : 'hover:bg-red-100 dark:hover:bg-red-900/40 text-gray-400 hover:text-red-500'
                "
                title="Eliminar carpeta"
                @click.stop="deleteFolder">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2" />
                </svg>
            </button>
        </div>

        <div v-if="isOpen && localChildren.length > 0" class="ml-2 border-l border-gray-200 dark:border-gray-700">
            <FolderNode
                v-for="child in localChildren"
                :key="child.id"
                :folder="child"
                :depth="depth + 1"
                :active-folder-id="activeFolderId"
                :version="version"
                :expand-path="childExpandPath"
                @select="emit('select', $event)"
                @refresh="emit('refresh')"
                @delete-folder="emit('deleteFolder', $event)" />
        </div>
    </div>
</template>
