import { NetdataChartResponse, CpuData } from '../types';

export const processCpu = (cpuData: NetdataChartResponse | null): CpuData | undefined => {
    if (!cpuData || !cpuData.data || cpuData.data.length === 0) {
        return undefined;
    }

    const dims = cpuData.labels;
    const vals = cpuData.data[0];
    const idleIndex = dims.indexOf('idle');
    
    let cpuTotal = 0;
    for (let i = 1; i < vals.length; i++) {
        if (i !== idleIndex) {
            cpuTotal += vals[i];
        }
    }

    return { total: cpuTotal };
};
