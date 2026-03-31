<script setup lang="ts">
/**
 * ContactForm.vue — Formulario con v-model custom, template refs y validación zod
 * Prueba: template refs, v-model en FormField custom, error display, zod validation
 */
import { ref, watch } from 'vue';
import type { Contact, ContactFormData } from '../types';
import { ContactFormSchema } from '../types';
import { useValidation } from '../useValidation';
import FormField from './FormField.vue';

interface Props {
    initialData?: Partial<Contact>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
    submit: [data: ContactFormData];
    cancel: [];
}>();

// Template ref
const nameInputRef = ref<InstanceType<typeof FormField> | null>(null);

const { errors, validate, clearErrors } = useValidation(ContactFormSchema);

// Estado del formulario
const form = ref<ContactFormData>({
    name: props.initialData?.name ?? '',
    email: props.initialData?.email ?? '',
    phone: props.initialData?.phone ?? '',
    category: props.initialData?.category ?? 'personal',
    notes: props.initialData?.notes ?? '',
});

// Watch initialData para actualizar cuando se cambia el contacto a editar
watch(
    () => props.initialData,
    (newData) => {
        if (newData) {
            form.value = {
                name: newData.name ?? '',
                email: newData.email ?? '',
                phone: newData.phone ?? '',
                category: newData.category ?? 'personal',
                notes: newData.notes ?? '',
            };
            clearErrors();
        }
    },
    { deep: true },
);

const categoryOptions = [
    { value: 'personal', label: 'Personal' },
    { value: 'trabajo', label: 'Trabajo' },
    { value: 'familia', label: 'Familia' },
];

function handleSubmit() {
    if (validate(form.value)) {
        emit('submit', form.value);
    }
}

function handleCancel() {
    clearErrors();
    emit('cancel');
}
</script>

<template>
    <form @submit.prevent="handleSubmit" data-contact-form="true" novalidate class="space-y-4">
        <FormField
            ref="nameInputRef"
            name="name"
            label="Nombre"
            placeholder="Ej: María García"
            :error="errors['name']"
            required
            v-model="form.name" />

        <FormField
            name="email"
            label="Email"
            type="email"
            placeholder="ejemplo@correo.com"
            :error="errors['email']"
            required
            v-model="form.email" />

        <FormField
            name="phone"
            label="Teléfono"
            type="tel"
            placeholder="+34 600 000 000"
            :error="errors['phone']"
            v-model="form.phone" />

        <FormField
            name="category"
            label="Categoría"
            type="select"
            :options="categoryOptions"
            :error="errors['category']"
            required
            v-model="form.category" />

        <FormField
            name="notes"
            label="Notas"
            type="textarea"
            placeholder="Notas adicionales..."
            :error="errors['notes']"
            v-model="form.notes" />

        <div class="flex justify-end gap-2 pt-2">
            <button
                type="button"
                @click="handleCancel"
                class="px-4 py-2 text-sm rounded-lg border dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
            </button>
            <button
                type="submit"
                class="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
                {{ initialData ? 'Guardar cambios' : 'Agregar contacto' }}
            </button>
        </div>
    </form>
</template>
