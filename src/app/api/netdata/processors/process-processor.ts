import { NetdataChartResponse, ProcessData } from '../types';

export const processProcesses = (
    processList: ProcessData[],
    appsCpuData: NetdataChartResponse | null,
    appsMemData: NetdataChartResponse | null,
    containerCpuCharts: string[],
    containerCpuData: (NetdataChartResponse | null)[],
    containerMemData: (NetdataChartResponse | null)[],
    memTotal: number, // Need total memory for percent calculation
    processLimit: number
): ProcessData[] => {
    let result: ProcessData[] = [];

    if (processList.length > 0) {
        result = processList;
    } 
    else if (appsCpuData && appsCpuData.data && appsCpuData.data.length > 0) {
        const cpuDims = appsCpuData.labels;
        const cpuVals = appsCpuData.data[0];
        const memDims = appsMemData?.labels || [];
        const memVals = appsMemData?.data?.[0] || [];

        const memMap = new Map<string, number>();
        memDims.forEach((dim, idx) => {
            memMap.set(dim, memVals[idx] || 0);
        });

        for (let i = 1; i < cpuDims.length; i++) {
            const appName = cpuDims[i];
            const cpuVal = cpuVals[i];
            const memVal = memMap.get(appName) || 0;
            const memPercentVal = memTotal > 0 ? (memVal * 1024 * 1024 / memTotal) * 100 : 0;

            result.push({
                pid: i, 
                name: appName,
                cpu_percent: cpuVal,
                memory_percent: memPercentVal,
                username: 'root'
            });
        }
    } 
    
    else if (containerCpuCharts.length > 0) {
        result = containerCpuCharts.map((chartName, index) => {
            const cpuD = containerCpuData[index];
            const memD = containerMemData[index];
            
            const name = chartName.replace('app.', '').replace('_cpu_utilization', '');
            const cpuVal = (cpuD && cpuD.data && cpuD.data[0]) ? cpuD.data[0][1] : 0;
            const memVal = (memD && memD.data && memD.data[0]) ? memD.data[0][1] : 0; 
            const memPercentVal = memTotal > 0 ? ((memVal * 1024 * 1024) / memTotal) * 100 : 0;

            return {
                pid: index + 10000, 
                name: name,
                cpu_percent: cpuVal, 
                memory_percent: memPercentVal,
                username: 'docker'
            };
        });
    }

    result.sort((a, b) => b.cpu_percent - a.cpu_percent);
    return result.slice(0, processLimit);
};
