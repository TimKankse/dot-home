import { fetchInfo } from './utils/netdata-client';
import { createScopeChecker } from './utils/scope-manager';
import { fetchFunctionsData } from './utils/function-fetcher';
import { fetchAllMetrics, extractChartFromAllMetrics, getChartsByPrefix, getChartsByPattern } from './utils/allmetrics-fetcher';

// Processors
import { processCpu } from './processors/cpu-processor';
import { processMemory } from './processors/memory-processor';
import { processStorage } from './processors/storage-processor';
import { processProcesses } from './processors/process-processor';
import { processCores } from './processors/core-processor';
import { processGpu } from './processors/gpu-processor';
import { processNetwork } from './processors/network-processor';
import { processSensors } from './processors/sensor-processor';
import { processSystemInfo, processCpuModel } from './processors/system-processor';

import type { NetdataConnection } from './utils/cached-request';

function buildAllMetricsFilter(requestedScopes: string[]): string | undefined {
    const isScopeActive = createScopeChecker(requestedScopes);

    // If 'all' scope, don't filter
    if (requestedScopes.includes('all')) {
        return undefined;
    }

    const patterns: string[] = [];

    // Each pattern is a glob - Netdata supports wildcards
    if (isScopeActive('cpu')) {
        patterns.push('system.cpu');
    }
    if (isScopeActive('ram') || isScopeActive('processes')) {
        patterns.push('system.ram');
    }
    if (isScopeActive('processes')) {
        patterns.push('apps.cpu');
        patterns.push('apps.mem');
        patterns.push('*_cpu_utilization');
        patterns.push('*_mem_usage');
    }
    if (isScopeActive('system')) {
        patterns.push('system.uptime');
    }
    if (isScopeActive('gpu')) {
        patterns.push('nvidia_smi.*');
        patterns.push('intelgpu.*');
    }
    if (isScopeActive('storage')) {
        patterns.push('disk_space.*');
    }
    if (isScopeActive('network')) {
        patterns.push('net.*');
        patterns.push('system.net');
    }
    if (isScopeActive('sensors') || isScopeActive('cpu-cores') || isScopeActive('cpu')) {
        patterns.push('sensors.*');
    }
    if (isScopeActive('cpu-cores')) {
        patterns.push('cpu.*');
    }

    // Return space-separated patterns (Netdata simple patterns)
    return patterns.length > 0 ? patterns.join(' ') : undefined;
}

