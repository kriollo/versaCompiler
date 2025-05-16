import { createInjection } from '/dashboard/js/composables/injectStrict.js';


export const ShowModalSubFormInjection =
    createInjection < ShowModalSubForm > 'ShowModalSubForm';
export const ShowModalFormInjection =
    createInjection < ShowModalForm > 'ShowModalForm';