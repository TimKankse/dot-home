import { NetdataChartResponse, GpuData } from '../types';

export const processGpu = (
    nvidiaUtil: NetdataChartResponse | null,
    nvidiaMem: NetdataChartResponse | null,
    nvidiaTemp: NetdataChartResponse | null,
    intelRender: NetdataChartResponse | null
): GpuData[] => {
    const gpus: GpuData[] = [];

    // NVIDIA
    if (nvidiaUtil && nvidiaUtil.data && nvidiaUtil.data.length > 0) {
        const dims = nvidiaUtil.labels;
        const vals = nvidiaUtil.data[0];

        for (let i = 1; i < dims.length; i++) {
            const gpuId = dims[i];
            const util = vals[i];
            let mem = 0, temp = 0;
            
            if (nvidiaMem?.data) {
                const idx = nvidiaMem.labels.indexOf(gpuId);
                if (idx !== -1) mem = nvidiaMem.data[0][idx];
            }
            if (nvidiaTemp?.data) {
                const idx = nvidiaTemp.labels.indexOf(gpuId);
                if (idx !== -1) temp = nvidiaTemp.data[0][idx];
            }

            gpus.push({
                id: `nvidia_${gpuId}`,
                name: `NVIDIA ${gpuId.toUpperCase()}`,
                utilization: util,
                memory: mem,
                temperature: temp
            });
        }
    }
    
    // Intel
    if (intelRender?.data && intelRender.data.length > 0) {
        gpus.push({
            id: 'intel_igpu',
            name: 'Intel iGPU',
            utilization: intelRender.data[0][1] || 0
        });
    }

    return gpus;
};
