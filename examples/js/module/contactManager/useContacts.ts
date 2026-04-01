/**
 * useContacts.ts — Composable de CRUD con localStorage
 * Prueba: watch deep, watchEffect, computed multi-dependencia, JSON parse/stringify
 */
import { ref, computed, watch } from 'vue';
import type {
    Contact,
    ContactFormData,
    ContactStats,
    ContactCategory,
} from './types';
import { ContactListSchema } from './types';

const LS_KEY = 'e2e-contacts';

function loadFromStorage(): Contact[] {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        const result = ContactListSchema.safeParse(parsed);
        if (result.success) return result.data;
        // Datos corruptos: lanzar error para que ErrorBoundary lo capture
        throw new Error(
            `Datos de contactos corruptos: ${result.error.message}`,
        );
    } catch (e) {
        if (e instanceof SyntaxError) {
            throw new Error(`JSON inválido en localStorage: ${e.message}`);
        }
        throw e;
    }
}

export function useContacts() {
    const contacts = ref<Contact[]>(loadFromStorage());

    // Deep watcher → persiste cualquier cambio en localStorage
    watch(
        contacts,
        val => {
            localStorage.setItem(LS_KEY, JSON.stringify(val));
        },
        { deep: true },
    );

    // ── Computed con múltiples dependencias ──────────────────────────────
    const favoriteContacts = computed(() =>
        contacts.value.filter(c => c.favorite),
    );

    const recentContacts = computed(() =>
        [...contacts.value]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 10),
    );

    const stats = computed<ContactStats>(() => {
        const byCategory: Record<ContactCategory, number> = {
            personal: 0,
            trabajo: 0,
            familia: 0,
        };
        for (const c of contacts.value) {
            byCategory[c.category]++;
        }
        return {
            total: contacts.value.length,
            favorites: favoriteContacts.value.length,
            byCategory,
        };
    });

    // ── CRUD ──────────────────────────────────────────────────────────────

    function addContact(data: ContactFormData): Contact {
        const now = Date.now();
        const contact: Contact = {
            ...data,
            id: crypto.randomUUID(),
            favorite: false,
            phone: data.phone ?? '',
            notes: data.notes ?? '',
            createdAt: now,
            updatedAt: now,
        };
        contacts.value = [...contacts.value, contact];
        return contact;
    }

    function updateContact(
        id: string,
        data: Partial<ContactFormData>,
    ): boolean {
        const idx = contacts.value.findIndex(c => c.id === id);
        if (idx === -1) return false;
        const updated = {
            ...contacts.value[idx],
            ...data,
            updatedAt: Date.now(),
        } as Contact;
        const list = [...contacts.value];
        list[idx] = updated;
        contacts.value = list;
        return true;
    }

    function deleteContact(id: string): boolean {
        const before = contacts.value.length;
        contacts.value = contacts.value.filter(c => c.id !== id);
        return contacts.value.length < before;
    }

    function toggleFavorite(id: string): boolean {
        const idx = contacts.value.findIndex(c => c.id === id);
        if (idx === -1) return false;
        const list = [...contacts.value];
        list[idx] = {
            ...list[idx]!,
            favorite: !list[idx]!.favorite,
            updatedAt: Date.now(),
        };
        contacts.value = list;
        return true;
    }

    function getById(id: string): Contact | undefined {
        return contacts.value.find(c => c.id === id);
    }

    return {
        contacts,
        favoriteContacts,
        recentContacts,
        stats,
        addContact,
        updateContact,
        deleteContact,
        toggleFavorite,
        getById,
    };
}
