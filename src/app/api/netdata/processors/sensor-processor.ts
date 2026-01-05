import { NetdataChartResponse, SensorData } from '../types';

export const processSensors = (
    sensorCharts: string[], 
    sensorData: (NetdataChartResponse | null)[]
): SensorData[] => {
    return sensorCharts.map((chartName, i) => {
        const d = sensorData[i];
        if (!d || !d.data || d.data.length === 0) return null;
        return {
            label: chartName.replace('sensors.', ''),
            value: d.data[0][1],
            unit: '°C'
        };
    }).filter((item): item is SensorData => item !== null);
};
