<script setup lang="ts">
    import { computed, ref } from 'vue';

    import ExpandableTextarea from '@/dashboard/js/chatbot/flowBuilder/components/ExpandableTextarea.vue';
    import type { FlowNode, NodeConfig } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

    interface Props {
        modelValue: NodeConfig;
        node: FlowNode;
        env?: {
            panelUrl?: string;
            empresaSelected?: string;
            csrf_token?: string;
        };
    }

    const props = defineProps<Props>();
    const emit = defineEmits<{
        'update:modelValue': [val: NodeConfig];
    }>();

    const localConfig = computed<NodeConfig>({
        get: () => props.modelValue,
        set: val => {
            emit('update:modelValue', val);
        },
    });

    const apiMethods = [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
        { value: 'PATCH', label: 'PATCH' },
    ];

    const apiResponseFormats = [
        { value: 'json', label: 'JSON' },
        { value: 'text', label: 'Texto' },
        { value: 'number', label: 'Número' },
        { value: 'boolean', label: 'Booleano' },
    ];

    const authTypes = [
        { value: 'none', label: 'Sin autenticación' },
        { value: 'basic', label: 'Basic Auth' },
        { value: 'bearer', label: 'Bearer Token' },
        { value: 'api_key', label: 'API Key (Header)' },
    ];

    const isApiProbeLoading = ref(false);
    const apiProbeError = ref('');
    const apiProbePreview = ref('');

    const handleProbeApi = async () => {
        isApiProbeLoading.value = true;
        apiProbeError.value = '';
        apiProbePreview.value = '';

        try {
            await new Promise<void>(resolve => {
                setTimeout(resolve, 500);
            });
            apiProbePreview.value = JSON.stringify({ simulated: true, message: 'Test mode' }, null, 2);
        } catch (error: any) {
            apiProbeError.value = error?.message || 'Error al probar API';
        } finally {
            isApiProbeLoading.value = false;
        }
    };
</script>

