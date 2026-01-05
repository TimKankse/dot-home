import { NetdataChartResponse, CpuCoreData } from '../types';

export const processCores = (
    cpuCoreCharts: string[],
    cpuCoreData: (NetdataChartResponse | null)[],
    sensorCharts: string[],
    sensorData: (NetdataChartResponse | null)[],
    cpuFreqChart: NetdataChartResponse | null
): { cores: CpuCoreData[], dataType: string } => {
    let cores: CpuCoreData[] = [];
    let coresDataType = 'utilization';

    if (cpuCoreCharts.length > 0) {
        // Mode A: Utilization from cpu.cpuN
        const rawCores: (CpuCoreData | null)[] = cpuCoreCharts.map((chartName, i) => {
            const d = cpuCoreData[i];
            if (!d || !d.data || d.data.length === 0) return null;

            const dims = d.labels;
            const vals = d.data[0];
            let total = 0;
            const idleIndex = dims.indexOf('idle');
            for (let j = 1; j < vals.length; j++) {
                if (j !== idleIndex) total += vals[j];
            }

            const coreId = parseInt(chartName.replace('cpu.cpu', ''));
            
            let coreTemp = undefined;
            if (sensorCharts.length > 0) {
                 const sensorIdx = matchSensorToCore(sensorCharts, coreId);
                 if (sensorIdx !== -1 && sensorData[sensorIdx] && sensorData[sensorIdx]!.data.length > 0) {
                     coreTemp = sensorData[sensorIdx]!.data[0][1];
                 }
            }

            return {
                id: coreId,
                load: total,
                temp: coreTemp
            };
        });
        cores = rawCores.filter((c): c is CpuCoreData => c !== null).sort((a, b) => a.id - b.id);
    } else if (cpuFreqChart && cpuFreqChart.data && cpuFreqChart.data.length > 0) {
         // Mode B: Frequency Fallback
         coresDataType = 'frequency';
         const dims = cpuFreqChart.labels;
         const vals = cpuFreqChart.data[0];
         
         cores = dims.slice(1).map((label: string, i: number): CpuCoreData | null => {
             if (!label.startsWith('cpu')) return null;
             const coreId = parseInt(label.replace('cpu', ''));
             const val = vals[i + 1];
             
             let coreTemp = undefined;
             if (sensorCharts.length > 0) {
                 const sensorIdx = matchSensorToCore(sensorCharts, coreId);
                 if (sensorIdx !== -1 && sensorData[sensorIdx] && sensorData[sensorIdx]!.data.length > 0) {
                     coreTemp = sensorData[sensorIdx]!.data[0][1];
                 }
             }
             
             return { id: coreId, load: val, temp: coreTemp };
         }).filter((c): c is CpuCoreData => c !== null).sort((a, b) => a.id - b.id);
    }

    return { cores, dataType: coresDataType };
};

const matchSensorToCore = (sensorCharts: string[], coreId: number): number => {
    return sensorCharts.findIndex(s => {
        const lower = s.toLowerCase();
        return (
            lower.includes(`core_${coreId}`) ||
            lower.includes(`core ${coreId}`) ||
            lower.includes(`core${coreId}`) ||
            lower.includes(`temp${coreId + 1}`) ||
            lower.includes(`coretemp_core_${coreId}`)
        );
    });
};
