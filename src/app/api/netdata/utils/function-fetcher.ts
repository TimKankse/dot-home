export interface ProcessInfo {
    pid: number;
    name: string;
    cpu_percent: number;
    memory_percent: number;
    username: string;
}

export interface MountPointInfo {
    mnt_point: string;
    percent: number;
    used: number;
    size: number;
}

export interface FunctionsData {
    processList: ProcessInfo[];
    mountPointsList: MountPointInfo[];
}

// ========================================
// Caching for functions list only (rarely changes)
// Processes and mount points use short-TTL cache + request deduplication
// ========================================
interface FunctionsCacheEntry {
    availableFunctions: string[];
    timestamp: number;
}

interface DataCacheEntry<T> {
    data: T;
    timestamp: number;
}

// Only cache the functions list (rarely changes)
const FUNCTIONS_LIST_CACHE_TTL = 300000; // 5 minutes
const functionsListCache = new Map<string, FunctionsCacheEntry>();

// Short-TTL cache for processes and mount points
const DATA_CACHE_TTL = 1500;
const processesCache = new Map<string, DataCacheEntry<ProcessInfo[]>>();
const mountPointsCache = new Map<string, DataCacheEntry<MountPointInfo[]>>();

// Active request deduplication
const activeProcessesRequests = new Map<string, Promise<ProcessInfo[]>>();
const activeMountPointsRequests = new Map<string, Promise<MountPointInfo[]>>();

export const fetchFunctionsData = async (
    cleanUrl: string, 
    isScopeActive: (s: string) => boolean,
    processLimit: number
): Promise<FunctionsData> => {
    const needsProcesses = isScopeActive('processes');
    const needsStorage = isScopeActive('storage');

    if (!needsProcesses && !needsStorage) {
        return { processList: [], mountPointsList: [] };
    }

    const now = Date.now();

    // ========================================
    // Get available functions (cached - rarely changes)
    // ========================================
    let availableFunctions: string[] = [];
    const cachedFunctionsList = functionsListCache.get(cleanUrl);
    
    if (cachedFunctionsList && (now - cachedFunctionsList.timestamp < FUNCTIONS_LIST_CACHE_TTL)) {
        availableFunctions = cachedFunctionsList.availableFunctions;
    } else {
        try {
            const functionsRes = await fetch(`${cleanUrl}/api/v1/functions`, {
                signal: AbortSignal.timeout(2000),
                cache: 'no-store'
            });

            if (functionsRes.ok) {
                const functions = await functionsRes.json();
                availableFunctions = functions.functions ? Object.keys(functions.functions) : [];
                functionsListCache.set(cleanUrl, { availableFunctions, timestamp: now });
            }
        } catch (e) {
            console.warn('[Netdata] Failed to fetch functions list:', e);
        }
    }

    // ========================================
    // Fetch processes (short-TTL cache + deduplicate)
    // ========================================
    let processList: ProcessInfo[] = [];
    if (needsProcesses && availableFunctions.includes('processes')) {
        // Check cache first
        const cachedProcesses = processesCache.get(cleanUrl);
        if (cachedProcesses && (now - cachedProcesses.timestamp < DATA_CACHE_TTL)) {
            processList = cachedProcesses.data.slice(0, processLimit);
        } else if (activeProcessesRequests.has(cleanUrl)) {
            const data = await activeProcessesRequests.get(cleanUrl)!;
            processList = data.slice(0, processLimit);
        } else {
            const fetchPromise = fetchProcessesList(cleanUrl);
            activeProcessesRequests.set(cleanUrl, fetchPromise);
            
            try {
                const data = await fetchPromise;
                processesCache.set(cleanUrl, { data, timestamp: now });
                processList = data.slice(0, processLimit);
            } finally {
                activeProcessesRequests.delete(cleanUrl);
            }
        }
    }

    // ========================================
    // Fetch mount points (short-TTL cache + deduplicate)
    // ========================================
    let mountPointsList: MountPointInfo[] = [];
    if (needsStorage && availableFunctions.includes('mount-points')) {
        // Check cache first
        const cachedMountPoints = mountPointsCache.get(cleanUrl);
        if (cachedMountPoints && (now - cachedMountPoints.timestamp < DATA_CACHE_TTL)) {
            mountPointsList = cachedMountPoints.data;
        } else if (activeMountPointsRequests.has(cleanUrl)) {
            mountPointsList = await activeMountPointsRequests.get(cleanUrl)!;
        } else {
            const fetchPromise = fetchMountPointsList(cleanUrl);
            activeMountPointsRequests.set(cleanUrl, fetchPromise);
            
            try {
                mountPointsList = await fetchPromise;
                mountPointsCache.set(cleanUrl, { data: mountPointsList, timestamp: now });
            } finally {
                activeMountPointsRequests.delete(cleanUrl);
            }
        }
    }

    return { processList, mountPointsList };
};

