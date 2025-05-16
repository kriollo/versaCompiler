import { createInjection } from '/dashboard/js/composables/injectStrict.js';
// import type { InjectionKey } from 'vue';

export const ShowModalSubFormInjection =
    createInjection < ShowModalSubForm > 'ShowModalSubForm';

export const ShowModalFormInjection =
    createInjection < ShowModalForm > 'ShowModalForm';
