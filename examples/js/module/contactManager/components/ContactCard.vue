<script setup lang="ts">
/**
 * ContactCard.vue — Tarjeta de contacto con named slots y defineEmits tipado
 * Prueba: named slots (#actions, #details), defineEmits con TS interface
 */
import type { Contact } from '../types';
import AccordionItem from './AccordionItem.vue';

interface Props {
    contact: Contact;
    draggable?: boolean;
}

defineProps<Props>();

interface Emits {
    edit: [id: string];
    delete: [id: string];
    toggleFavorite: [id: string];
    dragstart: [event: DragEvent, id: string];
}

const emit = defineEmits<Emits>();

const categoryColors: Record<Contact['category'], string> = {
    personal: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    trabajo: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    familia: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
};
</script>

<template>
    <div
        :data-contact-id="contact.id"
        :draggable="draggable"
        @dragstart="emit('dragstart', $event, contact.id)"
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
        <!-- Card header -->
        <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-3 min-w-0">
                <!-- Avatar inicial -->
                <div class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {{ contact.name[0]?.toUpperCase() }}
                </div>
                <div class="min-w-0">
                    <p class="font-medium text-gray-800 dark:text-gray-100 truncate">{{ contact.name }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ contact.email }}</p>
                </div>
            </div>

            <!-- Named slot: actions -->
            <div class="flex items-center gap-1 flex-shrink-0 ml-2">
                <slot name="actions" :contact="contact">
                    <!-- Default actions -->
                    <button
                        @click="emit('toggleFavorite', contact.id)"
                        :aria-label="contact.favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'"
                        :data-favorite="contact.favorite"
                        class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-lg leading-none transition-colors"
                        :class="contact.favorite ? 'text-yellow-400' : 'text-gray-300'">
                        ★
                    </button>
                    <button
                        @click="emit('edit', contact.id)"
                        aria-label="Editar contacto"
                        class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                        ✏️
                    </button>
                    <button
                        @click="emit('delete', contact.id)"
                        aria-label="Eliminar contacto"
                        class="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 text-sm">
                        🗑️
                    </button>
                </slot>
            </div>
        </div>

        <!-- Category badge -->
        <div class="px-4 pb-2">
            <span
                class="text-xs font-medium px-2 py-0.5 rounded-full"
                :class="categoryColors[contact.category]">
                {{ contact.category }}
            </span>
        </div>

        <!-- Named slot: details (en accordion) -->
        <AccordionItem title="Ver detalles">
            <slot name="details" :contact="contact">
                <div class="space-y-1 text-xs">
                    <div v-if="contact.phone">
                        <span class="font-medium">Teléfono:</span> {{ contact.phone }}
                    </div>
                    <div v-if="contact.notes">
                        <span class="font-medium">Notas:</span> {{ contact.notes }}
                    </div>
                    <div class="text-gray-400">
                        Creado: {{ new Date(contact.createdAt).toLocaleDateString() }}
                    </div>
                </div>
            </slot>
        </AccordionItem>
    </div>
</template>
