<script setup lang="ts">
    import { computed } from 'vue';

    import type { FlowNode, NodeConfig } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

    interface Props {
        modelValue: NodeConfig;
        node: FlowNode;
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
</script>

<template>
    <div class="space-y-4">
        <div
            class="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 space-y-2">
            <p class="font-semibold flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Puertos del nodo
            </p>
            <div class="border-t border-emerald-200 dark:border-emerald-700 pt-2 mt-2">
                <p class="font-semibold mb-1">Entradas:</p>
                <p>
                    •
                    <span class="font-mono">0</span>
                    : Consulta cache (check)
                </p>
                <p>
                    •
                    <span class="font-mono">1</span>
                    : Guardar en cache (set)
                </p>
            </div>
            <div class="border-t border-emerald-200 dark:border-emerald-700 pt-2 mt-2">
                <p class="font-semibold mb-1">Salidas:</p>
                <p>
                    •
                    <span class="font-mono">0</span>
                    : Cache HIT / Después de SET
                </p>
                <p>
                    •
                    <span class="font-mono">1</span>
                    : Cache MISS
                </p>
            </div>
        </div>

        <div class="flex items-center gap-2">
            <input
                type="checkbox"
                v-model="localConfig.cacheEnabled"
                class="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand dark:focus:ring-brand dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
            <label class="text-sm text-gray-700 dark:text-gray-300">Habilitar cache</label>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alcance del cache</label>
            <select
                v-model="localConfig.cacheScope"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="global">🌐 Global (compartido entre usuarios)</option>
                <option value="user">👤 Por usuario (datos personalizados)</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">
                <span v-if="localConfig.cacheScope === 'global'" class="text-blue-600 dark:text-blue-400">
                    Los datos se comparten entre todos los usuarios de la troncal
                </span>
                <span v-else class="text-purple-600 dark:text-purple-400">
                    Cada usuario tiene su propia copia de los datos
                </span>
            </p>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de expiración</label>
            <select
                v-model="localConfig.cacheExpiryType"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="ttl">⏱️ Temporal (con TTL)</option>
                <option value="permanent">♾️ Permanente (sin expiración)</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">
                <span v-if="localConfig.cacheExpiryType === 'permanent'" class="text-green-600 dark:text-green-400">
                    El cache no expira, ideal para datos maestros y configuraciones
                </span>
                <span v-else class="text-orange-600 dark:text-orange-400">
                    El cache expira según el TTL configurado abajo
                </span>
            </p>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Clave de cache</label>
            <input
                v-model="localConfig.cacheKey"
                type="text"
                placeholder="feriados_{{feriados_year}}"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
            <p class="text-xs text-gray-500 mt-1" v-pre>Usa {{ variable }} para claves dinámicas</p>
        </div>

        <div v-if="localConfig.cacheExpiryType !== 'permanent'">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TTL (segundos)</label>
            <input
                v-model.number="localConfig.cacheTtlSeconds"
                type="number"
                min="1"
                placeholder="3600"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            <p class="text-xs text-gray-500 mt-1">Tiempo de vida del cache (default: 3600 = 1 hora)</p>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Variable origen (datos a cachear)
            </label>
            <input
                v-model="localConfig.cacheSourceVariable"
                type="text"
                placeholder="feriados_list"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            <p class="text-xs text-gray-500 mt-1">Variable que contiene los datos de la API</p>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Variable destino (datos cacheados)
            </label>
            <input
                v-model="localConfig.cacheVariable"
                type="text"
                placeholder="cached_feriados"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            <p class="text-xs text-gray-500 mt-1">Variable donde se guardan los datos del cache</p>
        </div>

        <div
            class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-xs text-blue-700 dark:text-blue-300">
            <p class="font-semibold mb-2">Flujo típico:</p>
            <ol class="list-decimal list-inside space-y-1">
                <li>Consulta → Cache (entrada 0)</li>
                <li>MISS → API call</li>
                <li>API response → Cache (entrada 1, SET)</li>
                <li>Cache HIT → Mostrar datos</li>
            </ol>
        </div>
    </div>
</template>
