/**
 * Definiciones de nodos disponibles en el Flow Builder
 */
import { type NodeDefinition, NodeType } from './flowTypes';

export const NODE_DEFINITIONS: NodeDefinition[] = [
    {
        type: NodeType.START,
        label: 'Inicio',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
        description: 'Punto de inicio del flujo del chatbot',
        color: 'bg-green-500 dark:bg-green-600',
        defaultInputs: 0,
        defaultOutputs: 1,
        category: 'flow',
    },
    {
        type: NodeType.MESSAGE,
        label: 'Mensaje',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
        </svg>`,
        description: 'Enviar texto, media, botones, listas o plantilla según canal',
        color: 'bg-blue-500 dark:bg-blue-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'interaction',
    },
    {
        type: NodeType.QUESTION,
        label: 'Pregunta',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
        description: 'Hacer una pregunta y esperar respuesta del usuario',
        color: 'bg-purple-500 dark:bg-purple-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'interaction',
    },
    {
        type: NodeType.MENU,
        label: 'Menú',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>`,
        description: 'Mostrar opciones en formato genérico o interactivo por canal',
        color: 'bg-cyan-500 dark:bg-cyan-600',
        defaultInputs: 1,
        defaultOutputs: 1, // Inicia con 1, se ajusta dinámicamente según opciones
        category: 'interaction',
    },
    {
        type: NodeType.CONDITION,
        label: 'Condición',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
        description: 'Evaluar condiciones y ramificar el flujo',
        color: 'bg-yellow-500 dark:bg-yellow-600',
        defaultInputs: 1,
        defaultOutputs: 2,
        category: 'logic',
    },
    {
        type: NodeType.API_CALL,
        label: 'API',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
        </svg>`,
        description: 'Realizar una llamada a una API externa',
        color: 'bg-indigo-500 dark:bg-indigo-600',
        defaultInputs: 1,
        defaultOutputs: 2,
        category: 'integration',
    },
    {
        type: NodeType.WEBHOOK,
        label: 'Webhook',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>`,
        description: 'Recibir datos desde un webhook externo',
        color: 'bg-pink-500 dark:bg-pink-600',
        defaultInputs: 0,
        defaultOutputs: 1,
        category: 'flow',
    },
    {
        type: NodeType.DELAY,
        label: 'Espera',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
        description: 'Esperar un tiempo antes de continuar',
        color: 'bg-orange-500 dark:bg-orange-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'flow',
    },
    {
        type: NodeType.VARIABLE,
        label: 'Variable',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
        </svg>`,
        description: 'Gestionar variables y datos del usuario',
        color: 'bg-teal-500 dark:bg-teal-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'integration',
    },
    {
        type: NodeType.SEND_TO,
        label: 'Enviar a',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
        </svg>`,
        description: 'Transferir a un agente o enviar a otro flujo',
        color: 'bg-emerald-500 dark:bg-emerald-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'integration',
    },
    {
        type: NodeType.FLOW,
        label: 'Flujo',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"></path>
        </svg>`,
        description: 'Vincular y ejecutar un flujo guardado',
        color: 'bg-violet-500 dark:bg-violet-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'flow',
    },
    {
        type: NodeType.END,
        label: 'Fin',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path>
        </svg>`,
        description: 'Finalizar el flujo del chatbot',
        color: 'bg-red-500 dark:bg-red-600',
        defaultInputs: 1,
        defaultOutputs: 0,
        category: 'flow',
    },
    {
        type: NodeType.AI_AGENT,
        label: 'Agente de IA',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v3m-3-3h6"></path>
        </svg>`,
        description: 'Agente de IA avanzado con memoria y herramientas',
        color: 'bg-indigo-600 dark:bg-indigo-700',
        defaultInputs: 1,
        defaultOutputs: 2,
        category: 'integration',
    },

    {
        type: NodeType.AI_TOOL_VARIABLE,
        label: 'Herramienta Variable',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
        </svg>`,
        description: 'Herramienta para que la IA lea o escriba variables del flujo',
        color: 'bg-teal-600 dark:bg-teal-700',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'ai_tool',
    },
    {
        type: NodeType.AI_TOOL_JSON_EXTRACT,
        label: 'Herramienta JSON Extract',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9h8M8 13h6M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"></path>
        </svg>`,
        description: 'Extrae valores desde JSON usando rutas (json path simple).',
        color: 'bg-sky-600 dark:bg-sky-700',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'ai_tool',
    },
    {
        type: NodeType.AI_TOOL_TEMPLATE_RENDER,
        label: 'Herramienta Template',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h8m-8 4h5M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"></path>
        </svg>`,
        description: 'Renderiza plantillas con placeholders {{ variable }}.',
        color: 'bg-fuchsia-600 dark:bg-fuchsia-700',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'ai_tool',
    },
    {
        type: NodeType.AI_TOOL_CONDITION_EVAL,
        label: 'Herramienta Condición',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-3-3v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
        description: 'Evalúa condiciones para decisiones del agente.',
        color: 'bg-amber-600 dark:bg-amber-700',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'ai_tool',
    },
    {
        type: NodeType.AI_TOOL_DATETIME,
        label: 'Herramienta DateTime',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>`,
        description: 'Obtiene fecha/hora actual y aplica offsets simples.',
        color: 'bg-emerald-600 dark:bg-emerald-700',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'ai_tool',
    },
    {
        type: NodeType.AI_TOOL_TEXT_UTILS,
        label: 'Herramienta Text Utils',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7h16M9 7l3 10 3-10"></path>
        </svg>`,
        description: 'Transforma texto (trim, lower, upper, slug).',
        color: 'bg-cyan-600 dark:bg-cyan-700',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'ai_tool',
    },
    {
        type: NodeType.ROUTER,
        label: 'Router',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
        </svg>`,
        description: 'Distribuye el flujo según valor de variable (switch/case).',
        color: 'bg-amber-500 dark:bg-amber-600',
        defaultInputs: 1,
        defaultOutputs: 2,
        category: 'logic',
    },
    {
        type: NodeType.ERROR_HANDLER,
        label: 'Manejo de Error',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>`,
        description: 'Captura errores y permite flujo alternativo de recuperación.',
        color: 'bg-red-400 dark:bg-red-500',
        defaultInputs: 1,
        defaultOutputs: 2,
        category: 'flow',
    },
    {
        type: NodeType.AI_TOOL_HTTP,
        label: 'Herramienta HTTP+',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
        </svg>`,
        description: 'Herramienta HTTP avanzada con OAuth, Bearer y autenticación API Key.',
        color: 'bg-rose-600 dark:bg-rose-700',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'ai_tool',
    },
    {
        type: NodeType.LOOP,
        label: 'Bucle',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>`,
        description: 'Itera sobre arrays o repite N veces con salida por cada elemento.',
        color: 'bg-teal-500 dark:bg-teal-600',
        defaultInputs: 1,
        defaultOutputs: 2,
        category: 'logic',
    },
    {
        type: NodeType.PARALLEL,
        label: 'Paralelo',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
        </svg>`,
        description: 'Ejecuta múltiples ramas en paralelo y sincroniza resultados.',
        color: 'bg-indigo-500 dark:bg-indigo-600',
        defaultInputs: 1,
        defaultOutputs: 3,
        category: 'logic',
    },
    {
        type: NodeType.CACHE,
        label: 'Cache',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
        </svg>`,
        description: 'Cachea resultados de API o variables para mejorar performance.',
        color: 'bg-emerald-500 dark:bg-emerald-600',
        defaultInputs: 1,
        defaultOutputs: 2,
        category: 'integration',
    },
    {
        type: NodeType.MERGE,
        label: 'Merge',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v18"></path>
        </svg>`,
        description: 'Converge múltiples ramas paralelas en un solo flujo.',
        color: 'bg-purple-500 dark:bg-purple-600',
        defaultInputs: 2,
        defaultOutputs: 1,
        category: 'logic',
    },
    {
        type: NodeType.JSON_MENU,
        label: 'Menú JSON',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
        </svg>`,
        description: 'Genera un menú dinámico desde datos JSON (productos, catálogos, etc).',
        color: 'bg-orange-500 dark:bg-orange-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'interaction',
    },
    {
        type: NodeType.LIST_RENDER,
        label: 'Lista Dinámica',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
        </svg>`,
        description: 'Renderiza dinámicamente una lista desde una variable JSON usando un template por ítem.',
        color: 'bg-lime-500 dark:bg-lime-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'integration',
    },
    {
        type: NodeType.INPUT_MEDIA,
        label: 'Recibir Archivo',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
        </svg>`,
        description:
            'Pausa el flujo y espera que el usuario envíe un archivo (imagen, audio, video, documento o ubicación).',
        color: 'bg-pink-500 dark:bg-pink-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'interaction',
    },
    {
        type: NodeType.AI_TOOL_MEMORY,
        label: 'Memoria IA',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>`,
        description:
            'Permite al agente IA guardar y recuperar información en memoria persistente durante la conversación.',
        color: 'bg-violet-500 dark:bg-violet-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'ai_tool',
    },
    {
        type: NodeType.AI_TOOL_SEND_MESSAGE,
        label: 'Enviar Mensaje (IA)',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
        </svg>`,
        description: 'Permite al agente IA enviar un mensaje al usuario en cualquier momento durante su ejecución.',
        color: 'bg-cyan-500 dark:bg-cyan-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'ai_tool',
    },
    {
        type: NodeType.AI_TOOL_WAIT_INPUT,
        label: 'Esperar Entrada (IA)',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
        description: 'Permite al agente IA pausar y esperar una respuesta del usuario antes de continuar.',
        color: 'bg-amber-500 dark:bg-amber-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'ai_tool',
    },
    {
        type: NodeType.AI_TOOL_KNOWLEDGE_BASE,
        label: 'Base de Conocimiento',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>`,
        description: 'Permite al agente IA buscar información en una base de conocimiento vectorial.',
        color: 'bg-teal-500 dark:bg-teal-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'ai_tool',
    },
    {
        type: NodeType.AI_TOOL_MATH,
        label: 'Calculadora IA',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
        </svg>`,
        description: 'Permite al agente IA realizar cálculos matemáticos y evaluaciones de expresiones numéricas.',
        color: 'bg-orange-500 dark:bg-orange-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'ai_tool',
    },
    {
        type: NodeType.AI_TOOL_STRUCTURED_OUTPUT,
        label: 'Salida Estructurada',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
        </svg>`,
        description: 'Permite al agente IA retornar datos en un formato JSON estructurado y validado.',
        color: 'bg-rose-500 dark:bg-rose-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'ai_tool',
    },
    {
        type: NodeType.INTERNAL_FUNCTION,
        label: 'Función Interna',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
        </svg>`,
        description: 'Ejecuta una función interna del backend (formato de fecha, cálculos, utilidades, etc).',
        color: 'bg-purple-500 dark:bg-purple-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'integration',
    },
    {
        type: NodeType.AI_TOOL_INTERNAL_FUNCTION,
        label: 'Herramienta Función',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>`,
        description: 'Herramienta IA para ejecutar funciones internas del backend desde un agente de IA.',
        color: 'bg-purple-600 dark:bg-purple-700',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'ai_tool',
    },
    {
        type: NodeType.RATING,
        label: 'Rating / Valoración',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
        </svg>`,
        description: 'Solicita una valoración numérica al usuario (ej: 1 a 5 estrellas).',
        color: 'bg-yellow-500 dark:bg-yellow-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'interaction',
    },
    {
        type: NodeType.CUSTOMER_REGISTER,
        label: 'Registro cliente',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>`,
        description: 'Registra datos del cliente paso a paso y guarda en base de datos',
        color: 'bg-rose-500 dark:bg-rose-600',
        defaultInputs: 1,
        defaultOutputs: 1,
        category: 'interaction',
    },
];

// Obtener definición de nodo por tipo
export function getNodeDefinition(type: NodeType): NodeDefinition | undefined {
    return NODE_DEFINITIONS.find(def => def.type === type);
}

// Obtener nodos por categoría
export function getNodesByCategory(
    category: 'flow' | 'interaction' | 'logic' | 'integration' | 'ai_tool',
): NodeDefinition[] {
    return NODE_DEFINITIONS.filter(def => def.category === category);
}
