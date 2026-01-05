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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetchInfo = async (baseUrl: string): Promise<any | null> => {
    try {
        const res = await fetch(`${baseUrl}/api/v1/info`, {
            signal: AbortSignal.timeout(5000),
            cache: 'no-store'
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.warn('[Netdata] Failed to fetch info:', e);
        return null;
    }
};

export const fetchChartsList = async (baseUrl: string): Promise<string[]> => {
    try {
        const chartsRes = await fetch(`${baseUrl}/api/v1/charts`, { 
            signal: AbortSignal.timeout(5000),
            cache: 'no-store'
        });
        if (!chartsRes.ok) throw new Error('Failed to fetch charts list');
        const charts = await chartsRes.json();
        return Object.keys(charts.charts);
    } catch (e) {
        console.error('[Netdata] Failed to fetch charts list:', e);
        return [];
    }
};
