import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

declare global {
    interface Window {
        __flowCache?: Map<string, { data: unknown; expiresAt: number; createdAt: number }>;
        __flowGlobalCache?: Map<string, { data: unknown; expiresAt: number; createdAt: number }>;
    }
}

const executeCache: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables, replaceVariables, inputPortIndex, senderId } =
        context;

    const cacheEnabled = node.config.cacheEnabled !== false;
    const cacheScope = node.config.cacheScope || 'global';
    const cacheExpiryType = node.config.cacheExpiryType || 'ttl';
    const rawCacheKey = replaceVariables(node.config.cacheKey || 'default_cache_key');
    const cacheVariable = node.config.cacheVariable || 'cached_result';
    const cacheSourceVariable = node.config.cacheSourceVariable || cacheVariable;
    const ttlSeconds = cacheExpiryType === 'permanent' ? 0 : Number(node.config.cacheTtlSeconds) || 3600;

    const effectiveSenderId = senderId || variables.sender_id || 'test_user';
    const cacheKey = cacheScope === 'user' ? `user:${effectiveSenderId}:${rawCacheKey}` : `global:${rawCacheKey}`;

    const isSetOperation = inputPortIndex === 1;

    const scopeIcon = cacheScope === 'user' ? '👤' : '🌐';
    const scopeLabel = cacheScope === 'user' ? 'usuario' : 'global';
    const expiryIcon = cacheExpiryType === 'permanent' ? '♾️' : '⏱️';
    const expiryLabel = cacheExpiryType === 'permanent' ? 'permanente' : `${ttlSeconds}s TTL`;

    if (isSetOperation) {
        const dataToCache = variables[cacheSourceVariable];

        if (dataToCache !== undefined && dataToCache !== null) {
            const cacheStore = window.__flowCache || (window.__flowCache = new Map());

            cacheStore.set(cacheKey, {
                data: dataToCache,
                expiresAt: cacheExpiryType === 'permanent' ? Infinity : Date.now() + ttlSeconds * 1000,
                createdAt: Date.now(),
            });

            variables[cacheVariable] = dataToCache;

            testMessages.push({
                type: 'bot',
                content: `${scopeIcon}${expiryIcon} Cache SET (${scopeLabel}, ${expiryLabel}): "${rawCacheKey}" guardado`,
                nodeId: node.id,
                isDebug: true,
                rawResponse: {
                    cacheKey,
                    action: 'set',
                    ttl: ttlSeconds,
                    scope: cacheScope,
                    expiryType: cacheExpiryType,
                },
            });
        } else {
            testMessages.push({
                type: 'bot',
                content: `${scopeIcon}${expiryIcon} Cache SET (${scopeLabel}, ${expiryLabel}): "${rawCacheKey}" sin datos para guardar`,
                nodeId: node.id,
                isDebug: true,
            });
        }

        if (!isSubroutine) {
            await moveToNextNode(node.id, 0);
        }
        return null;
    }

    if (!cacheEnabled) {
        testMessages.push({
            type: 'bot',
            content: `${scopeIcon} Cache deshabilitado`,
            nodeId: node.id,
            isDebug: true,
        });
        if (!isSubroutine) {
            await moveToNextNode(node.id, 1);
        }
        return null;
    }

    const cacheStore = window.__flowCache || (window.__flowCache = new Map());
    const cacheEntry = cacheStore.get(cacheKey);
    const now = Date.now();

    if (cacheEntry && (cacheEntry.expiresAt === Infinity || cacheEntry.expiresAt > now)) {
        variables[cacheVariable] = cacheEntry.data;
        testMessages.push({
            type: 'bot',
            content: `${scopeIcon}${expiryIcon} Cache HIT (${scopeLabel}, ${expiryLabel}): "${rawCacheKey}"`,
            nodeId: node.id,
            rawResponse: {
                cacheKey,
                cached: true,
                data: cacheEntry.data,
                scope: cacheScope,
                expiryType: cacheExpiryType,
            },
        });
        if (!isSubroutine) {
            await moveToNextNode(node.id, 0);
        }
        return null;
    }

    testMessages.push({
        type: 'bot',
        content: `${scopeIcon}${expiryIcon} Cache MISS (${scopeLabel}): "${rawCacheKey}"`,
        nodeId: node.id,
    });

    if (!isSubroutine) {
        await moveToNextNode(node.id, 1);
    }

    return null;
};

export default executeCache;
