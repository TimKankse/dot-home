import { fetchNetdataJson, type NetdataConnection } from './cached-request';

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

export const fetchFunctionsData = async (
    connection: NetdataConnection,
    isScopeActive: (s: string) => boolean,
    processLimit: number,
): Promise<FunctionsData> => {
    const needsProcesses = isScopeActive('processes');
    const needsStorage = isScopeActive('storage');
    if (!needsProcesses && !needsStorage) return { processList: [], mountPointsList: [] };
    const functions = await fetchNetdataJson<{ functions?: Record<string, unknown> }>(
        connection, '/api/v1/functions', 5 * 60_000,
    ).catch(() => ({ functions: {} }));
    const available = functions.functions || {};
    const [processList, mountPointsList] = await Promise.all([
        needsProcesses && 'processes' in available ? fetchProcessesList(connection) : [],
        needsStorage && 'mount-points' in available ? fetchMountPointsList(connection) : [],
    ]);
    // Select the busiest processes after sorting, never before. Do not mutate
    // shared cached data when widgets request different process limits.
    return {
        processList: processList.sort((a, b) => b.cpu_percent - a.cpu_percent).slice(0, processLimit),
        mountPointsList,
    };
};

type FunctionResponse = { columns?: string[]; data?: unknown[][] };

// ========================================
// Helper: Fetch processes (raw)
// ========================================
async function fetchProcessesList(connection: NetdataConnection): Promise<ProcessInfo[]> {
    try {
        const procData = await fetchNetdataJson<FunctionResponse>(
            connection, '/api/v1/function?function=processes', 1500,
        );
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
    } catch {
        return [];
    }
}

// ========================================
// Helper: Fetch mount points (raw)
// ========================================
async function fetchMountPointsList(connection: NetdataConnection): Promise<MountPointInfo[]> {
    try {
        const mountData = await fetchNetdataJson<FunctionResponse>(
            connection, '/api/v1/function?function=mount-points', 1500,
        );
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
    } catch {
        return [];
    }
}