<template>
    <div class="space-y-4">
        <div
            class="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs text-indigo-700 dark:text-indigo-300 space-y-1">
            <p>
                <span class="font-semibold">Puerto de salida 1:</span>
                Éxito (OK)
            </p>
            <p>
                <span class="font-semibold">Puerto de salida 2:</span>
                Error
            </p>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método HTTP</label>
            <select
                v-model="localConfig.apiMethod"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option v-for="method in apiMethods" :key="method.value" :value="method.value">
                    {{ method.label }}
                </option>
            </select>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
            <input
                v-model="localConfig.apiUrl"
                type="text"
                placeholder="https://api.ejemplo.com/endpoint"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>

        <ExpandableTextarea
            v-model="localConfig.apiBody"
            label="Body (JSON)"
            placeholder='{"key": "value"}'
            :rows="4"
            modal-title="Body (JSON)"
            monospace />

        <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
            <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Headers Personalizados
            </h4>
            <div class="space-y-2">
                <div v-for="(header, idx) in localConfig.apiHeaders || []" :key="idx" class="flex gap-2">
                    <input
                        v-model="(localConfig.apiHeaders as any[])[idx].key"
                        type="text"
                        placeholder="Header"
                        class="flex-1 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                    <input
                        v-model="(localConfig.apiHeaders as any[])[idx].value"
                        type="text"
                        placeholder="Valor"
                        class="flex-1 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                    <button
                        type="button"
                        @click="(localConfig.apiHeaders as any[]).splice(Number(idx), 1)"
                        class="px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                        ✕
                    </button>
                </div>
                <button
                    type="button"
                    @click="
                        () => {
                            if (!localConfig.apiHeaders) localConfig.apiHeaders = [];
                            (localConfig.apiHeaders as any[]).push({ key: '', value: '' });
                        }
                    "
                    class="w-full px-3 py-1.5 text-xs text-brand border border-brand rounded hover:bg-brand-50 dark:hover:bg-brand-900/20">
                    + Agregar Header
                </button>
            </div>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
            <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Autenticación
            </h4>
            <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Autenticación
                </label>
                <select
                    v-model="localConfig.httpAuthType"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option v-for="auth in authTypes" :key="auth.value" :value="auth.value">
                        {{ auth.label }}
                    </option>
                </select>
            </div>
            <template v-if="localConfig.httpAuthType && localConfig.httpAuthType !== 'none'">
                <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {{ localConfig.httpAuthType === 'api_key' ? 'Nombre del Header' : 'Header' }}
                    </label>
                    <input
                        v-model="localConfig.httpAuthHeader"
                        type="text"
                        :placeholder="localConfig.httpAuthType === 'api_key' ? 'X-API-Key' : 'Authorization'"
                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Valor / Token</label>
                    <input
                        v-model="localConfig.httpAuthValue"
                        type="password"
                        placeholder="..."
                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
            </template>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
            <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Respuesta
            </h4>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Formato de Respuesta
                </label>
                <select
                    v-model="localConfig.apiResponseFormat"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option v-for="format in apiResponseFormats" :key="format.value" :value="format.value">
                        {{ format.label }}
                    </option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Guardar respuesta en variable
                </label>
                <input
                    v-model="localConfig.apiResponseVariable"
                    type="text"
                    placeholder="api_result"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div v-if="localConfig.apiResponseFormat === 'json'">
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ruta JSON (opcional)
                </label>
                <p class="text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                    Si se deja vacío, se guardará toda la respuesta JSON.
                </p>
                <input
                    v-model="localConfig.apiResponsePath"
                    type="text"
                    placeholder="data.user.name"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
            </div>
        </div>

        <div class="space-y-2">
            <button
                type="button"
                @click="handleProbeApi"
                :disabled="isApiProbeLoading"
                class="w-full px-3 py-2 text-sm font-medium bg-brand hover:bg-brand-600 dark:bg-brand dark:hover:bg-brand-600 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                {{ isApiProbeLoading ? 'Probando API...' : 'Probar API' }}
            </button>

            <p v-if="apiProbeError" class="text-xs text-red-600 dark:text-red-400">
                {{ apiProbeError }}
            </p>

            <div
                v-if="apiProbePreview"
                class="p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <p class="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Respuesta detectada</p>
                <pre
                    class="text-[11px] text-gray-800 dark:text-gray-200 max-h-36 overflow-y-auto whitespace-pre-wrap break-words"
                    >{{ apiProbePreview }}</pre
                >
            </div>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
            <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reintentos Automáticos
            </h4>
            <div class="flex items-center gap-2">
                <input
                    type="checkbox"
                    v-model="localConfig.apiRetryEnabled"
                    class="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand dark:focus:ring-brand dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                <label class="text-sm text-gray-700 dark:text-gray-300">Habilitar reintentos en caso de error</label>
            </div>
            <template v-if="localConfig.apiRetryEnabled">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Cantidad de reintentos
                        </label>
                        <input
                            v-model.number="localConfig.apiRetryCount"
                            type="number"
                            min="1"
                            max="5"
                            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Delay base (ms)
                        </label>
                        <input
                            v-model.number="localConfig.apiRetryDelay"
                            type="number"
                            min="100"
                            step="100"
                            placeholder="1000"
                            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Estrategia de backoff
                    </label>
                    <select
                        v-model="localConfig.apiRetryBackoff"
                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <option value="exponential">Exponencial (1s, 2s, 4s...)</option>
                        <option value="linear">Lineal (1s, 2s, 3s...)</option>
                        <option value="fixed">Fijo (siempre igual)</option>
                    </select>
                </div>
            </template>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Timeout (ms)</label>
                    <input
                        v-model.number="localConfig.httpTimeout"
                        type="number"
                        min="1000"
                        step="1000"
                        placeholder="30000"
                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
            </div>
        </div>
    </div>
</template>
