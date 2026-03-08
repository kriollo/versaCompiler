import { updateCsrfToken } from '@/dashboard/js/composables/csrfStore';
import { getPanelUrl, versaAlert, VersaToast } from '@/dashboard/js/functions';

interface SessionHeartbeatResponse {
    success: number;
    valid: boolean;
    message: string;
    timeRemaining: number;
    expiresAt: number;
    isNearExpiry: boolean;
    sessionRenewed?: boolean; // Indica si la sesión fue renovada
    csrf_token?: string; // Token CSRF actualizado desde el servidor
    timestamp: number;
    nextHeartbeatInSeconds?: number; // Controlado por el servidor
    reason?: string; // Para debugging
}

interface SessionManagerConfig {
    nearExpiryWarning: number; // Segundos antes de expirar para mostrar advertencia
    maxRetries: number;
    retryDelay: number; // Milisegundos
    initialDelay: number; // Milisegundos para retrasar el primer heartbeat
    autoStart: boolean; // Si debe iniciar automáticamente el heartbeat
    gracePeriod: number; // Período de gracia antes de considerar sesión expirada
}

type SessionEventType = 'expired' | 'nearExpiry' | 'warning' | 'error' | 'restored' | 'renewed';

interface SessionEvent {
    type: SessionEventType;
    timeRemaining?: number;
    message?: string;
    sessionRenewed?: boolean;
}

export class SessionManager {
    private heartbeatTimer: number | null = null;
    private isHeartbeatActive = false;
    private retryCount = 0;
    private lastHeartbeatTime = 0;
    private isPageVisible = true;
    private hasShownNearExpiryWarning = false;
    private eventListeners = new Map<SessionEventType, ((event: SessionEvent) => void)[]>();

    // Sistema de logging mejorado
    private debugMode = false;

    private readonly config: SessionManagerConfig = {
        nearExpiryWarning: 600, // 10 minutos
        maxRetries: 3,
        retryDelay: 5000, // 5 segundos
        initialDelay: 1000, // 1 segundo de delay inicial
        autoStart: true,
        gracePeriod: 30, // 30 segundos de período de gracia
    };

    constructor(config: Partial<SessionManagerConfig> = {}) {
        this.config = { ...this.config, ...config };

        // Detectar modo debug desde configuración global o localStorage
        this.debugMode = this.detectDebugMode();

        this.initializeVisibilityAPI();
        this.init();

        // Exponer globalmente para integración con otras partes del sistema
        (window as any).sessionManager = this;

        // Añadir listener para eventos del sistema SPA
        this.setupSPAIntegration();

        this.log('SessionManager inicializado', { config: this.config });
    }

    /**
     * Detecta si estamos en modo debug
     */
    private detectDebugMode(): boolean {
        // Verificar cookie de debug
        const debugCookie = document.cookie.split(';').find(row => row.startsWith('debug='));
        if (debugCookie && debugCookie.split('=')[1] === '1') {
            return true;
        }

        // Verificar localStorage
        try {
            return localStorage.getItem('session_debug') === 'true';
        } catch {
            return false;
        }
    }

    /**
     * Método de logging centralizado
     */
    private log(message: string, data?: any, level: 'info' | 'warn' | 'error' = 'info'): void {
        if (!this.debugMode && level === 'info') {
            return;
        }

        const timestamp = new Date().toISOString();
        const logMessage = `[SessionManager ${timestamp}] ${message}`;

        switch (level) {
            case 'error': {
                console.error(logMessage, data);
                break;
            }
            case 'warn': {
                console.warn(logMessage, data);
                break;
            }
            default: {
                console.log(logMessage, data);
            }
        }

        // Guardar logs críticos en localStorage para debugging
        if (level === 'error' || level === 'warn') {
            try {
                const logs = JSON.parse(localStorage.getItem('session_logs') || '[]');
                logs.push({ timestamp, level, message, data });

                // Mantener solo los últimos 50 logs
                if (logs.length > 50) {
                    logs.splice(0, logs.length - 50);
                }

                localStorage.setItem('session_logs', JSON.stringify(logs));
            } catch {
                // Ignorar errores de localStorage
            }
        }
    }

