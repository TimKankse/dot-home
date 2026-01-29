import { NetdataChartResponse } from '../types';

/**
 * Allmetrics response structure from Netdata /api/v1/allmetrics?format=json
 * Each key is a chart name, containing latest values as key-value pairs
 */
export interface AllMetricsData {
    [chartName: string]: {
        name: string;
        family: string;
        context: string;
        units: string;
        last_updated: number;
        dimensions: {
            [dimensionName: string]: {
                name: string;
                value: number;
            };
        };
    };
}

// Request deduplication only - no time-based caching
// This respects user's refresh interval
const activeRequests = new Map<string, Promise<AllMetricsData | null>>();

/**
 * Fetches all metrics from Netdata in a single API call
 * Only deduplicates simultaneous requests, no time-based caching
 * @param baseUrl The Netdata server base URL
 * @returns All metrics data or null on error
 */
export const fetchAllMetrics = async (baseUrl: string, filter?: string): Promise<AllMetricsData | null> => {
    // Only deduplicate simultaneous requests
    const cacheKey = filter ? `${baseUrl}:${filter}` : baseUrl;
    if (activeRequests.has(cacheKey)) {
        return activeRequests.get(cacheKey)!;
    }

    const fetchPromise = (async (): Promise<AllMetricsData | null> => {
        try {
            const params = new URLSearchParams({ format: 'json' });
            if (filter) {
                params.set('filter', filter);
            }
            
            const res = await fetch(`${baseUrl}/api/v1/allmetrics?${params.toString()}`, {
                signal: AbortSignal.timeout(10000),
                cache: 'no-store'
            });

            if (!res.ok) {
                console.warn(`[Netdata] allmetrics returned ${res.status}`);
                activeRequests.delete(cacheKey);
                return null;
            }

            const data: AllMetricsData = await res.json();
            activeRequests.delete(cacheKey);
            return data;
        } catch (e) {
            console.warn('[Netdata] Failed to fetch allmetrics:', e);
            activeRequests.delete(cacheKey);
            return null;
        }
    })();

    activeRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
};

/**
 * Extracts a specific chart's data from allmetrics response and converts it
 * to the NetdataChartResponse format that processors expect
 * @param allMetrics The full allmetrics response
 * @param chartName The chart to extract (e.g., 'system.cpu')
 * @returns Data in the same format as /api/v1/data endpoint
 */
export const extractChartFromAllMetrics = (
    allMetrics: AllMetricsData | null,
    chartName: string
): NetdataChartResponse | null => {
    if (!allMetrics || !allMetrics[chartName]) {
        return null;
    }

    const chart = allMetrics[chartName];
    const dimensions = chart.dimensions;
    
    // Build labels array: ['time', ...dimension names]
    const labels = ['time', ...Object.keys(dimensions)];
    
    // Build data array: [[timestamp, ...values]]
    const values = Object.values(dimensions).map(d => d.value);
    const data = [[chart.last_updated, ...values]];

    return { labels, data };
};

/**
 * Gets all chart names that match a prefix from allmetrics
 * @param allMetrics The full allmetrics response
 * @param prefix Chart name prefix (e.g., 'disk_space.', 'net.')
 * @returns Array of matching chart names
 */
export const getChartsByPrefix = (
    allMetrics: AllMetricsData | null,
    prefix: string
): string[] => {
    if (!allMetrics) return [];
    return Object.keys(allMetrics).filter(name => name.startsWith(prefix));
};

/**
 * Gets charts matching a regex pattern
 * @param allMetrics The full allmetrics response  
 * @param pattern Regex pattern to match chart names
 * @returns Array of matching chart names
 */
export const getChartsByPattern = (
    allMetrics: AllMetricsData | null,
    pattern: RegExp
): string[] => {
    if (!allMetrics) return [];
    return Object.keys(allMetrics).filter(name => pattern.test(name));
};
