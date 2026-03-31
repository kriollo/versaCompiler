<script setup lang="ts">
/**
 * ContactList.vue — Lista con scoped slots y drag-and-drop HTML5
 * Prueba: scoped slots, HTML5 drag events, v-for con key, emits tipados
 */
import type { Contact } from '../types';

interface Props {
    contacts: Contact[];
    emptyMessage?: string;
}

withDefaults(defineProps<Props>(), {
    emptyMessage: 'No hay contactos',
});

const emit = defineEmits<{
    reorder: [ids: string[]];
    edit: [id: string];
    delete: [id: string];
    toggleFavorite: [id: string];
}>();

let draggedId: string | null = null;

function onDragStart(event: DragEvent, id: string) {
    draggedId = id;
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', id);
    }
}

function onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
    }
}

function onDrop(event: DragEvent, targetId: string, contacts: Contact[]) {
    event.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const ids = contacts.map((c) => c.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const newIds = [...ids];
    newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, draggedId);
    emit('reorder', newIds);
    draggedId = null;
}
</script>

<template>
    <div data-contact-list="true">
        <!-- Estado vacío -->
        <div
            v-if="contacts.length === 0"
            data-empty-state="true"
            class="text-center py-12 text-gray-400 dark:text-gray-500">
            <div class="text-4xl mb-3">📭</div>
            <p class="text-sm">{{ emptyMessage }}</p>
        </div>

        <!-- Lista con scoped slot para cada tarjeta -->
        <div v-else class="space-y-3">
            <div
                v-for="contact in contacts"
                :key="contact.id"
                @dragover="onDragOver"
                @drop="onDrop($event, contact.id, contacts)"
                class="transition-opacity">
                <!--
                    Scoped slot: expone el contacto y los handlers al padre.
                    El padre puede usar: v-slot="{ contact, onEdit, onDelete, onToggleFavorite, onDragStart }"
                -->
                <slot
                    :contact="contact"
                    :onEdit="() => emit('edit', contact.id)"
                    :onDelete="() => emit('delete', contact.id)"
                    :onToggleFavorite="() => emit('toggleFavorite', contact.id)"
                    :onDragStart="(e: DragEvent) => onDragStart(e, contact.id)" />
            </div>
        </div>
    </div>
</template>
