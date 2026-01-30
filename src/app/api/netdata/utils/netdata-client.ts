import { NetdataChartResponse } from '../types';

interface InfoCacheEntry {
    data: Record<string, unknown>;
    timestamp: number;
}

const infoCache = new Map<string, InfoCacheEntry>();
const INFO_CACHE_TTL = 60000; // 1 minute for system info

const activeChartRequests = new Map<string, Promise<NetdataChartResponse | null>>();
const activeInfoRequests = new Map<string, Promise<Record<string, unknown> | null>>();

export const fetchNetdata = async (baseUrl: string, chart: string): Promise<NetdataChartResponse | null> => {
    const cacheKey = `${baseUrl}:${chart}`;
    
    if (activeChartRequests.has(cacheKey)) {
        return activeChartRequests.get(cacheKey)!;
    }
    
    const fetchPromise = (async (): Promise<NetdataChartResponse | null> => {
        const apiUrl = `${baseUrl}/api/v1/data?chart=${chart}&points=1&after=-1&group=average&format=json`;
        try {
            const res = await fetch(apiUrl, { 
                signal: AbortSignal.timeout(5000),
                cache: 'no-store'
            });
            if (!res.ok) {
                activeChartRequests.delete(cacheKey);
                return null;
            }
            const data = await res.json();
            activeChartRequests.delete(cacheKey);
            return data;
        } catch (e) {
            console.warn(`[Netdata] Failed to fetch chart ${chart}:`, e);
            activeChartRequests.delete(cacheKey);
            return null;
        }
    })();
    
    activeChartRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
};

export const fetchInfo = async (baseUrl: string): Promise<Record<string, unknown> | null> => {
    const now = Date.now();
    
    const cached = infoCache.get(baseUrl);
    if (cached && (now - cached.timestamp < INFO_CACHE_TTL)) {
        return cached.data;
    }
    
    if (activeInfoRequests.has(baseUrl)) {
        return activeInfoRequests.get(baseUrl)!;
    }
    
    const fetchPromise = (async (): Promise<Record<string, unknown> | null> => {
        try {
            const res = await fetch(`${baseUrl}/api/v1/info`, {
                signal: AbortSignal.timeout(5000),
                cache: 'no-store'
            });
            if (!res.ok) {
                activeInfoRequests.delete(baseUrl);
                return null;
            }
            const data = await res.json();
            infoCache.set(baseUrl, { data, timestamp: Date.now() });
            activeInfoRequests.delete(baseUrl);
            return data;
        } catch (e) {
            console.warn('[Netdata] Failed to fetch info:', e);
            activeInfoRequests.delete(baseUrl);
            return null;
        }
    })();
    
    activeInfoRequests.set(baseUrl, fetchPromise);
    return fetchPromise;
};

export const fetchChartsList = async (baseUrl: string): Promise<{ charts: string[]; error?: string }> => {
    try {
        const chartsRes = await fetch(`${baseUrl}/api/v1/charts`, { 
            signal: AbortSignal.timeout(10000),
            cache: 'no-store'
        });
        if (!chartsRes.ok) throw new Error(`HTTP ${chartsRes.status}`);
        const charts = await chartsRes.json();
        return { charts: Object.keys(charts.charts) };
    } catch (e) {
        console.error('[Netdata] Failed to fetch charts list:', e);
        return { charts: [], error: e instanceof Error ? e.message : String(e) };
    }
};