export async function fetchNetdataData(connection: NetdataConnection, requestedScopes: string[], processLimit: number) {
    const isScopeActive = createScopeChecker(requestedScopes);

    // Build filter for only needed charts
    const filter = buildAllMetricsFilter(requestedScopes);

    const [allMetrics, infoData, functionsData] = await Promise.all([
        fetchAllMetrics(connection, filter),
        (isScopeActive('system') || isScopeActive('cpu')) ? fetchInfo(connection) : Promise.resolve(null),
        fetchFunctionsData(connection, isScopeActive, processLimit),
    ]);
    if (!allMetrics) throw new Error('Netdata metrics unavailable');

    // Extract data from allmetrics
    const cpuData = isScopeActive('cpu') ? extractChartFromAllMetrics(allMetrics, 'system.cpu') : null;
    const ramData = (isScopeActive('ram') || isScopeActive('processes')) ? extractChartFromAllMetrics(allMetrics, 'system.ram') : null;
    const appsCpuData = isScopeActive('processes') ? extractChartFromAllMetrics(allMetrics, 'apps.cpu') : null;
    const appsMemData = isScopeActive('processes') ? extractChartFromAllMetrics(allMetrics, 'apps.mem') : null;
    const uptimeData = isScopeActive('system') ? extractChartFromAllMetrics(allMetrics, 'system.uptime') : null;
    const cpuFreqData = isScopeActive('cpu-cores') ? extractChartFromAllMetrics(allMetrics, 'cpu.cpufreq') : null;

    // GPU data
    const gpuScope = isScopeActive('gpu');
    const nvidiaUtil = gpuScope ? extractChartFromAllMetrics(allMetrics, 'nvidia_smi.gpu_utilization') : null;
    const nvidiaMem = gpuScope ? extractChartFromAllMetrics(allMetrics, 'nvidia_smi.memory_usage') : null;
    const nvidiaTemp = gpuScope ? extractChartFromAllMetrics(allMetrics, 'nvidia_smi.temperature') : null;
    const intelRender = gpuScope ? extractChartFromAllMetrics(allMetrics, 'intelgpu.igpu_engine_render_3d_busy_percentage') : null;

    // Dynamic chart discovery from allmetrics response
    let diskCharts: string[] = [];
    let netCharts: string[] = [];
    let sensorCharts: string[] = [];
    let containerCpuCharts: string[] = [];
    let containerMemCharts: string[] = [];
    let cpuCoreCharts: string[] = [];

    if (allMetrics) {
        if (isScopeActive('storage')) {
            diskCharts = getChartsByPrefix(allMetrics, 'disk_space.');
        }
        if (isScopeActive('network')) {
            netCharts = getChartsByPrefix(allMetrics, 'net.')
                .filter(c => !c.includes('lo') && !c.startsWith('net.veth') && !c.startsWith('net.docker'));
        }
        if (isScopeActive('sensors') || isScopeActive('cpu-cores') || isScopeActive('cpu')) {
            sensorCharts = getChartsByPrefix(allMetrics, 'sensors.');
        }
        if (isScopeActive('processes')) {
            const appCharts = getChartsByPrefix(allMetrics, 'app.');
            containerCpuCharts = appCharts.filter(c => c.endsWith('_cpu_utilization'));
            containerMemCharts = appCharts.filter(c => c.endsWith('_mem_usage'));
        }
        if (isScopeActive('cpu-cores')) {
            cpuCoreCharts = getChartsByPattern(allMetrics, /^cpu\.cpu\d+$/);
        }
    }

    // Fallback for network
    if (isScopeActive('network') && netCharts.length === 0) {
        netCharts.push('system.net');
    }

    // Extract array data from allmetrics
    const diskData = diskCharts.map(c => extractChartFromAllMetrics(allMetrics, c));
    const netData = netCharts.map(c => extractChartFromAllMetrics(allMetrics, c));
    const sensorData = sensorCharts.map(c => extractChartFromAllMetrics(allMetrics, c));
    const containerCpuData = containerCpuCharts.map(c => extractChartFromAllMetrics(allMetrics, c));
    const containerMemData = containerMemCharts.map(c => extractChartFromAllMetrics(allMetrics, c));
    const cpuCoreData = cpuCoreCharts.map(c => extractChartFromAllMetrics(allMetrics, c));

    // Process data
    const cpuTotal = isScopeActive('cpu') ? processCpu(cpuData) : undefined;
    const memData = (isScopeActive('ram') || isScopeActive('processes')) ? processMemory(ramData) : undefined;
    const memTotal = memData?.total || 0;

    const processList = isScopeActive('processes') ? processProcesses(
        functionsData.processList,
        appsCpuData,
        appsMemData,
        containerCpuCharts,
        containerCpuData,
        containerMemData,
        memTotal,
        processLimit
    ) : undefined;

    const fs = isScopeActive('storage') ? processStorage(functionsData.mountPointsList, diskCharts, diskData) : undefined;
    const coresResult = isScopeActive('cpu-cores') ? processCores(cpuCoreCharts, cpuCoreData, sensorCharts, sensorData, cpuFreqData) : undefined;
    const gpus = isScopeActive('gpu') ? processGpu(nvidiaUtil, nvidiaMem, nvidiaTemp, intelRender) : undefined;
    const network = isScopeActive('network') ? processNetwork(netCharts, netData) : undefined;
    const sensors = (isScopeActive('sensors') || isScopeActive('cpu') || isScopeActive('cpu-cores')) ? processSensors(sensorCharts, sensorData) : undefined;
    const systemInfo = processSystemInfo(infoData, uptimeData);
    const cpuModel = processCpuModel(infoData);


    return {
        cpu: isScopeActive('cpu') ? cpuTotal : undefined,
        cores: coresResult?.cores,
        coresDataType: coresResult?.dataType,
        gpus,
        mem: (isScopeActive('ram') || isScopeActive('processes')) ? memData : undefined,
        fs,
        sensors,
        processList,
        network,
        cpuModel,
        systemInfo,
        _strategy: 'allmetrics-filtered'
    };
}
