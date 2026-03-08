/**
 * Cliente WebSocket para Vue.js - versaBOT
 *
 * Maneja la conexión WebSocket con el servidor Go
 * Proporciona métodos para enviar y recibir mensajes en tiempo real
 */
import { onMounted, onUnmounted, ref, type Ref } from 'vue';

export interface WebSocketMessage {
    type: string;
    client_id?: string;
    user_id?: string;
    data: any;
    metadata?: Record<string, any>;
    timestamp: string;
}

export interface WebSocketConfig {
    url: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    debug?: boolean;
    /** Si es true, no conecta automáticamente en onMounted. Usa connect()/disconnect() manualmente. */
    lazy?: boolean;
}

export type MessageHandler = (message: WebSocketMessage) => void;

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private config: Required<WebSocketConfig>;
    private clientId: string = '';
    private reconnectAttempts: number = 0;
    private messageHandlers = new Map<string, MessageHandler[]>();
    private reconnectTimeout: number | null = null;
    private isConnecting: boolean = false;
    private isManualDisconnect: boolean = false;

    constructor(config: WebSocketConfig) {
        this.config = {
            url: config.url,
            reconnectInterval: config.reconnectInterval ?? 3000,
            maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
            debug: config.debug ?? false,
            lazy: config.lazy ?? false,
        };
    }

    /**
     * Conecta al servidor WebSocket
     */
    connect(): Promise<void> {
        // Prevenir múltiples conexiones simultáneas
        if (this.isConnecting) {
            this.log('Conexión ya en progreso, ignorando solicitud duplicada');
            return Promise.resolve();
        }

        // Si ya hay una conexión activa, no crear otra
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.log('Ya existe una conexión activa');
            return Promise.resolve();
        }

        // Si hay una conexión en proceso de cierre, esperar
        if (this.ws && this.ws.readyState === WebSocket.CLOSING) {
            this.log('Esperando a que se cierre la conexión anterior...');
            return new Promise(resolve => {
                setTimeout(() => {
                    this.connect().then(resolve);
                }, 500);
            });
        }

        this.isConnecting = true;
        this.isManualDisconnect = false;

        return new Promise((resolve, reject) => {
            try {
                this.log('Conectando al servidor WebSocket...');

                // Cerrar conexión anterior si existe
                if (this.ws) {
                    this.log('Cerrando conexión anterior antes de crear nueva...');
                    this.ws.close();
                    this.ws = null;
                }

                this.ws = new WebSocket(this.config.url);

                this.ws.addEventListener('open', () => {
                    this.log('Conectado al servidor WebSocket');
                    this.reconnectAttempts = 0;
                    this.isConnecting = false;
                    resolve();
                });

                this.ws.addEventListener('message', event => {
                    try {
                        const message: WebSocketMessage = JSON.parse(event.data);
                        this.handleMessage(message);
                    } catch (error) {
                        this.log('Error al parsear mensaje:', error);
                    }
                });

                this.ws.addEventListener('error', error => {
                    this.log('Error WebSocket:', error);
                    this.isConnecting = false;
                    reject(error);
                });

                this.ws.addEventListener('close', event => {
                    this.log('Desconectado del servidor WebSocket', {
                        code: event.code,
                        reason: event.reason,
                    });
                    this.isConnecting = false;
                    // Notificar a los listeners que la conexión se perdió
                    this.emit('disconnected', { code: event.code, reason: event.reason });

                    // Solo intentar reconectar si no fue desconexión manual
                    if (!this.isManualDisconnect) {
                        this.handleDisconnect();
                    }
                });
            } catch (error) {
                this.isConnecting = false;
                reject(error);
            }
        });
    }

    /**
     * Maneja la desconexión y reconexión automática
     */
    private handleDisconnect(): void {
        // No reconectar si fue desconexión manual
        if (this.isManualDisconnect) {
            this.log('Desconexión manual, no se intentará reconectar');
            return;
        }

        // Limpiar timeout anterior si existe
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.reconnectAttempts++;
            // Backoff exponencial con jitter: base * 1.5^(intento-1) + ruido aleatorio, máx 30s
            const delay = Math.min(
                this.config.reconnectInterval * 1.5 ** (this.reconnectAttempts - 1) + Math.random() * 1000,
                30000,
            );
            this.log(
                `Intentando reconectar en ${Math.round(delay / 1000)}s (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`,
            );

            this.reconnectTimeout = window.setTimeout(() => {
                this.connect().catch(() => {
                    this.log('Fallo al reconectar');
                });
            }, delay);
        } else {
            this.log('Máximo de intentos de reconexión alcanzado');
            this.emit('max_reconnect_reached', {});
        }
    }

    /**
     * Maneja los mensajes recibidos
     */
    private handleMessage(message: WebSocketMessage): void {
        this.log('Mensaje recibido:', message);

        if (message.type === 'connected' && message.data?.client_id) {
            // Caso especial: emitir con message.data (shape esperado por los listeners de 'connected')
            // Y NO emitir de nuevo con el envelope completo para evitar doble auth.
            this.clientId = message.data.client_id;
            this.emit('connected', message.data);
        } else {
            // Para todos los demás tipos, emitir el envelope completo
            this.emit(message.type, message);
        }

        // Evento genérico de mensaje (siempre)
        this.emit('message', message);
    }

    /**
     * Registra un manejador para un tipo de mensaje
     */
    on(messageType: string, handler: MessageHandler): void {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }
        const handlers = this.messageHandlers.get(messageType);
        if (handlers) {
            handlers.push(handler);
        }
    }

    /**
     * Elimina un manejador de mensaje
     */
    off(messageType: string, handler: MessageHandler): void {
        const handlers = this.messageHandlers.get(messageType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Emite un evento a todos los manejadores registrados
     */
    private emit(messageType: string, data: any): void {
        const handlers = this.messageHandlers.get(messageType);
        if (handlers) {
            handlers.forEach(handler => handler(data));
        }
    }

    /**
     * Envía un mensaje al servidor
     */
    send(type: string, data: unknown, metadata?: Record<string, unknown>): boolean {
        if (!this.isConnected()) {
            this.log('No se puede enviar mensaje: WebSocket no conectado');
            return false;
        }

        const message: Partial<WebSocketMessage> = {
            type,
            data,
            metadata,
        };

        try {
            if (this.ws) {
                this.ws.send(JSON.stringify(message));
                this.log('Mensaje enviado:', message);
                return true;
            }
            return false;
        } catch (error) {
            this.log('Error al enviar mensaje:', error);
            return false;
        }
    }

    /**
     * Autentica al cliente con el servidor
     */
    authenticate(userId: string, userData?: unknown): boolean {
        return this.send('auth', {
            user_id: userId,
            user_data: userData ? JSON.stringify(userData) : undefined,
        });
    }

    /**
     * Envía un ping al servidor
     */
    ping(): boolean {
        return this.send('ping', {});
    }

    /**
     * Verifica si el WebSocket está conectado
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Obtiene el ID del cliente
     */
    getClientId(): string {
        return this.clientId;
    }

    /**
     * Desconecta del servidor WebSocket
     */
    disconnect(): void {
        this.log('Desconectando del servidor WebSocket...');

        // Marcar como desconexión manual
        this.isManualDisconnect = true;

        // Limpiar timeout de reconexión
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        // Cerrar conexión WebSocket
        if (this.ws) {
            try {
                // Usar código 1000 (cierre normal) para evitar intentos de reconexión
                this.ws.close(1000, 'Desconexión manual');
            } catch (error) {
                this.log('Error al cerrar conexión:', error);
            }
            this.ws = null;
        }

        // Limpiar estado
        this.clientId = '';
        this.reconnectAttempts = 0;
        this.isConnecting = false;

        this.log('Desconectado correctamente');
    }

    /**
     * Log interno
     */
    private log(...args: unknown[]): void {
        if (this.config.debug) {
            console.log('[WebSocket]', ...args);
        }
    }
}

// Instancia singleton global del cliente WebSocket
let globalWSClient: any = null;
let _connectionCount = 0;

// Composable para Vue 3
export function useWebSocket(config?: Partial<WebSocketConfig>): {
    isConnected: Ref<boolean>;
    clientId: Ref<string>;
    lastMessage: Ref<WebSocketMessage | null>;
    connect: () => void;
    disconnect: () => void;
    send: (type: string, payload: any) => void;
    authenticate: (userId: string, userData?: unknown) => boolean;
    on: (type: string, handler: (message: WebSocketMessage) => void) => void;
    off: (type: string, handler?: (message: WebSocketMessage) => void) => void;
} {
    const defaultConfig: WebSocketConfig = {
        url: config?.url || 'ws://localhost:8083/ws',
        reconnectInterval: config?.reconnectInterval ?? 3000,
        maxReconnectAttempts: config?.maxReconnectAttempts ?? 10,
        debug: config?.debug ?? true,
        lazy: config?.lazy ?? false,
    };

    if (!globalWSClient) {
        globalWSClient = new WebSocketClient(defaultConfig);
    }
    const wsClient = ref<WebSocketClient>(globalWSClient);

    const isConnected = ref(globalWSClient.isConnected());
    const clientId = ref(globalWSClient.getClientId());
    const lastMessage = ref<WebSocketMessage | null>(null);

    const onConnected = (data: { client_id?: string }) => {
        isConnected.value = true;
        clientId.value = data.client_id || '';
    };

    const onDisconnected = () => {
        isConnected.value = false;
    };

    const onGenericMessage = (message: WebSocketMessage) => {
        lastMessage.value = message;
    };

    const onMaxReconnect = () => {
        isConnected.value = false;
    };

    let beforeUnloadHandler: (() => void) | null = null;

    wsClient.value.on('connected', onConnected as MessageHandler);
    wsClient.value.on('disconnected', onDisconnected as MessageHandler);
    wsClient.value.on('message', onGenericMessage);
    wsClient.value.on('max_reconnect_reached', onMaxReconnect as MessageHandler);

    const connect = async (): Promise<void> => {
        _connectionCount++;
        if (!wsClient.value.isConnected()) {
            try {
                await wsClient.value.connect();
            } catch (error) {
                console.error('Error al conectar WebSocket:', error);
            }
        } else {
            isConnected.value = true;
            clientId.value = wsClient.value.getClientId();
        }
    };

    const disconnect = (): void => {
        if (wsClient.value) {
            wsClient.value.disconnect();
            isConnected.value = false;
            clientId.value = '';
        }
    };

    const send = (type: string, data: unknown, metadata?: Record<string, unknown>): boolean =>
        wsClient.value?.send(type, data, metadata) ?? false;

    const authenticate = (userId: string, userData?: unknown): boolean =>
        wsClient.value?.authenticate(userId, userData) ?? false;

    const on = (messageType: string, handler: MessageHandler): void => {
        wsClient.value?.on(messageType, handler);
    };

    const off = (messageType: string, handler?: MessageHandler): void => {
        if (handler) {
            wsClient.value?.off(messageType, handler);
        }
    };

    onMounted(() => {
        if (!defaultConfig.lazy) {
            connect();
        }

        beforeUnloadHandler = () => {
            if (globalWSClient) {
                console.log('[useWebSocket] Página recargando, cerrando conexión...');
                globalWSClient.disconnect();
            }
        };

        window.addEventListener('beforeunload', beforeUnloadHandler);
    });

    onUnmounted(() => {
        if (beforeUnloadHandler) {
            window.removeEventListener('beforeunload', beforeUnloadHandler);
            beforeUnloadHandler = null;
        }

        wsClient.value?.off('connected', onConnected as MessageHandler);
        wsClient.value?.off('disconnected', onDisconnected as MessageHandler);
        wsClient.value?.off('message', onGenericMessage);
        wsClient.value?.off('max_reconnect_reached', onMaxReconnect as MessageHandler);

        // Only disconnect on unmount if we aren't lazy, or let the caller handle it.
        if (!defaultConfig.lazy) {
            disconnect();
        }
    });

    return {
        isConnected,
        clientId,
        lastMessage,
        connect,
        disconnect,
        send,
        authenticate,
        on,
        off,
    };
}