    /**
     * Obtiene los logs guardados para debugging
     */
    public getStoredLogs(): { timestamp: string; level: string; message: string; data?: any }[] {
        try {
            return JSON.parse(localStorage.getItem('session_logs') || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Limpia los logs guardados
     */
    public clearStoredLogs(): void {
        try {
            localStorage.removeItem('session_logs');
        } catch {
            // Ignorar errores
        }
    }

    /**
     * Configura la integración con el sistema SPA.
     * Centraliza la pausa/reanudación del heartbeat durante navegación SPA.
     * No registrar listeners duplicados en spa-navigation.ts.
     */
    private setupSPAIntegration(): void {
        document.addEventListener('spa:start', () => {
            if (this.isHeartbeatActive) {
                console.debug('[SessionManager] Pausando heartbeat para navegación SPA');
                this.pauseHeartbeat();
            }
        });

        document.addEventListener('spa:finish', () => {
            if (this.isAuthenticatedPage()) {
                console.debug('[SessionManager] Reanudando heartbeat después de navegación SPA');
                setTimeout(() => {
                    this.startHeartbeat(true);
                }, 1000);
            }
        });

        document.addEventListener('spa:error', () => {
            if (this.isAuthenticatedPage()) {
                console.debug('[SessionManager] Error SPA detectado, verificando sesión');
                this.forceHeartbeat();
            }
        });
    }

    private init(): void {
        if (!this.isAuthenticatedPage()) {
            return;
        }
        if (this.config.autoStart) {
            this.startHeartbeat();
        }
        this.setupEventListeners();
    }

    private isAuthenticatedPage(): boolean {
        const hasActiveSession = (window as any).versaSessionActive;
        if (hasActiveSession === true) {
            return true;
        }
        const tknHash = this.getCookie('tknHash');
        if (tknHash) {
            return true;
        }
        const csrfToken = document.querySelector('#csrf_token') as HTMLInputElement;
        const currentUser = document.querySelector('#current_user') as HTMLInputElement;
        return Boolean(csrfToken && csrfToken.value && currentUser && currentUser.value);
    }

    private setupEventListeners(): void {
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
        ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(eventType => {
            document.addEventListener(eventType, () => this.handleUserActivity(), { passive: true });
        });
        window.addEventListener('beforeunload', () => this.destroy());
    }

    private initializeVisibilityAPI(): void {
        if (document.hidden !== undefined) {
            this.isPageVisible = !document.hidden;
        }
    }

    private handleVisibilityChange(): void {
        this.isPageVisible = !document.hidden;
        if (this.isPageVisible) {
            if (!this.isHeartbeatActive) {
                this.startHeartbeat(true); // Forzar un heartbeat inmediato al volver a la pestaña
            }
        } else {
            this.pauseHeartbeat();
        }
    }

    private handleUserActivity(): void {
        if (this.isPageVisible && !this.isHeartbeatActive) {
            this.startHeartbeat(true);
        }
    }

    public startHeartbeat(immediate = false): void {
        if (this.isHeartbeatActive && !immediate) {
            return;
        }
        this.isHeartbeatActive = true;

        if (immediate) {
            this.forceHeartbeat();
        } else {
            // Programar el primer heartbeat después de un delay inicial
            this.scheduleNextHeartbeat(this.config.initialDelay);
        }
    }

    public pauseHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearTimeout(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        this.isHeartbeatActive = false;
    }

    private scheduleNextHeartbeat(delayInMs: number): void {
        if (!this.isHeartbeatActive) {
            return;
        }
        if (this.heartbeatTimer) {
            clearTimeout(this.heartbeatTimer);
        }
        this.heartbeatTimer = window.setTimeout(() => this.performHeartbeat(), delayInMs);
    }

    private async performHeartbeat(): Promise<void> {
        if (!this.isHeartbeatActive) {
            return;
        }

        try {
            const $panelUrl = getPanelUrl();
            const response = await fetch(`/${$panelUrl}/api/session/heartbeat`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-Session-Heartbeat': 'true',
                },
            });

            const contentType = response.headers.get('content-type');

            // Si el servidor devuelve HTML (no JSON), puede ser que la sesión PHP expiró
            // Pero el JWT puede seguir vivo. En vez de marcar como expirada,
            // Reintentamos ya que checkUserSession() en el backend restaurará la sesión PHP desde JWT.
            if (!contentType || !contentType.includes('application/json')) {
                this.log('Heartbeat devolvió non-JSON, reintentando en 5s', { status: response.status }, 'warn');
                this.retryCount++;

                if (this.retryCount >= this.config.maxRetries) {
                    // Después de múltiples reintentos sin JSON, sí es una sesión muerta
                    this.handleSessionExpired('Sesión no disponible');
                } else {
                    // Reintentar — el backend puede restaurar la sesión desde JWT
                    this.scheduleNextHeartbeat(5000);
                }

                return;
            }

            const data: SessionHeartbeatResponse = await response.json();
            this.lastHeartbeatTime = Date.now();

            if (!response.ok || !data.valid) {
                // HTTP 401 = sesión genuinamente expirada (JWT y PHP ambos muertos)
                if (response.status === 401) {
                    this.handleSessionExpired(data.message || 'Sesión expirada');
                } else {
                    // Otros errores HTTP (500, etc) — reintentar
                    this.log(`Heartbeat error HTTP ${response.status}`, data, 'warn');
                    this.handleHeartbeatError(new Error(`HTTP ${response.status}: ${data.message}`));
                }

                return;
            }

            this.handleSessionValid(data);
        } catch (error) {
            this.log('Error en heartbeat', error, 'error');
            this.handleHeartbeatError(error as Error);
        }
    }

    private handleSessionValid(data: SessionHeartbeatResponse): void {
        // Actualizar el token CSRF reactivo si el servidor envía uno nuevo o actualizado
        if (data.csrf_token) {
            updateCsrfToken(data.csrf_token);
        }

        // Resetear flag de advertencia si la sesión ha sido renovada o tiene tiempo suficiente
        if (data.sessionRenewed || data.timeRemaining > this.config.nearExpiryWarning) {
            this.hasShownNearExpiryWarning = false;
        }

        // Notificar sobre renovación de sesión si ocurrió
        if (data.sessionRenewed) {
            this.log('Sesión renovada automáticamente por el servidor');
            this.emitEvent({
                type: 'renewed',
                timeRemaining: data.timeRemaining,
                message: 'Sesión renovada automáticamente',
                sessionRenewed: true,
            });
        }

        // Manejar advertencia de expiración próxima
        if (data.isNearExpiry && !this.hasShownNearExpiryWarning) {
            this.handleNearExpiry(data.timeRemaining);
        }

        // Emitir evento de restauración si hubo errores previos
        if (this.retryCount > 0) {
            this.emitEvent({
                type: 'restored',
                timeRemaining: data.timeRemaining,
                message: 'Sesión restaurada después de errores',
            });
        }

        // Resetear contador de errores en éxito
        this.retryCount = 0;

        // Programar el próximo heartbeat según lo que indique el servidor
        const nextHeartbeatMs = (data.nextHeartbeatInSeconds || 300) * 1000; // Default: 5 minutos
        this.scheduleNextHeartbeat(nextHeartbeatMs);

        // Debug: mostrar información de sesión en desarrollo
        if (window.console && typeof window.console.debug === 'function') {
            console.debug('[SessionManager] Sesión válida:', {
                timeRemaining: data.timeRemaining,
                nextHeartbeat: data.nextHeartbeatInSeconds,
                renewed: data.sessionRenewed,
                nearExpiry: data.isNearExpiry,
            });
        }
    }

    private handleNearExpiry(timeRemaining: number): void {
        this.hasShownNearExpiryWarning = true;
        const minutesRemaining = Math.ceil(timeRemaining / 60);

        VersaToast.fire({
            icon: 'warning',
            title: `Su sesión expirará en ${minutesRemaining} minuto${minutesRemaining > 1 ? 's' : ''}`,
            timer: 5000,
        });

        this.emitEvent({
            type: 'nearExpiry',
            timeRemaining,
            message: `Sesión expirará en ${minutesRemaining} minutos`,
        });
    }

    private handleSessionExpired(message: string): void {
        this.pauseHeartbeat();
        this.emitEvent({ type: 'expired', message });
        this.showSessionExpiredDialog(message);
    }

    private handleHeartbeatError(error: Error): void {
        this.retryCount++;

        this.log(
            `Error en heartbeat (intento ${this.retryCount}/${this.config.maxRetries})`,
            {
                error: error.message,
                stack: error.stack,
            },
            'warn',
        );

        if (this.retryCount >= this.config.maxRetries) {
            // Después de máximos reintentos, verificar si es problema de conectividad o sesión expirada
            const isNetworkError = error.message.includes('fetch') || error.message.includes('Network');

            if (isNetworkError) {
                this.log('Error de conectividad persistente', null, 'error');
                this.emitEvent({
                    type: 'error',
                    message: 'Problemas de conectividad. Verificando conexión...',
                });

                // Intentar un último heartbeat después de un delay mayor
                setTimeout(() => {
                    this.retryCount = 0; // Resetear para dar otra oportunidad
                    this.scheduleNextHeartbeat(10000); // 10 segundos
                }, 15000);
            } else {
                // Probablemente sesión expirada
                this.handleSessionExpired('Error de comunicación con el servidor');
            }
        } else {
            // Reintentar con delay exponencial
            const retryDelay = this.config.retryDelay * (2 ** this.retryCount - 1);
            this.log(`Reintentando en ${retryDelay}ms...`);

            this.scheduleNextHeartbeat(retryDelay);
            this.emitEvent({
                type: 'error',
                message: `Error de conectividad (intento ${this.retryCount}/${this.config.maxRetries})`,
            });
        }
    }

    private showSessionExpiredDialog(message: string): void {
        versaAlert({
            title: 'Sesión Expirada',
            message: message || 'Su sesión ha expirado por inactividad',
            type: 'warning',
            AutoClose: false,
            callback: () => this.redirectToLogin(),
        });
        setTimeout(() => this.redirectToLogin(), 15000);
    }

    private redirectToLogin(): void {
        try {
            localStorage.removeItem('spa_cache');
            sessionStorage.clear();
        } catch {
            /* Ignorar */
        }
        const adminUrl = this.getAdminUrl();
        window.location.href = `${adminUrl}/login`;
    }

    private getCookie(name: string): string | null {
        const nameEQ = `${name}=`;
        const cookies = document.cookie.split(';');
        for (const rawCookie of cookies) {
            let cookie = rawCookie;
            while (cookie && cookie.charAt(0) === ' ') {
                cookie = cookie.slice(1);
            }
            if (cookie && cookie.indexOf(nameEQ) === 0) {
                return cookie.slice(nameEQ.length);
            }
        }
        return null;
    }

    private getAdminUrl(): string {
        const urlActual = document.querySelector('#urlActual') as HTMLInputElement;
        if (urlActual && urlActual.value) {
            const parts = urlActual.value.split('/');
            return `/${parts[1] || 'admin'}`;
        }
        return '/admin';
    }

    public on(eventType: SessionEventType, callback: (event: SessionEvent) => void): void {
        const list = this.eventListeners.get(eventType) ?? [];
        if (list.length === 0) {
            this.eventListeners.set(eventType, list);
        }
        list.push(callback);
    }

    public off(eventType: SessionEventType, callback: (event: SessionEvent) => void): void {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }

    private emitEvent(event: SessionEvent): void {
        const listeners = this.eventListeners.get(event.type);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(event);
                } catch (error) {
                    console.error(`SessionManager: Error in event listener for ${event.type}:`, error);
                }
            });
        }
    }

    public forceHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearTimeout(this.heartbeatTimer);
        }
        this.performHeartbeat();
    }

    public getStatus(): {
        isActive: boolean;
        isPageVisible: boolean;
        retryCount: number;
        lastHeartbeatTime: number;
        config: SessionManagerConfig;
        sessionState: 'active' | 'inactive' | 'expired' | 'error';
    } {
        let sessionState: 'active' | 'inactive' | 'expired' | 'error' = 'inactive';

        if (this.isHeartbeatActive) {
            if (this.retryCount === 0) {
                sessionState = 'active';
            } else if (this.retryCount >= this.config.maxRetries) {
                sessionState = 'error';
            } else {
                sessionState = 'inactive';
            }
        }

        return {
            isActive: this.isHeartbeatActive,
            isPageVisible: this.isPageVisible,
            retryCount: this.retryCount,
            lastHeartbeatTime: this.lastHeartbeatTime,
            config: this.config,
            sessionState,
        };
    }

    /**
     * Permite verificar el estado de la sesión desde otras partes de la aplicación
     */
    public isSessionValid(): boolean {
        const status = this.getStatus();
        return status.sessionState === 'active';
    }

    /**
     * Permite forzar una verificación de sesión desde otras partes de la aplicación
     */
    public async validateSession(): Promise<boolean> {
        if (!this.isHeartbeatActive) {
            return false;
        }

        try {
            await this.performHeartbeat();
            return this.isSessionValid();
        } catch (error) {
            console.error('[SessionManager] Error validando sesión:', error);
            return false;
        }
    }

    public destroy(): void {
        this.pauseHeartbeat();
        this.eventListeners.clear();
    }
}

let sessionManager: SessionManager | null = null;

export const initializeSessionManager = (config: Partial<SessionManagerConfig> = {}): SessionManager => {
    if (sessionManager) {
        sessionManager.destroy();
    }
    sessionManager = new SessionManager(config);
    return sessionManager;
};

export const getSessionManager = (): SessionManager | null => sessionManager;

export const destroySessionManager = (): void => {
    if (sessionManager) {
        sessionManager.destroy();
        sessionManager = null;
    }
};