// ========================================
// Helper: Fetch processes (raw)
// ========================================
async function fetchProcessesList(cleanUrl: string): Promise<ProcessInfo[]> {
    try {
        const procRes = await fetch(`${cleanUrl}/api/v1/function?function=processes`, {
            signal: AbortSignal.timeout(5000),
            cache: 'no-store'
        });
        
        if (!procRes.ok) return [];
        
        const procData = await procRes.json();
        if (!procData.data || !procData.columns) return [];
        
        const cols = Array.isArray(procData.columns) ? procData.columns : [];
        
        const pidIdx = cols.indexOf('pid');
        const nameIdx = cols.indexOf('name') !== -1 ? cols.indexOf('name') : cols.indexOf('command');
        const cpuIdx = cols.indexOf('cpu');
        const memIdx = cols.indexOf('mem');
        const userIdx = cols.indexOf('user');

        if (pidIdx === -1 || nameIdx === -1) return [];
        
        return procData.data.map((row: unknown[]) => ({
            pid: Number(row[pidIdx]),
            name: String(row[nameIdx]),
            cpu_percent: cpuIdx !== -1 ? Number(row[cpuIdx]) : 0,
            memory_percent: memIdx !== -1 ? Number(row[memIdx]) : 0,
            username: userIdx !== -1 ? String(row[userIdx]) : 'unknown'
        }));
    } catch (e) {
        console.warn('[Netdata] Failed to fetch processes:', e);
        return [];
    }
}

// ========================================
// Helper: Fetch mount points (raw)
// ========================================
async function fetchMountPointsList(cleanUrl: string): Promise<MountPointInfo[]> {
    try {
        const mountRes = await fetch(`${cleanUrl}/api/v1/function?function=mount-points`, {
            signal: AbortSignal.timeout(5000),
            cache: 'no-store'
        });
        
        if (!mountRes.ok) return [];
        
        const mountData = await mountRes.json();
        if (!mountData.data || !mountData.columns) return [];
        
        const cols = Array.isArray(mountData.columns) ? mountData.columns : [];
        
        const mountIdx = cols.indexOf('mount_point');
        const usedIdx = cols.indexOf('used');
        const availIdx = cols.indexOf('avail');
        const sizeIdx = cols.indexOf('size');
        const usedPercentIdx = cols.indexOf('used_percent');

        if (mountIdx === -1) return [];
        
        return mountData.data.map((row: unknown[]) => {
            const used = usedIdx !== -1 ? Number(row[usedIdx]) : 0;
            const avail = availIdx !== -1 ? Number(row[availIdx]) : 0;
            const total = sizeIdx !== -1 ? Number(row[sizeIdx]) : (used + avail);
            const percent = usedPercentIdx !== -1 ? Number(row[usedPercentIdx]) : (total > 0 ? (used / total) * 100 : 0);
            
            return {
                mnt_point: String(row[mountIdx]),
                percent,
                used,
                size: total
            };
        });
    } catch (e) {
        console.warn('[Netdata] Failed to fetch mount-points:', e);
        return [];
    }
}
