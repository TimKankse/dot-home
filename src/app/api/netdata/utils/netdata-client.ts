import { NetdataChartResponse } from '../types';

export const fetchNetdata = async (baseUrl: string, chart: string): Promise<NetdataChartResponse | null> => {
    // after=-1 ensures we get the latest data point (last second)
    // without it, points=1 returns average of the whole database/default retention
    const apiUrl = `${baseUrl}/api/v1/data?chart=${chart}&points=1&after=-1&group=average&format=json`;
    try {
        const res = await fetch(apiUrl, { 
            signal: AbortSignal.timeout(10000),
            cache: 'no-store'
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.warn(`[Netdata] Failed to fetch chart ${chart}:`, e);
        return null;
    }
};

// The info endpoint returns a complex object with system information
// Using Record<string, unknown> as the exact shape varies by Netdata version
export const fetchInfo = async (baseUrl: string): Promise<Record<string, unknown> | null> => {
    try {
        const res = await fetch(`${baseUrl}/api/v1/info`, {
            signal: AbortSignal.timeout(10000),
            cache: 'no-store'
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.warn('[Netdata] Failed to fetch info:', e);
        return null;
    }
};

export const fetchChartsList = async (baseUrl: string): Promise<{ charts: string[]; error?: string }> => {
    try {
        const chartsRes = await fetch(`${baseUrl}/api/v1/charts`, { 
            signal: AbortSignal.timeout(30000),
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
