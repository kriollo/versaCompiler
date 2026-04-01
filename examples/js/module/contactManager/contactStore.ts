/**
 * contactStore.ts — Pinia setup store con getters
 * Prueba: setup store, computed getters, múltiples estados reactivos
 */
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export type TabId = 'all' | 'favorites' | 'recent';
export type SortField = 'name' | 'createdAt' | 'category';
export type SortDir = 'asc' | 'desc';

export const useContactStore = defineStore('contactManager', () => {
    // ── Estado ─────────────────────────────────────────────────────────────
    const activeTab = ref<TabId>('all');
    const sortField = ref<SortField>('createdAt');
    const sortDir = ref<SortDir>('desc');
    const searchQuery = ref('');
    const editingContactId = ref<string | null>(null);
    const isModalOpen = ref(false);

    // ── Getters ────────────────────────────────────────────────────────────
    const isEditing = computed(() => editingContactId.value !== null);
    const sortLabel = computed(() =>
        sortDir.value === 'asc'
            ? `↑ ${sortField.value}`
            : `↓ ${sortField.value}`,
    );

    // ── Actions ────────────────────────────────────────────────────────────
    function setTab(tab: TabId) {
        activeTab.value = tab;
    }

    function openEditModal(id: string) {
        editingContactId.value = id;
        isModalOpen.value = true;
    }

    function openCreateModal() {
        editingContactId.value = null;
        isModalOpen.value = true;
    }

    function closeModal() {
        isModalOpen.value = false;
        editingContactId.value = null;
    }

    function toggleSort(field: SortField) {
        if (sortField.value === field) {
            sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
        } else {
            sortField.value = field;
            sortDir.value = 'asc';
        }
    }

    return {
        activeTab,
        sortField,
        sortDir,
        searchQuery,
        editingContactId,
        isModalOpen,
        isEditing,
        sortLabel,
        setTab,
        openEditModal,
        openCreateModal,
        closeModal,
        toggleSort,
    };
});
