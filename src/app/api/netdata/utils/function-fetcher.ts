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
    cleanUrl: string, 
    isScopeActive: (s: string) => boolean,
    processLimit: number
): Promise<FunctionsData> => {
    let processList: ProcessInfo[] = [];
    let mountPointsList: MountPointInfo[] = [];

    if (!isScopeActive('processes') && !isScopeActive('storage')) {
        return { processList, mountPointsList };
    }

    try {
        const functionsRes = await fetch(`${cleanUrl}/api/v1/functions`, {
            signal: AbortSignal.timeout(2000),
            cache: 'no-store'
        });

        if (functionsRes.ok) {
            const functions = await functionsRes.json();
            const availableFunctions = functions.functions ? Object.keys(functions.functions) : [];

            if (isScopeActive('processes') && availableFunctions.includes('processes')) {
                try {
                    const procRes = await fetch(`${cleanUrl}/api/v1/function?function=processes`, {
                        signal: AbortSignal.timeout(5000),
                        cache: 'no-store'
                    });
                    if (procRes.ok) {
                        const procData = await procRes.json();
                        if (procData.data && procData.columns) {
                            const cols = Array.isArray(procData.columns) ? procData.columns : [];
                            
                            const pidIdx = cols.indexOf('pid');
                            const nameIdx = cols.indexOf('name') !== -1 ? cols.indexOf('name') : cols.indexOf('command');
                            const cpuIdx = cols.indexOf('cpu');
                            const memIdx = cols.indexOf('mem');
                            const userIdx = cols.indexOf('user');

                            if (pidIdx !== -1 && nameIdx !== -1) {
                                processList = procData.data.slice(0, processLimit).map((row: unknown[]) => ({
                                    pid: Number(row[pidIdx]),
                                    name: String(row[nameIdx]),
                                    cpu_percent: cpuIdx !== -1 ? Number(row[cpuIdx]) : 0,
                                    memory_percent: memIdx !== -1 ? Number(row[memIdx]) : 0,
                                    username: userIdx !== -1 ? String(row[userIdx]) : 'unknown'
                                }));
                            }
                        }
                    }
                } catch (e) { console.warn('Failed process fetch', e)}
            }

            if (isScopeActive('storage') && availableFunctions.includes('mount-points')) {
                 try {
                    const mountRes = await fetch(`${cleanUrl}/api/v1/function?function=mount-points`, {
                        signal: AbortSignal.timeout(5000),
                        cache: 'no-store'
                    });
                    if (mountRes.ok) {
                        const mountData = await mountRes.json();
                        if (mountData.data && mountData.columns) {
                            const cols = Array.isArray(mountData.columns) ? mountData.columns : [];
                            
                            const mountIdx = cols.indexOf('mount_point');
                            const usedIdx = cols.indexOf('used');
                            const availIdx = cols.indexOf('avail');
                            const sizeIdx = cols.indexOf('size');
                            const usedPercentIdx = cols.indexOf('used_percent'); 

                            if (mountIdx !== -1) {
                                mountPointsList = mountData.data.map((row: unknown[]) => {
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
                            }
                        }
                    }
                 } catch (e) { console.warn('Failed mount-points fetch', e)}
            }
        }
    } catch (e) {
        console.warn('[Netdata] Failed to fetch functions:', e);
    }
    
    return { processList, mountPointsList };
};
