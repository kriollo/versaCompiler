# Flow Builder - Constructor de Flujos para Chatbot

Sistema visual de construcción de flujos conversacionales para chatbots, similar a n8n, desarrollado con Vue.js 3 y TypeScript.

## 🎯 Características

- **Interfaz Visual Drag & Drop**: Arrastra nodos desde la paleta lateral al canvas
- **Conexiones Interactivas**: Conecta nodos mediante sus puertos de entrada y salida
- **Editor de Configuración**: Panel lateral para editar propiedades de cada nodo
- **Zoom y Pan**: Navega por el canvas con controles intuitivos
- **Dark Mode**: Soporte completo para modo claro y oscuro
- **Exportar/Importar**: Guarda y carga flujos en formato JSON
- **Tipado TypeScript**: Sistema completamente tipado para mejor DX

## 📁 Estructura del Proyecto

```
flowBuilder/
├── components/
│   ├── FlowCanvas.vue          # Canvas principal con zoom/pan
│   ├── FlowNode.vue             # Componente de nodo individual
│   ├── NodePalette.vue          # Paleta lateral de nodos disponibles
│   └── NodeEditor.vue           # Editor de configuración de nodos
├── types/
│   ├── flow.types.ts            # Interfaces TypeScript
│   └── nodeDefinitions.ts       # Definiciones de tipos de nodos
├── FlowBuilderDashboard.vue     # Componente principal
└── README.md                    # Este archivo
```

## 🧩 Tipos de Nodos Disponibles

### Disparadores (Triggers)
- **Inicio**: Punto de entrada del flujo
- **Webhook**: Recibe datos desde webhooks externos

### Acciones (Actions)
- **Mensaje**: Envía mensajes de texto, imagen, video, audio o archivos
- **Pregunta**: Hace preguntas y captura respuestas del usuario
- **Fin**: Finaliza el flujo conversacional

### Lógica (Logic)
- **Condición**: Evalúa condiciones y ramifica el flujo
- **Espera**: Pausa la ejecución por un tiempo determinado
- **Variable**: Gestiona variables y datos del usuario

### Integraciones (Integrations)
- **API**: Realiza llamadas a APIs externas (GET, POST, PUT, DELETE)

## 🎮 Controles del Canvas

| Acción | Control |
|--------|---------|
| Mover canvas | `Ctrl + Click` y arrastrar |
| Zoom | `Ctrl + Scroll` del mouse |
| Agregar nodo | Arrastrar desde paleta o doble clic |
| Conectar nodos | Click en puerto de salida → puerto de entrada |
| Seleccionar nodo | Click en el nodo |
| Eliminar nodo | Click en X del nodo |
| Eliminar conexión | Click en la línea de conexión |
| Deseleccionar | Click en el canvas vacío |

## 💻 Uso del Componente

### Importación Básica

```vue
<script setup lang="ts">
import FlowBuilderDashboard from '@/dashboard/js/chatbot/flowBuilder/FlowBuilderDashboard.vue';
</script>

<template>
    <FlowBuilderDashboard />
</template>
```

### Estructura de Datos

#### FlowNode
```typescript
interface FlowNode {
    id: string;                // Identificador único
    type: NodeType;            // Tipo de nodo (start, message, question, etc.)
    position: Position;        // Posición en el canvas {x, y}
    label: string;             // Etiqueta visible
    config: NodeConfig;        // Configuración específica del nodo
    inputs: number;            // Cantidad de puertos de entrada
    outputs: number;           // Cantidad de puertos de salida
    isSelected: boolean;       // Estado de selección
}
```

#### Connection
```typescript
interface Connection {
    id: string;                // Identificador único
    sourceNodeId: string;      // ID del nodo origen
    sourcePortIndex: number;   // Índice del puerto de salida
    targetNodeId: string;      // ID del nodo destino
    targetPortIndex: number;   // Índice del puerto de entrada
}
```

## 🔧 Configuración de Nodos

