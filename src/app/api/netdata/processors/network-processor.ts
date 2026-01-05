import { NetdataChartResponse, NetworkInterfaceData } from '../types';

export const processNetwork = (
    netCharts: string[], 
    netData: (NetdataChartResponse | null)[]
): NetworkInterfaceData[] => {
    return netCharts.map((chartName, i) => {
        const d = netData[i];
        if (!d || !d.data || d.data.length === 0) return null;
        const dims = d.labels;
        const vals = d.data[0];
        const rxIndex = dims.indexOf('received');
        const txIndex = dims.indexOf('sent');
        return {
            interface_name: chartName.replace('net.', ''),
            rx: (vals[rxIndex] || 0) * 1000 / 8, 
            tx: Math.abs(vals[txIndex] || 0) * 1000 / 8
        };
    }).filter((item): item is NetworkInterfaceData => item !== null);
};
