<script setup lang="ts">
    import { computed } from 'vue';

    import ExpandableTextarea from '@/dashboard/js/chatbot/flowBuilder/components/ExpandableTextarea.vue';
    import type {
        FlowNode,
        InteractiveListRowConfig,
        NodeConfig,
    } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

    interface Props {
        modelValue: NodeConfig;
        node: FlowNode;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<{
        'update:modelValue': [val: NodeConfig];
        openMediaStore: [];
    }>();

    const localConfig = computed<any>({
        get: () => props.modelValue,
        set: (val: any) => {
            emit('update:modelValue', val);
        },
    });

    // Opciones para selectores
    const messageChannelTargets = [
        { value: 'generic', label: 'Genérico / Múltiples' },
        { value: 'whatsapp', label: 'WhatsApp' },
    ];

    const messageChannelTypes = [
        { value: 'standard', label: 'Estándar (Texto/Media)' },
        { value: 'interactive_buttons', label: 'Botones Interactivos' },
        { value: 'interactive_list', label: 'Lista Interactiva' },
        { value: 'template', label: 'Plantilla (WhatsApp)' },
    ];

    const messageTypes = [
        { value: 'text', label: 'Texto' },
        { value: 'image', label: 'Imagen' },
        { value: 'video', label: 'Video' },
        { value: 'audio', label: 'Audio' },
        { value: 'file', label: 'Documento/Archivo' },
    ];

    const templateButtonTypes = [
        { value: 'quick_reply', label: 'Respuesta rápida' },
        { value: 'url', label: 'URL' },
    ];

    // Helper para generar IDs únicos
    const makeUniqueId = (prefix: string): string =>
        `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const addInteractiveButton = () => {
        localConfig.value.interactiveButtons = [
            ...(localConfig.value.interactiveButtons || []),
            {
                id: makeUniqueId('btn'),
                title: '',
            },
        ];
    };

    const removeInteractiveButton = (index: number) => {
        const buttons = [...(localConfig.value.interactiveButtons || [])];
        buttons.splice(index, 1);
        localConfig.value.interactiveButtons = buttons;
    };

    const addInteractiveListSection = () => {
        localConfig.value.interactiveListSections = [
            ...(localConfig.value.interactiveListSections || []),
            {
                title: '',
                rows: [],
            },
        ];
    };

    const removeInteractiveListSection = (index: number) => {
        const sections = [...(localConfig.value.interactiveListSections || [])];
        sections.splice(index, 1);
        localConfig.value.interactiveListSections = sections;
    };

    const addInteractiveListRow = (sectionIndex: number) => {
        const sections = localConfig.value.interactiveListSections;
        if (!sections) {
            return;
        }

        const newSections = JSON.parse(JSON.stringify(sections));
        const section = newSections[sectionIndex];
        if (!section) {
            return;
        }

        if (!section.rows) {
            section.rows = [];
        }
        const row: InteractiveListRowConfig = {
            id: makeUniqueId('row'),
            title: '',
            description: '',
        };
        section.rows.push(row);
        localConfig.value.interactiveListSections = newSections;
    };

    const removeInteractiveListRow = (sectionIndex: number, rowIndex: number) => {
        const sections = localConfig.value.interactiveListSections;
        if (!sections) {
            return;
        }

        const newSections = JSON.parse(JSON.stringify(sections));
        const section = newSections[sectionIndex];
        if (!section || !section.rows) {
            return;
        }

        section.rows.splice(rowIndex, 1);
        localConfig.value.interactiveListSections = newSections;
    };

    const addTemplateParam = () => {
        localConfig.value.templateParams = [
            ...(localConfig.value.templateParams || []),
            {
                key: '',
                value: '',
            },
        ];
    };

    const removeTemplateParam = (index: number) => {
        const params = [...(localConfig.value.templateParams || [])];
        params.splice(index, 1);
        localConfig.value.templateParams = params;
    };

    const addTemplateButton = () => {
        localConfig.value.templateButtons = [
            ...(localConfig.value.templateButtons || []),
            {
                type: 'quick_reply',
                text: '',
                payload: '',
                url: '',
            },
        ];
    };

    const removeTemplateButton = (index: number) => {
        const buttons = [...(localConfig.value.templateButtons || [])];
        buttons.splice(index, 1);
        localConfig.value.templateButtons = buttons;
    };
</script>

<template>
    <div class="space-y-4">
        <!-- (Mismo template anterior pero actualizado con las correcciones si las hubiera) -->
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Canal destino</label>
            <select
                v-model="localConfig.messageChannelTarget"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent">
                <option v-for="target in messageChannelTargets" :key="target.value" :value="target.value">
                    {{ target.label }}
                </option>
            </select>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modo de mensaje</label>
            <select
                v-model="localConfig.messageChannelType"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent">
                <option v-for="mode in messageChannelTypes" :key="mode.value" :value="mode.value">
                    {{ mode.label }}
                </option>
            </select>
        </div>

        <template v-if="!localConfig.messageChannelType || localConfig.messageChannelType === 'standard'">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Mensaje</label>
                <select
                    v-model="localConfig.messageType"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent">
                    <option v-for="type in messageTypes" :key="type.value" :value="type.value">
                        {{ type.label }}
                    </option>
                </select>
            </div>
            <ExpandableTextarea
                v-model="localConfig.message"
                :label="
                    localConfig.messageType && localConfig.messageType !== 'text' ? 'Caption (opcional)' : 'Mensaje'
                "
                :rows="localConfig.messageType && localConfig.messageType !== 'text' ? 2 : 4"
                modal-title="Mensaje" />

            <div v-if="localConfig.messageType && localConfig.messageType !== 'text'">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL del recurso</label>
                <input
                    v-model="localConfig.messageMediaUrl"
                    type="text"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand" />
                <button
                    type="button"
                    @click="emit('openMediaStore')"
                    class="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand text-white hover:bg-brand-600 transition-colors">
                    Abrir biblioteca por empresa
                </button>
            </div>

            <div v-if="localConfig.messageType && localConfig.messageType !== 'text'">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    MIME type (opcional)
                </label>
                <input
                    v-model="localConfig.messageMediaMime"
                    type="text"
                    placeholder="image/jpeg"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>

            <div v-if="localConfig.messageType === 'file'">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre del archivo (opcional)
                </label>
                <input
                    v-model="localConfig.messageFileName"
                    type="text"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
        </template>

        <template v-else-if="localConfig.messageChannelType === 'interactive_buttons'">
            <ExpandableTextarea
                v-model="localConfig.message"
                label="Texto principal"
                :rows="3"
                modal-title="Texto principal" />

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Botones</label>
                    <button
                        type="button"
                        @click="addInteractiveButton"
                        class="px-2 py-1 text-xs font-medium text-brand hover:underline">
                        Agregar botón
                    </button>
                </div>

                <div
                    v-for="(button, index) in localConfig.interactiveButtons"
                    :key="button.id || index"
                    class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                    <input
                        v-model="button.title"
                        type="text"
                        placeholder="Texto del botón"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                    <input
                        v-model="button.id"
                        type="text"
                        placeholder="ID interno"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono" />
                    <button
                        type="button"
                        @click="removeInteractiveButton(index)"
                        class="w-full px-2 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                        Eliminar botón
                    </button>
                </div>
            </div>
        </template>

        <template v-else-if="localConfig.messageChannelType === 'interactive_list'">
            <ExpandableTextarea
                v-model="localConfig.message"
                label="Texto principal"
                :rows="3"
                modal-title="Texto principal" />
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Texto botón de lista
                </label>
                <input
                    v-model="localConfig.interactiveListButtonText"
                    type="text"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Secciones</label>
                    <button
                        type="button"
                        @click="addInteractiveListSection"
                        class="px-2 py-1 text-xs font-medium text-brand hover:underline">
                        Agregar sección
                    </button>
                </div>

                <div
                    v-for="(section, sectionIndex) in localConfig.interactiveListSections"
                    :key="sectionIndex"
                    class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                    <input
                        v-model="section.title"
                        type="text"
                        placeholder="Título de sección"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                    <div
                        v-for="(row, rowIndex) in section.rows"
                        :key="row.id || rowIndex"
                        class="p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 space-y-2">
                        <input
                            v-model="row.title"
                            type="text"
                            placeholder="Título"
                            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                        <input
                            v-model="row.id"
                            type="text"
                            placeholder="ID"
                            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono" />
                        <input
                            v-model="row.description"
                            type="text"
                            placeholder="Descripción"
                            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                        <button
                            type="button"
                            @click="removeInteractiveListRow(sectionIndex, rowIndex)"
                            class="w-full px-2 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                            Eliminar fila
                        </button>
                    </div>
                    <button
                        type="button"
                        @click="addInteractiveListRow(sectionIndex)"
                        class="w-full px-2 py-1.5 text-xs font-medium text-brand border border-dashed border-brand/40 hover:bg-brand-50 transition-colors">
                        + Agregar fila
                    </button>
                    <button
                        type="button"
                        @click="removeInteractiveListSection(sectionIndex)"
                        class="w-full px-2 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                        Eliminar sección
                    </button>
                </div>
            </div>
        </template>

        <template v-else-if="localConfig.messageChannelType === 'template'">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre plantilla</label>
                <input
                    v-model="localConfig.templateName"
                    type="text"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Idioma</label>
                <input
                    v-model="localConfig.templateLanguage"
                    type="text"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>

            <div class="space-y-4 pt-2">
                <div class="flex items-center justify-between">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Parámetros</label>
                    <button
                        type="button"
                        @click="addTemplateParam"
                        class="px-2 py-1 text-xs font-medium text-brand hover:underline">
                        Agregar parámetro
                    </button>
                </div>
                <div
                    v-for="(param, index) in localConfig.templateParams"
                    :key="index"
                    class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                    <input
                        v-model="param.key"
                        type="text"
                        placeholder="key"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded" />
                    <input
                        v-model="param.value"
                        type="text"
                        placeholder="value"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded" />
                    <button
                        type="button"
                        @click="removeTemplateParam(index)"
                        class="w-full px-2 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                        Eliminar
                    </button>
                </div>
            </div>

            <div class="space-y-4 pt-2">
                <div class="flex items-center justify-between">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Botones</label>
                    <button
                        type="button"
                        @click="addTemplateButton"
                        class="px-2 py-1 text-xs font-medium text-brand hover:underline">
                        Agregar botón
                    </button>
                </div>
                <div
                    v-for="(button, index) in localConfig.templateButtons"
                    :key="index"
                    class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                    <select
                        v-model="button.type"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                        <option v-for="type in templateButtonTypes" :key="type.value" :value="type.value">
                            {{ type.label }}
                        </option>
                    </select>
                    <input
                        v-model="button.text"
                        type="text"
                        placeholder="Texto"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded" />
                    <input
                        v-if="button.type === 'quick_reply'"
                        v-model="button.payload"
                        type="text"
                        placeholder="payload"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded font-mono" />
                    <input
                        v-else
                        v-model="button.url"
                        type="text"
                        placeholder="https://"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded font-mono" />
                    <button
                        type="button"
                        @click="removeTemplateButton(index)"
                        class="w-full px-2 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                        Eliminar
                    </button>
                </div>
            </div>
        </template>
    </div>
</template>
