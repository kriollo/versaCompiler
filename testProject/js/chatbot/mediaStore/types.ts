export type MediaType = 'image' | 'video' | 'audio' | 'file';

export interface ChatbotMediaAsset {
    id: number;
    media_type: MediaType;
    original_name: string;
    public_url: string;
    mime: string;
    size_bytes: number;
    created_at?: string;
    created_by?: string;
}
