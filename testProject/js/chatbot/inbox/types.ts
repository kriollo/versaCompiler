// Tipos TypeScript para el sistema de tickets (Inbox)
//

export type TicketStatus = 'pending_assignment' | 'assigned' | 'in_progress' | 'transferred' | 'cancelled' | 'closed';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type MessageDirection = 'inbound' | 'outbound';

export type SenderType = 'customer' | 'agent' | 'system' | 'bot';

export type MessageType =
    | 'text'
    | 'image'
    | 'video'
    | 'audio'
    | 'voice'
    | 'document'
    | 'location'
    | 'contact'
    | 'sticker'
    | 'reaction'
    | 'interactive'
    | 'button'
    | 'list'
    | 'system'
    | 'unknown';

export type Platform = 'whatsapp' | 'facebook' | 'instagram' | 'telegram' | 'web';

// =====================================================
// COLAS
// =====================================================

export type QueueStatus = 'active' | 'paused' | 'inactive';

export interface Queue {
    id: number;
    empresa_id: number;
    name: string;
    description?: string;
    status: QueueStatus;
    priority: number;
    assignment_algorithm?: string | null;
    trunk_id?: number;
    agent_count?: number;
    metadata?: {
        business_hours?: BusinessHours;
        [key: string]: any;
    };
    created_at: string;
    updated_at?: string;
}

export interface BusinessHours {
    enabled: boolean;
    timezone: string;
    schedule: Record<number, TimeSlot[]>;
}

export interface TimeSlot {
    start: string;
    end: string;
}

export interface QueueAgent {
    id: number;
    queue_id: number;
    user_id: number;
    max_concurrent_tickets: number;
    is_active: boolean;
    user_name?: string;
    user_email?: string;
    user_avatar?: string;
    agent_status?: AgentStatusValue;
    custom_status_label?: string;
    active_tickets?: number;
    created_at?: string;
}

export type AgentStatusValue = 'online' | 'away' | 'busy' | 'offline' | 'custom';

export interface AgentStatus {
    user_id: number;
    status: AgentStatusValue;
    custom_status_label?: string;
    status_metadata?: Record<string, unknown>;
    last_activity_at?: string;
    available_statuses?: AgentStatusOption[];
}

export interface AgentStatusOption {
    value: AgentStatusValue;
    label: string;
    color: string;
    icon: string;
}

// =====================================================
// RAZONES DE CIERRE
// =====================================================

export type CloseReasonType = 'resolved' | 'pending_escalation' | 'cancelled' | 'duplicate' | 'spam';

export interface CloseReason {
    id: number;
    empresa_id: number;
    name: string;
    description?: string;
    type: CloseReasonType;
    is_active: boolean;
    priority: number;
    created_at?: string;
}

// =====================================================
// PLANTILLAS DE MENSAJES
// =====================================================

export interface MessageTemplate {
    id: number;
    empresa_id: number;
    name: string;
    content: string;
    category?: string;
    is_active: boolean;
    priority: number;
    created_at?: string;
    updated_at?: string;
}

// =====================================================
// TICKET (actualizado)
// =====================================================

export interface Ticket {
    id: string;
    empresa_id: number;
    trunk_id?: number;
    queue_id?: number;
    platform: Platform;
    external_id?: string;
    customer_name: string | null;
    customer_phone?: string;
    customer_email?: string;
    status: TicketStatus;
    priority: TicketPriority;
    subject?: string;
    last_message_text?: string;
    last_message_at?: string;
    assigned_to?: number;
    assigned_to_name?: string;
    assigned_at?: { date: string; timestamp: number };
    unread_count: number;
    close_reason_id?: number;
    close_reason_name?: string;
    close_reason_type?: CloseReasonType;
    close_observation?: string;
    rating?: number | string | null;
    closed_at?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at?: string;
}

export interface CustomerHistoryItem {
    id: number;
    platform: Platform;
    status: TicketStatus;
    priority: TicketPriority;
    last_message_text?: string;
    last_message_at?: string;
    created_at?: string;
    assigned_at?: { date: string; timestamp: number };
    assigned_to_name?: string;
    closed_at?: string;
    recent_messages?: CustomerHistoryMessagePreview[];
}

export interface CustomerHistoryMessagePreview {
    id: number;
    ticket_id: number;
    direction: MessageDirection;
    sender_type: SenderType;
    message_type: MessageType;
    content: string;
    message_timestamp?: string;
    created_at?: string;
}

export interface Message {
    id: string;
    message_id?: string; // ID externo de la plataforma (WhatsApp, etc.)
    ticket_id: string;
    direction: MessageDirection;
    sender_type: SenderType;
    sender_id?: string;
    sender_name?: string;
    message_type: MessageType;
    content?: string;
    media_url?: string;
    media_mime?: string;
    message_timestamp?: string;
    seen_by_agent: boolean;
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    status_source?: 'message_id' | 'watermark' | 'unknown';
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at?: string;
}

export interface Agent {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    status: 'online' | 'away' | 'offline';
    active_tickets: number;
}

export interface TicketFilter {
    status?: TicketStatus;
    priority?: TicketPriority;
    platform?: Platform;
    assigned_to?: number;
    search?: string;
}

export interface TicketStats {
    pending_assignment: number;
    assigned: number;
    in_progress: number;
    transferred: number;
    cancelled: number;
    closed: number;
    total: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}
