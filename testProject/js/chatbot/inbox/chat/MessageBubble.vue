<template>
    <div
        ref="bubbleRoot"
        class="max-w-[70%] rounded-lg px-4 py-2 shadow-sm"
        :class="
            isOutbound
                ? 'bg-teal-600 text-white dark:bg-teal-700'
                : 'bg-white text-gray-900 dark:bg-gray-800 dark:text-white'
        ">
        <!-- Imagen / Sticker -->
        <template v-if="message.message_type === 'image' || message.message_type === 'sticker'">
            <img
                v-if="resolvedMediaUrl"
                :src="resolvedMediaUrl"
                :alt="message.content || 'Imagen'"
                class="rounded-md max-w-full max-h-64 object-contain cursor-pointer"
                width="320"
                height="240"
                @click="openMedia(resolvedMediaUrl)"
                @load="handleMediaLoaded"
                loading="lazy" />
            <div
                v-else-if="shouldLoadMedia"
                class="rounded-md w-56 h-40 max-w-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            <p
                v-if="message.content && message.message_type === 'image'"
                class="text-sm mt-1 whitespace-pre-wrap break-words">
                {{ message.content }}
            </p>
        </template>

        <!-- Video -->
        <template v-else-if="message.message_type === 'video'">
            <video
                v-if="resolvedMediaUrl"
                :src="resolvedMediaUrl"
                controls
                class="rounded-md max-w-full max-h-64"
                @loadedmetadata="handleMediaLoaded"
                preload="metadata"></video>
            <div
                v-else-if="shouldLoadMedia"
                class="rounded-md w-56 h-40 max-w-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            <p v-if="message.content" class="text-sm mt-1 whitespace-pre-wrap break-words">{{ message.content }}</p>
        </template>

        <!-- Audio / Voz -->
        <template v-else-if="message.message_type === 'audio' || message.message_type === 'voice'">
            <audio
                v-if="resolvedMediaUrl"
                :src="resolvedMediaUrl"
                controls
                class="w-full max-w-xs"
                @loadedmetadata="handleMediaLoaded"
                preload="metadata"></audio>
        </template>

        <!-- Documento -->
        <template v-else-if="message.message_type === 'document'">
            <a
                v-if="resolvedMediaUrl"
                :href="resolvedMediaUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 p-2 rounded-md"
                :class="
                    isOutbound
                        ? 'bg-teal-700/50 hover:bg-teal-700'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                ">
                <svg class="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path :d="documentIconPath" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                </svg>
                <div class="min-w-0">
                    <p class="text-sm font-medium truncate">{{ documentDisplayName }}</p>
                    <p class="text-[11px] uppercase tracking-wide opacity-80">{{ documentMimeLabel }}</p>
                </div>
            </a>
            <div v-else-if="shouldLoadMedia" class="h-16 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
        </template>

        <!-- Ubicación -->
        <template v-else-if="message.message_type === 'location'">
            <div v-if="locationData" class="rounded-md overflow-hidden">
                <iframe
                    :src="locationData.embedUrl"
                    :title="locationData.name"
                    class="w-full max-w-xs h-36 rounded-md border border-gray-200 dark:border-gray-700"
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade"></iframe>
                <p class="text-sm mt-1 font-medium">{{ locationData.name }}</p>
                <a
                    :href="locationData.osmLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-xs mt-1 inline-flex text-teal-600 dark:text-teal-400 hover:underline">
                    Abrir ubicación en mapa
                </a>
            </div>
            <p v-else class="text-sm whitespace-pre-wrap break-words">{{ message.content || 'Ubicación' }}</p>
        </template>

        <!-- Contacto -->
        <template v-else-if="message.message_type === 'contact'">
            <div
                v-if="contactData"
                class="flex items-center gap-3 p-2 rounded-md"
                :class="isOutbound ? 'bg-teal-700/50' : 'bg-gray-100 dark:bg-gray-700'">
                <div
                    class="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                    :class="isOutbound ? 'bg-teal-500' : 'bg-gray-400 dark:bg-gray-500'">
                    {{ contactData.name.charAt(0).toUpperCase() }}
                </div>
                <div>
                    <p class="text-sm font-semibold">{{ contactData.name }}</p>
                    <p v-if="contactData.phone" class="text-xs opacity-75">{{ contactData.phone }}</p>
                </div>
            </div>
            <p v-else class="text-sm whitespace-pre-wrap break-words">{{ message.content || 'Contacto' }}</p>
        </template>

        <!-- Reacción -->
        <template v-else-if="message.message_type === 'reaction'">
            <div class="flex items-center gap-2">
                <span class="text-3xl">{{ reactionEmoji }}</span>
                <span class="text-xs opacity-75">Reaccionó con este emoji</span>
            </div>
        </template>

        <!-- Botón / Lista (respuesta interactiva seleccionada) -->
        <template v-else-if="message.message_type === 'button' || message.message_type === 'list'">
            <div
                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                :class="isOutbound ? 'bg-teal-700/50' : 'bg-gray-100 dark:bg-gray-700'">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>
                    {{
                        message.content ||
                        (message.message_type === 'list' ? 'Opción seleccionada' : 'Botón presionado')
                    }}
                </span>
            </div>
        </template>

        <!-- Texto (default) -->
        <template v-else>
            <p class="text-sm whitespace-pre-wrap break-words">{{ message.content }}</p>
        </template>

        <!-- Hora del mensaje + estado -->
        <div class="flex items-center justify-end gap-1 mt-1" :class="isOutbound ? 'text-white/80' : 'text-gray-500'">
            <span class="text-xs">
                {{ formatMessageTime(message.message_timestamp || message.created_at) }}
            </span>

            <span
                v-if="isOutbound && message.status === 'read' && message.status_source === 'watermark'"
                class="text-[10px] font-semibold opacity-80"
                title="Leído aproximado por watermark del canal">
                ~
            </span>

            <!-- Estado de mensaje (solo para saliente) -->
            <div v-if="isOutbound" class="flex items-center">
                <!-- Un check (sent) -->
                <svg
                    v-if="
                        !message.status ||
                        message.status === 'sent' ||
                        message.status === 'delivered' ||
                        message.status === 'read'
                    "
                    class="w-3.5 h-3.5"
                    :class="message.status === 'read' ? 'text-blue-300' : 'text-white/60'"
                    fill="currentColor"
                    viewBox="0 0 20 20">
                    <path
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
                <!-- Segundo check (delivered/read) -->
                <svg
                    v-if="message.status === 'delivered' || message.status === 'read'"
                    class="w-3.5 h-3.5 -ml-2"
                    :class="message.status === 'read' ? 'text-blue-300' : 'text-white/60'"
                    fill="currentColor"
                    viewBox="0 0 20 20">
                    <path
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
                <!-- Error -->
                <svg
                    v-if="message.status === 'failed'"
                    class="w-4 h-4 text-red-300"
                    fill="currentColor"
                    viewBox="0 0 20 20">
                    <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clip-rule="evenodd" />
                </svg>

                <button
                    v-if="message.status === 'failed'"
                    type="button"
                    class="ml-1 p-0.5 rounded hover:bg-white/15"
                    title="Reenviar mensaje"
                    aria-label="Reenviar mensaje"
                    @click="handleRetryClick">
                    <svg class="w-3.5 h-3.5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9M4.582 9H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

    import { formatMessageTime } from '@/dashboard/js/chatbot/inbox/inboxUtils';
    import type { Message } from '@/dashboard/js/chatbot/inbox/types';
    import { versaFetch } from '@/dashboard/js/functions';

    const MEDIA_URL_CACHE_LIMIT = 500;
    const mediaUrlCache = new Map<string, string>();
    const mediaUrlInFlight = new Map<string, Promise<string>>();

    const setCachedMediaUrl = (key: string, url: string) => {
        if (mediaUrlCache.has(key)) {
            mediaUrlCache.delete(key);
        }

        mediaUrlCache.set(key, url);

        if (mediaUrlCache.size > MEDIA_URL_CACHE_LIMIT) {
            const oldestKey = mediaUrlCache.keys().next().value as string | undefined;
            if (oldestKey) {
                mediaUrlCache.delete(oldestKey);
            }
        }
    };

    interface Props {
        message: Message;
        panelUrl?: string;
        isOutbound?: boolean;
    }

    const props = withDefaults(defineProps<Props>(), {
        panelUrl: '',
        isOutbound: false,
    });

    const emit = defineEmits<{
        'media-loaded': [];
        'retry-message': [payload: { messageId: string }];
    }>();

    // URL resuelta: si comienza con http o blob: se usa directa; si no, se delega al proxy de media
    const dynamicMediaUrl = ref('');
    const shouldLoadMedia = ref(false);
    const bubbleRoot = ref<HTMLElement | null>(null);

    let visibilityObserver: IntersectionObserver | null = null;

    const isMediaType = computed(() => {
        const type = props.message.message_type;
        return (
            type === 'image' ||
            type === 'sticker' ||
            type === 'video' ||
            type === 'audio' ||
            type === 'voice' ||
            type === 'document'
        );
    });

    const hasMediaReference = computed(() => {
        const url = (props.message.media_url || '') as string;
        return url.trim() !== '';
    });

    const shouldResolveMedia = computed(() => isMediaType.value && hasMediaReference.value && shouldLoadMedia.value);

    const parsedMetadata = computed((): Record<string, unknown> | undefined => {
        const metadataRaw = props.message.metadata;

        if (typeof metadataRaw === 'string') {
            try {
                const decoded = JSON.parse(metadataRaw) as Record<string, unknown> | null;
                return decoded ?? undefined;
            } catch {
                return undefined;
            }
        }

        return metadataRaw as Record<string, unknown> | undefined;
    });

    const ensureMediaUrl = async () => {
        if (!shouldResolveMedia.value) {
            dynamicMediaUrl.value = '';
            return;
        }

        const url = (props.message.media_url || '') as string;
        if (url.startsWith('blob:')) {
            dynamicMediaUrl.value = url;
            return;
        }

        const cacheKey = `${props.panelUrl}|${String(props.message.id)}`;
        const cached = mediaUrlCache.get(cacheKey);
        if (cached) {
            dynamicMediaUrl.value = cached;
            return;
        }

        const inFlight = mediaUrlInFlight.get(cacheKey);
        if (inFlight) {
            dynamicMediaUrl.value = await inFlight;
            return;
        }

        const requestPromise = (async (): Promise<string> => {
            try {
                const resp = await versaFetch({
                    url: `/${props.panelUrl}/inbox/api/media-url/${props.message.id}`,
                    method: 'GET',
                });

                if (resp && resp.success === 1 && resp.data?.url) {
                    return String(resp.data.url);
                }

                return '';
            } catch {
                return '';
            } finally {
                mediaUrlInFlight.delete(cacheKey);
            }
        })();

        mediaUrlInFlight.set(cacheKey, requestPromise);

        try {
            const resolvedUrl = await requestPromise;
            if (resolvedUrl !== '') {
                setCachedMediaUrl(cacheKey, resolvedUrl);
            }

            dynamicMediaUrl.value = resolvedUrl;
        } catch {
            dynamicMediaUrl.value = '';
        }
    };

    const setupVisibilityObserver = () => {
        if (!isMediaType.value || !hasMediaReference.value) {
            shouldLoadMedia.value = true;
            return;
        }

        if (visibilityObserver) {
            visibilityObserver.disconnect();
            visibilityObserver = null;
        }

        if (!('IntersectionObserver' in window) || !bubbleRoot.value) {
            shouldLoadMedia.value = true;
            return;
        }

        visibilityObserver = new IntersectionObserver(
            entries => {
                const [entry] = entries;
                if (entry && entry.isIntersecting) {
                    shouldLoadMedia.value = true;
                    ensureMediaUrl();
                    visibilityObserver?.disconnect();
                    visibilityObserver = null;
                }
            },
            {
                root: null,
                rootMargin: '300px 0px',
                threshold: 0.01,
            },
        );

        visibilityObserver.observe(bubbleRoot.value);
    };

    const handleMediaLoaded = () => {
        emit('media-loaded');
    };

    watch(
        () => props.message.id,
        () => {
            dynamicMediaUrl.value = '';
            shouldLoadMedia.value = false;
            setupVisibilityObserver();
            if (shouldLoadMedia.value) {
                ensureMediaUrl();
            }
        },
    );

    watch(
        () => shouldLoadMedia.value,
        newValue => {
            if (newValue) {
                ensureMediaUrl();
            }
        },
    );

    onMounted(() => {
        setupVisibilityObserver();
        if (shouldLoadMedia.value) {
            ensureMediaUrl();
        }
    });

    onUnmounted(() => {
        if (visibilityObserver) {
            visibilityObserver.disconnect();
            visibilityObserver = null;
        }
    });

    // URL resuelta (dinámica): puede venir de media-url endpoint o ser directa
    const resolvedMediaUrl = computed((): string => {
        const url = dynamicMediaUrl.value || props.message.media_url;
        if (!url) {
            return '';
        }
        if (url.startsWith('http') || url.startsWith('blob:')) {
            return url;
        }
        // Proxy local storage/media id
        return `/${props.panelUrl}/inbox/api/media/${props.message.id}`;
    });

    // Datos de ubicación para renderizar mapa embebido de OpenStreetMap
    const locationData = computed(() => {
        const locSource =
            (parsedMetadata.value?.location as Record<string, unknown> | undefined) ??
            (parsedMetadata.value as Record<string, unknown> | undefined);

        const rawLatitude = locSource?.latitude ?? locSource?.lat;
        const rawLongitude = locSource?.longitude ?? locSource?.lng ?? locSource?.long;

        const latitude = typeof rawLatitude === 'number' ? rawLatitude : Number.parseFloat(String(rawLatitude ?? ''));
        const longitude =
            typeof rawLongitude === 'number' ? rawLongitude : Number.parseFloat(String(rawLongitude ?? ''));

        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
            return null;
        }

        const delta = 0.008;
        const left = longitude - delta;
        const right = longitude + delta;
        const top = latitude + delta;
        const bottom = latitude - delta;
        const bbox = `${left},${bottom},${right},${top}`;

        const name = String(locSource?.name ?? locSource?.address ?? '').trim() || `${latitude}, ${longitude}`;
        return {
            embedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude}%2C${longitude}`,
            osmLink: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=15`,
            name,
        };
    });

    // Datos del primer contacto del array (WhatsApp) o del objeto directo (Telegram)
    const contactData = computed(() => {
        const contacts = parsedMetadata.value?.contact as
            | Array<Record<string, unknown>>
            | Record<string, unknown>
            | undefined;

        // WhatsApp: contact es array [{ name: { formatted_name, first_name }, phones: [{ phone }] }]
        if (Array.isArray(contacts) && contacts.length > 0) {
            const c = contacts[0] as Record<string, unknown>;
            const nameObj = c.name as Record<string, string> | undefined;
            const phones = c.phones as Array<Record<string, string>> | undefined;
            return {
                name: nameObj?.formatted_name || nameObj?.first_name || 'Contacto',
                phone: phones?.[0]?.phone || '',
            };
        }
        // Telegram: contact es objeto directo { first_name, last_name, phone_number }
        if (contacts && !Array.isArray(contacts)) {
            const c = contacts as Record<string, string>;
            const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Contacto';
            return { name, phone: c.phone_number || '' };
        }
        return null;
    });

    // Emoji de reacción (almacenado en content o metadata)
    const reactionEmoji = computed(
        (): string => (parsedMetadata.value?.emoji as string) || (props.message.content as string) || '❤️',
    );

    const originalFileName = computed((): string => {
        const raw = parsedMetadata.value?.original_file_name;
        if (typeof raw !== 'string') {
            return '';
        }

        return raw.trim();
    });

    const documentDisplayName = computed((): string => {
        if (originalFileName.value !== '') {
            return originalFileName.value;
        }

        return (props.message.content || 'Documento') as string;
    });

    const documentMimeLabel = computed((): string => {
        const mime = String(props.message.media_mime || '').toLowerCase();
        if (mime.includes('pdf')) {
            return 'PDF';
        }
        if (mime.includes('word') || mime.includes('msword')) {
            return 'WORD';
        }
        if (mime.includes('sheet') || mime.includes('excel')) {
            return 'EXCEL';
        }
        if (mime.includes('presentation') || mime.includes('powerpoint')) {
            return 'PPT';
        }
        if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z')) {
            return 'ZIP';
        }
        if (mime.includes('json')) {
            return 'JSON';
        }
        if (mime.includes('xml')) {
            return 'XML';
        }
        if (mime.includes('csv')) {
            return 'CSV';
        }

        return mime !== '' ? mime.split('/').pop()?.toUpperCase() || 'FILE' : 'FILE';
    });

    const documentIconPath = computed((): string => {
        const mime = String(props.message.media_mime || '').toLowerCase();

        if (mime.includes('pdf')) {
            return 'M7 3h7l5 5v13H7a2 2 0 01-2-2V5a2 2 0 012-2zm4 7h5m-5 4h5m-8-4h1m-1 4h1';
        }

        if (mime.includes('image/')) {
            return 'M4 5a2 2 0 012-2h12a2 2 0 012 2v14H4V5zm3 3h.01M20 15l-4-4-4 4-2-2-4 4';
        }

        if (mime.includes('audio/')) {
            return 'M9 18V6l10-2v12M9 10l10-2M6 18a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z';
        }

        if (mime.includes('video/')) {
            return 'M4 7a2 2 0 012-2h8a2 2 0 012 2v1l4-2v12l-4-2v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7z';
        }

        return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
    });

    // Abre media en una nueva pestaña
    const openMedia = (url: string): void => {
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    const handleRetryClick = () => {
        emit('retry-message', { messageId: String(props.message.id) });
    };
</script>
