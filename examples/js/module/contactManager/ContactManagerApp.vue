<script setup lang="ts">
    /**
     * ContactManagerApp.vue — Root del Contact Manager e2e
     * Prueba: provide, Teleport target, defineAsyncComponent, ErrorBoundary,
     *         deep watcher, computed multi-dep, scoped slots, named slots, Transition
     */
    import { ref, computed, provide, defineAsyncComponent } from 'vue';
    import type { Contact, ContactFormData } from './types';
    import { useContacts } from './useContacts';
    import { useContactStore } from './contactStore';
    import { storeToRefs } from 'pinia';

    import ErrorBoundary from './components/ErrorBoundary.vue';
    import TabPanel from './components/TabPanel.vue';
    import ContactList from './components/ContactList.vue';
    import ContactCard from './components/ContactCard.vue';
    import ContactForm from './components/ContactForm.vue';
    import ContactModal from './components/ContactModal.vue';

    // defineAsyncComponent — carga AsyncStats de forma lazy
    const AsyncStats = defineAsyncComponent({
        loader: () => import('./components/AsyncStats.vue'),
        loadingComponent: {
            template:
                '<div class="text-xs text-gray-400 p-4">Cargando estadísticas...</div>',
        },
        delay: 100,
    });

    // ── Composables ────────────────────────────────────────────────────────────
    const {
        contacts,
        favoriteContacts,
        recentContacts,
        stats,
        addContact,
        updateContact,
        deleteContact,
        toggleFavorite,
        getById,
    } = useContacts();

    const store = useContactStore();
    const { activeTab, isModalOpen, editingContactId, isEditing, searchQuery } =
        storeToRefs(store);

    // ── provide — expone searchQuery a hijos via inject ────────────────────────
    provide('searchQuery', searchQuery);

    // ── Tabs config ────────────────────────────────────────────────────────────
    const tabs = computed(() => [
        { id: 'all' as const, label: 'Todos', count: contacts.value.length },
        {
            id: 'favorites' as const,
            label: 'Favoritos',
            count: favoriteContacts.value.length,
        },
        {
            id: 'recent' as const,
            label: 'Recientes',
            count: recentContacts.value.length,
        },
    ]);

    // ── Lista filtrada según tab activo + búsqueda ─────────────────────────────
    const displayedContacts = computed<Contact[]>(() => {
        let list: Contact[];
        if (activeTab.value === 'favorites') {
            list = favoriteContacts.value;
        } else if (activeTab.value === 'recent') {
            list = recentContacts.value;
        } else {
            list = contacts.value;
        }

        const q = searchQuery.value.trim().toLowerCase();
        if (!q) return list;
        return list.filter(
            c =>
                c.name.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q),
        );
    });

    // ── Contacto en edición ────────────────────────────────────────────────────
    const editingContact = computed<Contact | undefined>(() =>
        editingContactId.value ? getById(editingContactId.value) : undefined,
    );

    // ── Handlers ──────────────────────────────────────────────────────────────
    function handleFormSubmit(data: ContactFormData) {
        if (isEditing.value && editingContactId.value) {
            updateContact(editingContactId.value, data);
        } else {
            addContact(data);
        }
        store.closeModal();
    }

    function handleReorder(newIds: string[]) {
        const sorted = newIds
            .map(id => contacts.value.find(c => c.id === id))
            .filter((c): c is Contact => c !== undefined);
        contacts.value = sorted;
    }

    // ── Estado de búsqueda ─────────────────────────────────────────────────────
    const searchInput = ref('');
    function onSearch() {
        searchQuery.value = searchInput.value;
    }
</script>

<template>
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-6">
        <div class="max-w-2xl mx-auto space-y-4">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h1
                        class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Contact Manager
                    </h1>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        VersaCompiler E2E — localStorage + Zod + Vue avanzado
                    </p>
                </div>
                <button
                    @click="store.openCreateModal()"
                    data-action="add-contact"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm">
                    + Agregar
                </button>
            </div>

            <!-- Búsqueda -->
            <div class="relative">
                <input
                    v-model="searchInput"
                    @input="onSearch"
                    placeholder="Buscar por nombre o email..."
                    data-search-input="true"
                    class="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <!-- AsyncStats (defineAsyncComponent) -->
            <ErrorBoundary>
                <AsyncStats :stats="stats" />
            </ErrorBoundary>

            <!-- Tabs con provide/inject -->
            <TabPanel :tabs="tabs" v-model="activeTab">
                <template #default="{ activeTab: tab }">
                    <!-- ContactList con scoped slots -->
                    <ErrorBoundary>
                        <ContactList
                            :contacts="displayedContacts"
                            :empty-message="
                                tab === 'favorites'
                                    ? 'No tienes contactos favoritos'
                                    : tab === 'recent'
                                      ? 'Sin contactos recientes'
                                      : 'No hay contactos. ¡Agrega el primero!'
                            "
                            @edit="store.openEditModal($event)"
                            @delete="deleteContact($event)"
                            @toggle-favorite="toggleFavorite($event)"
                            @reorder="handleReorder">
                            <!-- Scoped slot: recibe el contacto de ContactList -->
                            <template
                                #default="{
                                    contact,
                                    onEdit,
                                    onDelete,
                                    onToggleFavorite,
                                    onDragStart,
                                }">
                                <ContactCard
                                    :contact="contact"
                                    draggable
                                    @dragstart="onDragStart"
                                    @edit="onEdit"
                                    @delete="onDelete"
                                    @toggle-favorite="onToggleFavorite">
                                    <!-- Named slot #actions personalizado -->
                                    <template #actions="{ contact: c }">
                                        <button
                                            @click="onToggleFavorite()"
                                            :data-favorite="c.favorite"
                                            :aria-label="
                                                c.favorite
                                                    ? 'Quitar de favoritos'
                                                    : 'Marcar favorito'
                                            "
                                            class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-lg leading-none"
                                            :class="
                                                c.favorite
                                                    ? 'text-yellow-400'
                                                    : 'text-gray-300'
                                            ">
                                            ★
                                        </button>
                                        <button
                                            @click="onEdit()"
                                            aria-label="Editar"
                                            class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">
                                            ✏️
                                        </button>
                                        <button
                                            @click="onDelete()"
                                            aria-label="Eliminar"
                                            class="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-sm">
                                            🗑️
                                        </button>
                                    </template>
                                </ContactCard>
                            </template>
                        </ContactList>
                    </ErrorBoundary>
                </template>
            </TabPanel>
        </div>

        <!-- Modal con Teleport (renderiza en #modal-target) -->
        <ContactModal
            :title="isEditing ? 'Editar contacto' : 'Nuevo contacto'"
            v-model="isModalOpen">
            <template #body>
                <ContactForm
                    :initial-data="editingContact"
                    @submit="handleFormSubmit"
                    @cancel="store.closeModal()" />
            </template>
            <template #footer>
                <!-- Footer vacío: el form tiene sus propios botones -->
            </template>
        </ContactModal>
    </div>
</template>