### Nodo de Mensaje
```typescript
{
    messageType: 'text' | 'image' | 'video' | 'audio' | 'file',
    message: string
}
```

### Nodo de Pregunta
```typescript
{
    question: string,
    expectedAnswer: 'text' | 'number' | 'email' | 'phone',
    variableName: string
}
```

### Nodo de Condición
```typescript
{
    conditions: [
        {
            field: string,
            operator: 'equals' | 'contains' | 'greater' | 'less',
            value: string,
            nextNodeId?: string
        }
    ]
}
```

### Nodo de API
```typescript
{
    apiUrl: string,
    apiMethod: 'GET' | 'POST' | 'PUT' | 'DELETE',
    apiHeaders: Record<string, string>,
    apiBody: string
}
```

### Nodo de Espera
```typescript
{
    delayTime: number,
    delayUnit: 'seconds' | 'minutes' | 'hours'
}
```

### Nodo de Variable
```typescript
{
    variableName: string,
    variableOperation: 'set' | 'get' | 'increment' | 'decrement',
    variableValue: string
}
```

## 🎨 Personalización

### Agregar Nuevo Tipo de Nodo

1. **Agregar el tipo al enum en `flow.types.ts`**:
```typescript
export enum NodeType {
    // ... tipos existentes
    CUSTOM = 'custom',
}
```

2. **Agregar definición en `nodeDefinitions.ts`**:
```typescript
{
    type: NodeType.CUSTOM,
    label: 'Nodo Personalizado',
    icon: '<svg>...</svg>',
    description: 'Descripción del nodo',
    color: 'bg-custom-500 dark:bg-custom-600',
    defaultInputs: 1,
    defaultOutputs: 1,
    category: 'action',
}
```

3. **Agregar configuración en `NodeEditor.vue`**:
```vue
<template v-if="selectedNode.type === 'custom'">
    <!-- Formulario de configuración -->
</template>
```

4. **Agregar visualización en `FlowNode.vue`**:
```vue
<template v-else-if="node.type === 'custom' && node.config.customProp">
    <p>{{ node.config.customProp }}</p>
</template>
```

## 📊 Exportar/Importar Flujos

### Exportar
El flujo se exporta como JSON con la siguiente estructura:
```json
{
    "nodes": [
        {
            "id": "node-0",
            "type": "start",
            "position": { "x": 400, "y": 100 },
            "label": "Inicio",
            "config": {},
            "inputs": 0,
            "outputs": 1,
            "isSelected": false
        }
    ],
    "connections": [
        {
            "id": "conn-1",
            "sourceNodeId": "node-0",
            "sourcePortIndex": 0,
            "targetNodeId": "node-1",
            "targetPortIndex": 0
        }
    ]
}
```

### Importar (Por Implementar)
```typescript
const handleImportFlow = (flowData: { nodes: FlowNode[], connections: Connection[] }) => {
    nodes.value = flowData.nodes;
    connections.value = flowData.connections;
};
```

## 🔄 Eventos Principales

| Evento | Descripción | Payload |
|--------|-------------|---------|
| `nodeSelect` | Se selecciona un nodo | `nodeId: string` |
| `nodeDelete` | Se elimina un nodo | `nodeId: string` |
| `nodeAdd` | Se agrega un nodo | `nodeType: NodeType, position: Position` |
| `connectionCreate` | Se crea una conexión | `connection: Omit<Connection, 'id'>` |
| `connectionDelete` | Se elimina una conexión | `connectionId: string` |
| `updateZoom` | Cambio de zoom | `zoom: number` |
| `updatePan` | Cambio de posición del canvas | `offset: Position` |

## 🚀 Futuras Mejoras

- [ ] Deshacer/Rehacer (Ctrl+Z / Ctrl+Y)
- [ ] Selección múltiple de nodos
- [ ] Copiar/Pegar nodos
- [ ] Grupos de nodos
- [ ] Minimap de navegación
- [ ] Búsqueda de nodos

