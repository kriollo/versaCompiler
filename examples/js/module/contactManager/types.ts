/**
 * types.ts — Zod schemas, tipos inferidos y barrel re-exports
 * Prueba: re-exports/barrel, z.infer<> genéricos complejos, import type
 */
import { z } from 'zod';

// ── Schemas ────────────────────────────────────────────────────────────────

export const ContactSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
    email: z.string().email('Email inválido'),
    phone: z
        .string()
        .regex(/^\+?[\d\s\-()]{7,20}$/, 'Teléfono inválido')
        .optional()
        .or(z.literal('')),
    category: z.enum(['personal', 'trabajo', 'familia']),
    favorite: z.boolean().default(false),
    notes: z.string().max(500).optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

export const ContactFormSchema = ContactSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    favorite: true,
});

export const ContactListSchema = z.array(ContactSchema);

// ── Tipos inferidos (z.infer<> genéricos complejos) ────────────────────────

export type Contact = z.infer<typeof ContactSchema>;
export type ContactFormData = z.infer<typeof ContactFormSchema>;
export type ContactCategory = Contact['category'];

export interface ContactStats {
    total: number;
    favorites: number;
    byCategory: Record<ContactCategory, number>;
}

// ── Re-exports barrel ──────────────────────────────────────────────────────

export { z } from 'zod';
