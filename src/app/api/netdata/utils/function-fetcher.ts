/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FunctionsData {
    processList: any[];
    mountPointsList: any[];
}

export const fetchFunctionsData = async (
    cleanUrl: string, 
    isScopeActive: (s: string) => boolean,
    processLimit: number
): Promise<FunctionsData> => {
    let processList: any[] = [];
    let mountPointsList: any[] = [];

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
                                processList = procData.data.slice(0, processLimit).map((row: any) => ({
                                    pid: row[pidIdx],
                                    name: row[nameIdx],
                                    cpu_percent: cpuIdx !== -1 ? row[cpuIdx] : 0,
                                    memory_percent: memIdx !== -1 ? row[memIdx] : 0,
                                    username: userIdx !== -1 ? row[userIdx] : 'unknown'
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
                                mountPointsList = mountData.data.map((row: any) => {
                                    const used = usedIdx !== -1 ? row[usedIdx] : 0;
                                    const avail = availIdx !== -1 ? row[availIdx] : 0;
                                    const total = sizeIdx !== -1 ? row[sizeIdx] : (used + avail);
                                    
                                    return {
                                        mnt_point: row[mountIdx],
                                        percent: usedPercentIdx !== -1 ? row[usedPercentIdx] : (total > 0 ? (used / total) * 100 : 0),
                                        used: used,
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
