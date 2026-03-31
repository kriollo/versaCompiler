/**
 * useValidation.ts — Composable genérico de validación con Zod
 * Prueba: genéricos TS con inferencia, error type narrowing, ZodError
 */
import { ref, computed } from 'vue';
import type { ZodSchema, ZodError } from 'zod';

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function useValidation<T>(schema: ZodSchema<T>) {
    const errors = ref<FieldErrors<T>>({});
    const isValid = computed(() => Object.keys(errors.value).length === 0);

    function validate(data: unknown): data is T {
        const result = schema.safeParse(data);
        if (result.success) {
            errors.value = {};
            return true;
        }
        errors.value = formatErrors<T>(result.error);
        return false;
    }

    function clearErrors() {
        errors.value = {};
    }

    function clearField(field: keyof T) {
        const copy = { ...errors.value };
        delete copy[field];
        errors.value = copy;
    }

    return { errors, isValid, validate, clearErrors, clearField };
}

function formatErrors<T>(zodError: ZodError): FieldErrors<T> {
    const result: FieldErrors<T> = {};
    for (const issue of zodError.issues) {
        const field = issue.path[0] as keyof T;
        if (field !== undefined && !result[field]) {
            result[field] = issue.message;
        }
    }
    return result;
}
