import { NextResponse } from 'next/server';
import { fetchNetdata, fetchInfo, fetchChartsList } from './utils/netdata-client';
import { getRequestedScopes, createScopeChecker } from './utils/scope-manager';
import { fetchFunctionsData } from './utils/function-fetcher';

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

export async function POST(request: Request) {
  try {
    const { url, processLimit = 10, scope } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Setup Scope
    const requestedScopes = getRequestedScopes(scope);
    const isScopeActive = createScopeChecker(requestedScopes);

    // Setup URL
    const baseUrl = url.startsWith('http') ? url : `http://${url}`;
    const cleanUrl = baseUrl.replace(/\/$/, '');
    const fetcher = (chart: string) => fetchNetdata(cleanUrl, chart);

    // Dynamic Chart Discovery
    const dynamicScopes = ['storage', 'network', 'sensors', 'processes', 'cpu-cores', 'gpu', 'cpu'];
    const needsDynamicCharts = requestedScopes.includes('all') || requestedScopes.some(s => dynamicScopes.includes(s));

    let chartNames: string[] = [];
    if (needsDynamicCharts) {
        chartNames = await fetchChartsList(cleanUrl);
        if (chartNames.length === 0 && !isScopeActive('cpu') && !isScopeActive('ram')) {
             // If chart list fails and we strictly need it, fail. 
             // Logic from original: proceed if cpu/ram is active, else fail.
             // But here chartNames is empty if fail.
             return NextResponse.json({ error: 'Failed to connect to Netdata' }, { status: 500 });
        }
    }

    // Chart Filtering
    const diskCharts = isScopeActive('storage') ? chartNames.filter(c => c.startsWith('disk_space.')) : [];
    const netCharts = isScopeActive('network') ? chartNames.filter(c => c.startsWith('net.') && !c.includes('lo') && !c.startsWith('net.veth') && !c.startsWith('net.docker')) : [];
    const sensorCharts = (isScopeActive('sensors') || isScopeActive('cpu-cores') || isScopeActive('cpu')) ? chartNames.filter(c => c.startsWith('sensors.')) : [];
    
    // Container Charts
    const containerCpuCharts = isScopeActive('processes') ? chartNames.filter(c => c.startsWith('app.') && c.endsWith('_cpu_utilization')) : [];
    const containerMemCharts = isScopeActive('processes') ? chartNames.filter(c => c.startsWith('app.') && c.endsWith('_mem_usage')) : [];
    
    // Core Charts
    const cpuCoreCharts = isScopeActive('cpu-cores') ? chartNames.filter(c => /^cpu\.cpu\d+$/.test(c)) : [];

    // Promise Orchestration
    const cpuPromise = isScopeActive('cpu') ? fetcher('system.cpu') : Promise.resolve(null);
    const ramPromise = isScopeActive('ram') || isScopeActive('processes') ? fetcher('system.ram') : Promise.resolve(null);
    const appsCpuPromise = isScopeActive('processes') ? fetcher('apps.cpu') : Promise.resolve(null);
    const appsMemPromise = isScopeActive('processes') ? fetcher('apps.mem') : Promise.resolve(null);
    const uptimePromise = isScopeActive('system') ? fetcher('system.uptime') : Promise.resolve(null);
    const cpuFreqPromise = isScopeActive('cpu-cores') && cpuCoreCharts.length === 0 ? fetcher('cpu.cpufreq') : Promise.resolve(null);

    // GPU Promises
    const gpuScope = isScopeActive('gpu');
    const nvidiaUtilPromise = gpuScope ? fetcher('nvidia_smi.gpu_utilization') : Promise.resolve(null);
    const nvidiaMemPromise = gpuScope ? fetcher('nvidia_smi.memory_usage') : Promise.resolve(null);
    const nvidiaTempPromise = gpuScope ? fetcher('nvidia_smi.temperature') : Promise.resolve(null);
    const intelRenderPromise = gpuScope ? fetcher('intelgpu.igpu_engine_render_3d_busy_percentage') : Promise.resolve(null);

    const infoPromise = (isScopeActive('system') || isScopeActive('cpu')) ? fetchInfo(cleanUrl) : Promise.resolve(null);
    const functionsPromise = fetchFunctionsData(cleanUrl, isScopeActive, processLimit);

    // Array Promises
    const containerCpuPromises = containerCpuCharts.map(c => fetcher(c));
    const containerMemPromises = containerMemCharts.map(c => fetcher(c));
    const cpuCorePromises = cpuCoreCharts.map(c => fetcher(c));
    const diskPromises = diskCharts.map(c => fetcher(c));
    const netPromises = netCharts.map(c => fetcher(c));
    const sensorPromises = sensorCharts.map(c => fetcher(c));

    // Await All
    const [
        cpuData, ramData, appsCpuData, appsMemData, uptimeData, infoData, functionsData, cpuFreqData,
        nvidiaUtil, nvidiaMem, nvidiaTemp, intelRender,
        ...rest
    ] = await Promise.all([
        cpuPromise, ramPromise, appsCpuPromise, appsMemPromise, uptimePromise, infoPromise, functionsPromise, cpuFreqPromise,
        nvidiaUtilPromise, nvidiaMemPromise, nvidiaTempPromise, intelRenderPromise,
        ...containerCpuPromises, 
        ...containerMemPromises,
        ...cpuCorePromises,
        ...diskPromises,
        ...netPromises,
        ...sensorPromises
    ]);

    // Unpack Rest Array
    let cursor = 0;
    const containerCpuData = rest.slice(cursor, cursor + containerCpuCharts.length); cursor += containerCpuCharts.length;
    const containerMemData = rest.slice(cursor, cursor + containerMemCharts.length); cursor += containerMemCharts.length;
    const cpuCoreData = rest.slice(cursor, cursor + cpuCoreCharts.length); cursor += cpuCoreCharts.length;
    const diskData = rest.slice(cursor, cursor + diskCharts.length); cursor += diskCharts.length;
    const netData = rest.slice(cursor, cursor + netCharts.length); cursor += netCharts.length;
    const sensorData = rest.slice(cursor, cursor + sensorCharts.length); cursor += sensorCharts.length;


    // Execute Processors
    const cpuTotal = processCpu(cpuData);
    const memData = processMemory(ramData);
    
    // Process List needs memory total for percent calculation
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

    return NextResponse.json({
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
      systemInfo
    });

  } catch (error) {
    console.error('Netdata API Error:', error);
    return NextResponse.json({ error: 'Failed to connect to Netdata' }, { status: 500 });
  }
}
