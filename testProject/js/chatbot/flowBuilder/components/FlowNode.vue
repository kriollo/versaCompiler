<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { computed, ref } from 'vue';

    import type { FlowNode as FlowNodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
    import { getNodeDefinition } from '@/dashboard/js/chatbot/flowBuilder/types/nodeDefinitions';
    import { getInputPortLabel, getOutputPortLabel } from '@/dashboard/js/chatbot/flowBuilder/types/portLabels';

    interface Props {
        node: FlowNodeType;
        zoom: number;
        isActive?: boolean;
        isVisited?: boolean;
        isSelected?: boolean;
        isSelectionMode?: boolean;
        validationState?: 'error' | 'warning' | null;
    }

    const props = withDefaults(defineProps<Props>(), {
        zoom: 1,
        isActive: false,
        isVisited: false,
        isSelected: false,
        isSelectionMode: false,
        validationState: null,
    });

    const validationBadgeText = computed(() => {
        if (props.validationState === 'error') {
            return 'Error';
        }

        if (props.validationState === 'warning') {
            return 'Advertencia';
        }

        return '';
    });

    const emit = defineEmits<{
        select: [nodeId: string];
        delete: [nodeId: string];
        connectStart: [nodeId: string, portIndex: number, portType: 'input' | 'output'];
        connectEnd: [nodeId: string, portIndex: number];
        nodeMove: [nodeId: string, deltaX: number, deltaY: number];
        dblclick: [nodeId: string];
    }>();

    const isDragging = ref(false);
    const dragStart = ref({ x: 0, y: 0 });
    const isMouseDown = ref(false);
    const hasMoved = ref(false);
    const dragThreshold = 5; // Píxeles que debe moverse antes de considerarse drag

    const nodeDefinition = computed(() => getNodeDefinition(props.node.type));

    const outputPortsCount = computed(() => {
        if (props.node.type === 'menu') {
            if (props.node.config.menuSingleOutput === true) {
                return 1;
            }
            return props.node.config.menuOptions?.length || 1;
        }
        if (props.node.type === 'json_menu') {
            if (props.node.config.jsonMenuSingleOutput === true) {
                return 1;
            }
            return Math.min(props.node.config.jsonMenuMaxItems || 10, 10);
        }
        return props.node.outputs;
    });

    const nodeStyle = computed(() => ({
        left: `${props.node.position.x}px`,
        top: `${props.node.position.y}px`,
        transform: 'translate(0, 0)',
    }));

    const getPortLabel = (portIndex: number): string => getOutputPortLabel(props.node, portIndex).label;

    const getPortTitle = (portIndex: number): string => getOutputPortLabel(props.node, portIndex).title;

    const getPortColor = (portIndex: number): string | undefined => getOutputPortLabel(props.node, portIndex).color;

    const getInputPortLabelLocal = (portIndex: number): string => getInputPortLabel(props.node, portIndex).label;

    const getInputPortTitleLocal = (portIndex: number): string => getInputPortLabel(props.node, portIndex).title;

    const getInputPortColor = (portIndex: number): string | undefined => getInputPortLabel(props.node, portIndex).color;

    // Manejar clic en el nodo
    const handleNodeClick = (event: MouseEvent) => {
        // NO hacer nada en el click simple
        // El select ya se emite en mousedown
        // Las configuraciones solo se abren con doble click
        event.stopPropagation();
    };

    // Variables para detección de doble click
    const clickTimer = ref<number | null>(null);
    const lastClickTime = ref(0);

    // Manejar doble clic en el nodo
    const handleNodeDblClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        // Cancelar cualquier estado de drag
        isMouseDown.value = false;
        isDragging.value = false;
        hasMoved.value = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        emit('dblclick', props.node.id);
    };

    // Iniciar potencial arrastre del nodo
    const handleMouseDown = (event: MouseEvent) => {
        // Solo si hace clic en el header del nodo (no en botones ni puertos)
        if (
            (event.target as HTMLElement).closest('.node-delete-btn') ||
            (event.target as HTMLElement).closest('.node-port')
        ) {
            return;
        }

        // Si está en modo selección múltiple y el nodo está seleccionado,
        // Dejar que el canvas maneje el arrastre de todo el grupo
        if (props.isSelectionMode && props.isSelected) {
            // No detener la propagación para que el canvas capture el evento
            return;
        }

        event.stopPropagation();

        const now = Date.now();
        const timeSinceLastClick = now - lastClickTime.value;
        lastClickTime.value = now;

        // Si es un doble click rápido, no hacer nada
        if (timeSinceLastClick < 300) {
            return;
        }

        // Marcar que el mouse está presionado
        isMouseDown.value = true;
        hasMoved.value = false;
        dragStart.value = {
            x: event.clientX,
            y: event.clientY,
        };

        // Seleccionar el nodo
        emit('select', props.node.id);

        // Agregar listeners globales
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (event: MouseEvent) => {
        if (!isMouseDown.value) {
            return;
        }

        // Calcular distancia movida desde el inicio
        const distanceX = Math.abs(event.clientX - dragStart.value.x);
        const distanceY = Math.abs(event.clientY - dragStart.value.y);
        const totalDistance = Math.hypot(distanceX, distanceY);

        // Solo iniciar drag si se movió más que el threshold
        if (!isDragging.value && totalDistance > dragThreshold) {
            isDragging.value = true;
            hasMoved.value = true;
        }

        // Solo mover si está en modo drag
        if (isDragging.value) {
            const deltaX = (event.clientX - dragStart.value.x) / props.zoom;
            const deltaY = (event.clientY - dragStart.value.y) / props.zoom;

            dragStart.value = {
                x: event.clientX,
                y: event.clientY,
            };

            emit('nodeMove', props.node.id, deltaX, deltaY);
        }
    };

    const handleMouseUp = () => {
        // Limpiar todos los estados
        isMouseDown.value = false;
        isDragging.value = false;

        // Resetear hasMoved después de un pequeño delay para permitir que el click se procese
        setTimeout(() => {
            hasMoved.value = false;
        }, 10);

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    // Manejar inicio de conexión desde puerto de salida
    const handleOutputPortClick = (event: MouseEvent, portIndex: number) => {
        event.stopPropagation();
        emit('connectStart', props.node.id, portIndex, 'output');
    };

    // Manejar fin de conexión en puerto de entrada
    const handleInputPortClick = (event: MouseEvent, portIndex: number) => {
        event.preventDefault();
        event.stopPropagation();
        emit('connectEnd', props.node.id, portIndex);
    };

    // Eliminar nodo
    const handleDelete = async (event: MouseEvent) => {
        event.stopPropagation();
        const result = await Swal.fire({
            title: '¿Eliminar nodo?',
            text: `Se eliminará el nodo "${props.node.label}" y sus conexiones asociadas.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
        });

        if (result.isConfirmed) {
            emit('delete', props.node.id);
        }
    };
</script>

<template>
    <div
        :style="nodeStyle"
        :data-node-id="node.id"
        class="flow-node absolute select-none"
        :class="{
            'ring-2 ring-brand dark:ring-brand/40': node.isSelected,
            'ring-4 ring-purple-500 dark:ring-purple-400 shadow-xl shadow-purple-500/30': isSelected && !isActive,
            'ring-4 ring-green-500 dark:ring-green-400 shadow-2xl shadow-green-500/50 z-50': isActive,
            'ring-2 ring-yellow-400 dark:ring-yellow-500': isVisited && !isActive && !isSelected,
            'cursor-grabbing': isDragging,
            'cursor-pointer': !isDragging && !isMouseDown,
            'cursor-grab': isMouseDown && !isDragging,
        }"
        @click="handleNodeClick"
        @dblclick="handleNodeDblClick"
        @mousedown="handleMouseDown">
        <!-- Nodo Container -->
        <div
            class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 transition-all duration-200 hover:shadow-xl min-w-[200px]"
            :class="{
                'border-green-500 dark:border-green-400': isActive,
                'border-yellow-400 dark:border-yellow-500': isVisited && !isActive,
                'border-gray-200 dark:border-gray-700': !isActive && !isVisited,
            }">
            <!-- Header del Nodo -->
            <div
                :class="nodeDefinition?.color"
                class="px-4 py-2 rounded-t-md flex items-center justify-between text-white cursor-grab active:cursor-grabbing">
                <div class="flex items-center gap-2 pointer-events-none">
                    <div v-html="nodeDefinition?.icon"></div>
                    <span class="font-semibold text-sm">{{ node.label }}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span
                        v-if="validationState"
                        class="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                        :class="{
                            'bg-red-500/90 text-white dark:bg-red-400 dark:text-gray-900': validationState === 'error',
                            'bg-amber-400/95 text-gray-900 dark:bg-amber-300 dark:text-gray-900':
                                validationState === 'warning',
                        }"
                        :title="validationBadgeText">
                        {{ validationBadgeText }}
                    </span>

                    <button
                        v-if="node.type !== 'start'"
                        @click="handleDelete"
                        class="node-delete-btn hover:bg-white/20 rounded p-1 transition-colors"
                        title="Eliminar nodo">
                        <svg
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Body del Nodo -->
            <div class="px-4 py-3 bg-white dark:bg-gray-800 pointer-events-none">
                <!-- Contenido según tipo de nodo -->
                <div class="text-xs text-gray-600 dark:text-gray-400">
                    <!-- Mensaje -->
                    <template v-if="node.type === 'message'">
                        <p
                            v-if="node.config.messageType && node.config.messageType !== 'text'"
                            class="font-medium mb-1">
                            {{ node.config.messageType.toUpperCase() }}
                        </p>
                        <p v-if="node.config.messageMediaUrl" class="truncate max-w-[180px] text-[10px] mb-1">
                            {{ node.config.messageMediaUrl }}
                        </p>
                        <p v-if="node.config.message" class="truncate max-w-[180px]">{{ node.config.message }}</p>
                        <p
                            v-else-if="!node.config.messageMediaUrl"
                            class="text-gray-400 dark:text-gray-500 italic text-[10px]">
                            Sin contenido
                        </p>
                    </template>

                    <!-- Pregunta -->
                    <template v-else-if="node.type === 'question' && node.config.question">
                        <p class="truncate max-w-[180px]">{{ node.config.question }}</p>
                    </template>

                    <!-- Menú -->
                    <template v-else-if="node.type === 'menu'">
                        <p v-if="node.config.menuTitle" class="font-medium mb-1 truncate max-w-[180px]">
                            {{ node.config.menuTitle }}
                        </p>
                        <div v-if="node.config.menuOptions && node.config.menuOptions.length > 0" class="space-y-0.5">
                            <p class="text-[10px] text-gray-500 dark:text-gray-500">
                                {{ node.config.menuOptions.length }} opciones
                            </p>
                        </div>
                        <p v-else class="text-gray-400 dark:text-gray-500 italic text-[10px]">Sin opciones</p>
                    </template>

                    <!-- API Call -->
                    <template v-else-if="node.type === 'api_call' && node.config.apiUrl">
                        <p class="truncate max-w-[180px]">{{ node.config.apiMethod }}: {{ node.config.apiUrl }}</p>
                    </template>

                    <!-- Delay -->
                    <template v-else-if="node.type === 'delay' && node.config.delayTime">
                        <p>{{ node.config.delayTime }} {{ node.config.delayUnit }}</p>
                    </template>

                    <!-- Variable -->
                    <template v-else-if="node.type === 'variable' && node.config.variableName">
                        <p class="truncate max-w-[180px]">{{ node.config.variableName }}</p>
                    </template>

                    <!-- Enviar a -->
                    <template v-else-if="node.type === 'send_to' || node.label === 'Enviar a'">
                        <p v-if="node.config.queueId" class="font-medium mb-1 truncate max-w-[180px]">
                            → Cola {{ node.config.queueId }}
                        </p>
                        <p v-else class="text-gray-400 dark:text-gray-500 italic text-[10px]">Sin destino</p>
                    </template>

                    <!-- Webhook -->
                    <template v-else-if="node.type === 'webhook'">
                        <p v-if="node.config.webhookEventName" class="truncate max-w-[180px] font-medium">
                            {{ node.config.webhookEventName }}
                        </p>
                        <p class="text-[10px] truncate max-w-[180px]">
                            {{ node.config.webhookPayloadVariable || 'webhook_payload' }}
                        </p>
                    </template>

                    <!-- Condition -->
                    <template v-else-if="node.type === 'condition'">
                        <p class="text-[10px] text-gray-500 dark:text-gray-500">
                            {{ node.config.conditions?.length || 0 }} condiciones
                        </p>
                    </template>

                    <!-- Router -->
                    <template v-else-if="node.type === 'router'">
                        <p v-if="node.config.routerVariable" class="truncate max-w-[180px] font-medium">
                            {{ node.config.routerVariable }}
                        </p>
                        <p class="text-[10px] text-gray-500 dark:text-gray-500">
                            {{ node.config.routerCases?.length || 0 }} casos
                        </p>
                    </template>

                    <!-- Error Handler -->
                    <template v-else-if="node.type === 'error_handler'">
                        <p v-if="node.config.errorHandlerEnabled" class="text-green-500 text-[10px]">Activo</p>
                        <p v-else class="text-gray-400 text-[10px]">Inactivo</p>
                    </template>

                    <!-- Loop -->
                    <template v-else-if="node.type === 'loop'">
                        <p class="truncate max-w-[180px] font-medium">
                            {{
                                node.config.loopMode === 'foreach'
                                    ? 'ForEach'
                                    : node.config.loopMode === 'times'
                                      ? 'Times'
                                      : 'While'
                            }}
                        </p>
                        <p v-if="node.config.loopArrayVariable" class="text-[10px] truncate max-w-[180px]">
                            {{ node.config.loopArrayVariable }}
                        </p>
                    </template>

                    <!-- Parallel -->
                    <template v-else-if="node.type === 'parallel'">
                        <p class="truncate max-w-[180px]">{{ node.config.parallelBranches || 3 }} ramas</p>
                    </template>

                    <!-- Cache -->
                    <template v-else-if="node.type === 'cache'">
                        <p v-if="node.config.cacheKey" class="truncate max-w-[180px]">
                            {{ node.config.cacheKey }}
                        </p>
                        <p class="text-[10px] text-gray-500">TTL: {{ node.config.cacheTtlSeconds || 3600 }}s</p>
                    </template>

                    <!-- Merge -->
                    <template v-else-if="node.type === 'merge'">
                        <p class="truncate max-w-[180px]">
                            {{
                                node.config.mergeMode === 'wait_all'
                                    ? 'Esperar todas'
                                    : node.config.mergeMode === 'wait_any'
                                      ? 'Esperar cualquier'
                                      : 'Append'
                            }}
                        </p>
                        <p class="text-[10px] text-gray-500">{{ node.config.mergeExpectedInputs || 2 }} entradas</p>
                    </template>

                    <!-- AI Agent -->
                    <template v-else-if="node.type === 'ai_agent'">
                        <p class="truncate max-w-[180px] font-medium">
                            {{ node.config.aiModel || 'gpt-4o' }}
                        </p>
                        <p class="text-[10px] text-gray-500">
                            {{ node.config.aiProvider || 'openai' }}
                        </p>
                    </template>

                    <!-- Flow -->
                    <template v-else-if="node.type === 'flow'">
                        <p v-if="node.config.linkedFlowName" class="truncate max-w-[180px]">
                            {{ node.config.linkedFlowName }}
                        </p>
                        <p v-else class="text-gray-400 dark:text-gray-500 italic text-[10px]">Sin flujo vinculado</p>
                    </template>

                    <!-- AI Tool nodes -->
                    <template v-else-if="node.type.startsWith('ai_tool_')">
                        <p v-if="node.config.toolName" class="truncate max-w-[180px] font-mono text-[10px]">
                            {{ node.config.toolName }}
                        </p>
                        <p v-else class="text-gray-400 dark:text-gray-500 italic text-[10px]">Sin nombre</p>
                    </template>

                    <!-- JSON Menu -->
                    <template v-else-if="node.type === 'json_menu'">
                        <p
                            v-if="node.config.jsonMenuSourceVariable"
                            class="truncate max-w-[180px] font-mono text-[10px]">
                            {{ node.config.jsonMenuSourceVariable }}
                        </p>
                        <p v-else class="text-gray-400 dark:text-gray-500 italic text-[10px]">Sin variable JSON</p>
                        <p class="text-[10px] text-gray-500">
                            {{
                                node.config.jsonMenuRenderMode === 'whatsapp_buttons'
                                    ? 'Botones'
                                    : node.config.jsonMenuRenderMode === 'whatsapp_list'
                                      ? 'Lista'
                                      : node.config.jsonMenuRenderMode === 'whatsapp_template'
                                        ? 'Plantilla'
                                        : 'Genérico'
                            }}
                        </p>
                        <p
                            v-if="node.config.jsonMenuRenderMode === 'whatsapp_template'"
                            class="text-[10px] text-blue-500">
                            {{ node.config.jsonMenuTemplateName || 'Sin template' }}
                        </p>
                    </template>

                    <!-- Registro Cliente -->
                    <template v-else-if="node.type === 'customer_register'">
                        <p class="font-medium mb-1 truncate max-w-[180px]">
                            {{ node.config.customerFields?.length || 0 }} campos
                        </p>
                        <p
                            v-if="node.config.customerIntroMessage"
                            class="text-[10px] text-gray-500 truncate max-w-[180px]">
                            {{ node.config.customerIntroMessage }}
                        </p>
                    </template>

                    <!-- End -->
                    <template v-else-if="node.type === 'end'">
                        <p class="text-gray-500 text-[10px]">Fin del flujo</p>
                    </template>

                    <!-- List Render -->
                    <template v-else-if="node.type === 'list_render'">
                        <p
                            v-if="node.config.listRenderSourceVariable"
                            class="truncate max-w-[180px] font-mono text-[10px]">
                            {{ node.config.listRenderSourceVariable
                            }}{{ node.config.listRenderPath ? '.' + node.config.listRenderPath : '' }}
                        </p>
                        <p v-else class="text-gray-400 dark:text-gray-500 italic text-[10px]">Sin variable</p>
                        <p class="text-[10px] text-gray-500 truncate max-w-[180px]">
                            Template: {{ node.config.listRenderItemTemplate || 'Sin configurar' }}
                        </p>
                    </template>

                    <!-- Default -->
                    <template v-else>
                        <p class="text-gray-400 dark:text-gray-500 italic">Sin configurar</p>
                    </template>
                </div>
            </div>
        </div>

        <!-- Puertos de Conexion - posicionados absolutamente respecto al flow-node -->
        <!-- Puerto de Entrada (arriba del nodo) -->
        <div
            v-if="node.inputs > 0"
            class="absolute left-1/2 flex gap-3"
            style="top: 0; transform: translate(-50%, -50%)">
            <div v-for="i in node.inputs" :key="`input-${i}`" class="relative flex flex-col items-center">
                <div
                    class="absolute -top-5 text-[9px] font-semibold whitespace-nowrap bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded pointer-events-none"
                    :class="{
                        'text-gray-600 dark:text-gray-300': !getInputPortColor(i - 1),
                        'text-purple-600 dark:text-purple-400': getInputPortColor(i - 1) === 'purple',
                        'text-green-600 dark:text-green-400': getInputPortColor(i - 1) === 'green',
                        'text-red-600 dark:text-red-400': getInputPortColor(i - 1) === 'red',
                    }">
                    {{ getInputPortLabelLocal(i - 1) }}
                </div>
                <div
                    @click="e => handleInputPortClick(e, i - 1)"
                    class="node-port w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 cursor-pointer hover:scale-125 transition-all pointer-events-auto shadow-sm"
                    :class="{
                        'bg-purple-500 hover:bg-purple-400': getInputPortColor(i - 1) === 'purple',
                        'bg-green-500 hover:bg-green-400': getInputPortColor(i - 1) === 'green',
                        'bg-red-500 hover:bg-red-400': getInputPortColor(i - 1) === 'red',
                        'bg-gray-400 dark:bg-gray-500 hover:bg-gray-500 dark:hover:bg-gray-400': !getInputPortColor(
                            i - 1,
                        ),
                    }"
                    :title="getInputPortTitleLocal(i - 1)"></div>
            </div>
        </div>

        <!-- Puerto de Salida (abajo del nodo) -->
        <div
            v-if="outputPortsCount > 0"
            class="absolute left-1/2 flex gap-3"
            style="bottom: 0; transform: translate(-50%, 50%)">
            <div v-for="i in outputPortsCount" :key="`output-${i}`" class="relative flex flex-col items-center">
                <!-- Etiqueta del puerto -->
                <div
                    class="absolute -bottom-5 text-[9px] font-semibold whitespace-nowrap bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded pointer-events-none shadow-sm"
                    :class="{
                        'text-gray-600 dark:text-gray-300': !getPortColor(i - 1),
                        'text-green-600 dark:text-green-400': getPortColor(i - 1) === 'green',
                        'text-red-600 dark:text-red-400': getPortColor(i - 1) === 'red',
                        'text-orange-600 dark:text-orange-400': getPortColor(i - 1) === 'orange',
                        'text-purple-600 dark:text-purple-400': getPortColor(i - 1) === 'purple',
                        'text-blue-600 dark:text-blue-400': getPortColor(i - 1) === 'blue',
                        'text-teal-600 dark:text-teal-400': getPortColor(i - 1) === 'teal',
                        'text-pink-600 dark:text-pink-400': getPortColor(i - 1) === 'pink',
                        'text-indigo-600 dark:text-indigo-400': getPortColor(i - 1) === 'indigo',
                        'text-violet-600 dark:text-violet-400': getPortColor(i - 1) === 'violet',
                        'text-emerald-600 dark:text-emerald-400': getPortColor(i - 1) === 'emerald',
                        'text-lime-600 dark:text-lime-400': getPortColor(i - 1) === 'lime',
                        'text-yellow-600 dark:text-yellow-500': getPortColor(i - 1) === 'yellow',
                        'text-gray-500 dark:text-gray-400': getPortColor(i - 1) === 'gray',
                    }">
                    {{ getPortLabel(i - 1) }}
                </div>
                <div
                    @click="e => handleOutputPortClick(e, i - 1)"
                    class="node-port w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 cursor-pointer hover:scale-125 transition-all pointer-events-auto shadow-sm"
                    :class="{
                        'bg-green-500 hover:bg-green-400': getPortColor(i - 1) === 'green',
                        'bg-red-500 hover:bg-red-400': getPortColor(i - 1) === 'red',
                        'bg-orange-500 hover:bg-orange-400': getPortColor(i - 1) === 'orange',
                        'bg-purple-500 hover:bg-purple-400': getPortColor(i - 1) === 'purple',
                        'bg-blue-500 hover:bg-blue-400': getPortColor(i - 1) === 'blue',
                        'bg-teal-500 hover:bg-teal-400': getPortColor(i - 1) === 'teal',
                        'bg-pink-500 hover:bg-pink-400': getPortColor(i - 1) === 'pink',
                        'bg-indigo-500 hover:bg-indigo-400': getPortColor(i - 1) === 'indigo',
                        'bg-violet-500 hover:bg-violet-400': getPortColor(i - 1) === 'violet',
                        'bg-emerald-500 hover:bg-emerald-400': getPortColor(i - 1) === 'emerald',
                        'bg-lime-500 hover:bg-lime-400': getPortColor(i - 1) === 'lime',
                        'bg-yellow-500 hover:bg-yellow-400': getPortColor(i - 1) === 'yellow',
                        'bg-gray-400 dark:bg-gray-500 hover:bg-gray-500 dark:hover:bg-gray-400': !getPortColor(i - 1),
                    }"
                    :title="getPortTitle(i - 1)"></div>
            </div>
        </div>

        <!-- Badge de ID (solo cuando está seleccionado) -->
        <div
            v-if="node.isSelected"
            class="absolute -top-8 left-0 text-xs bg-brand text-white px-2 py-1 rounded whitespace-nowrap pointer-events-none">
            {{ node.id }}
        </div>
    </div>
</template>

<style scoped>
    .flow-node {
        z-index: 10;
        user-select: none;
    }

    .flow-node:hover {
        z-index: 20;
    }

    .flow-node.ring-2 {
        z-index: 30;
    }

    .flow-node.z-50 {
        z-index: 50;
        animation: pulse-glow 1.5s ease-in-out infinite;
    }

    .node-port {
        z-index: 100;
    }

    @keyframes pulse-glow {
        0%,
        100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.02);
        }
    }
</style>
