import { SystemInfoData } from '../types';

interface InfoResponse {
    host_labels?: Record<string, string>;
}

interface UptimeResponse {
    data?: number[][];
}

export const processSystemInfo = (
    infoData: InfoResponse | null, 
    uptimeData: UptimeResponse | null
): SystemInfoData | undefined => {
    if (!infoData) return undefined;

    return {
        hostname: infoData?.host_labels?._hostname || 'Unknown',
        uptime: uptimeData?.data?.[0]?.[1] || 0,
        os: `${infoData?.host_labels?._os_name || ''} ${infoData?.host_labels?._os_version || ''}`.trim(),
        kernel: infoData?.host_labels?._kernel_version || '',
        ip: infoData?.host_labels?._net_default_iface_ip || '',
        virtualization: infoData?.host_labels?._virtualization || 'none'
    };
};

export const processCpuModel = (infoData: InfoResponse | null): string | null => {
    let cpuModel = infoData?.host_labels?._system_cpu_model || null;
    if (cpuModel) {
        cpuModel = cpuModel
            .replace(/Intel\(R\) Core\(TM\) /gi, '')
            .replace(/AMD Ryzen /gi, 'Ryzen ')
            .replace(/ CPU/gi, '')
            .replace(/ Processor/gi, '')
            .trim();
    }
    return cpuModel;
};
