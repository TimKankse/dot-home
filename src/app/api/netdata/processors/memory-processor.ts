import { NetdataChartResponse, MemoryData } from '../types';

export const processMemory = (ramData: NetdataChartResponse | null): MemoryData | undefined => {
    if (!ramData || !ramData.data || ramData.data.length === 0) {
        return undefined;
    }

    const dims = ramData.labels;
    const vals = ramData.data[0];
    
    const freeIndex = dims.indexOf('free');
    const usedIndex = dims.indexOf('used');
    const cachedIndex = dims.indexOf('cached');
    const buffersIndex = dims.indexOf('buffers');

    const free = vals[freeIndex] || 0;
    const used = vals[usedIndex] || 0;
    const cached = vals[cachedIndex] || 0;
    const buffers = vals[buffersIndex] || 0;

    const memUsed = (used * 1024 * 1024); // MB to Bytes
    const memTotal = ((free + used + cached + buffers) * 1024 * 1024);
    const memPercent = (memUsed / memTotal) * 100;

    return {
        percent: memPercent,
        used: memUsed,
        total: memTotal
    };
};
