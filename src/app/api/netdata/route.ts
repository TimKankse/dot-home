import { NextResponse } from 'next/server';
import { fetchInfo } from './utils/netdata-client';
import { createScopeChecker } from './utils/scope-manager';
import { fetchFunctionsData } from './utils/function-fetcher';
import { fetchAllMetrics, extractChartFromAllMetrics, getChartsByPrefix, getChartsByPattern, AllMetricsData } from './utils/allmetrics-fetcher';

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
import { prisma } from '@/lib/db';
import { decryptSensitiveFields } from '@/utils/crypto';

// ========================================
// Integration config cache
// ========================================
const integrationConfigCache = new Map<string, { url: string, timestamp: number }>();

async function getNetdataUrl(integrationId: string | null, bodyUrl: string | null): Promise<string | null> {
    if (bodyUrl) return bodyUrl;
    if (!integrationId) return null;
    
    const cached = integrationConfigCache.get(integrationId);
    const now = Date.now();
    if (cached && (now - cached.timestamp < 60000)) {
        return cached.url;
    }
    
    const integration = await prisma.integration.findUnique({
        where: { id: integrationId }
    });
    
    if (integration) {
        const config = decryptSensitiveFields(JSON.parse(integration.config)) as Record<string, unknown>;
        const url = (config.url || config.externalUrl) as string | undefined;
        if (url && typeof url === 'string') {
            integrationConfigCache.set(integrationId, { url, timestamp: now });
            return url;
        }
    }
    
    return null;
}

// ========================================
// Build filter string for allmetrics based on scopes
// ========================================
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

// ========================================
// Allmetrics cache with short TTL
// ========================================
interface AllMetricsCacheEntry {
    data: AllMetricsData;
    timestamp: number;
}
const allMetricsCache = new Map<string, AllMetricsCacheEntry>();
const ALLMETRICS_CACHE_TTL = 1500; // 1.5 seconds

// ========================================
// Fetch Netdata data for given scopes using allmetrics
// ========================================
async function fetchNetdataData(cleanUrl: string, requestedScopes: string[], processLimit: number) {
    const isScopeActive = createScopeChecker(requestedScopes);
    
    // Build filter for only needed charts
    const filter = buildAllMetricsFilter(requestedScopes);
    const cacheKey = filter ? `${cleanUrl}:${filter}` : cleanUrl;
    
    // Check cache
    let allMetrics: AllMetricsData | null = null;
    const cached = allMetricsCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp < ALLMETRICS_CACHE_TTL)) {
        allMetrics = cached.data;
    } else {
        allMetrics = await fetchAllMetrics(cleanUrl, filter);
        
        if (allMetrics) {
            allMetricsCache.set(cacheKey, { data: allMetrics, timestamp: now });
        }
    }
    
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

    // Fetch info (cached 1 minute) and functions data in parallel
    const [infoData, functionsData] = await Promise.all([
        (isScopeActive('system') || isScopeActive('cpu')) ? fetchInfo(cleanUrl) : Promise.resolve(null),
        fetchFunctionsData(cleanUrl, isScopeActive, processLimit)
    ]);

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

// ========================================
// SSE Endpoint - GET /api/netdata/stream
// ========================================
export async function GET(request: Request) {
    const reqUrl = new URL(request.url);
    const integrationId = reqUrl.searchParams.get('integrationId');
    const directUrl = reqUrl.searchParams.get('url');
    const scopeParam = reqUrl.searchParams.get('scope');
    const intervalParam = reqUrl.searchParams.get('interval');
    const processLimitParam = reqUrl.searchParams.get('processLimit');
    
    const scopes = scopeParam ? scopeParam.split(',') : ['all'];
    const interval = intervalParam ? parseInt(intervalParam, 10) : 2000;
    const processLimit = processLimitParam ? parseInt(processLimitParam, 10) : 10;
    
    // Get Netdata URL (direct URL takes precedence over integration lookup)
    const netdataUrl = await getNetdataUrl(integrationId, directUrl);
    if (!netdataUrl) {
        return new Response(JSON.stringify({ error: 'URL or integration required' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    const baseUrl = netdataUrl.startsWith('http') ? netdataUrl : `http://${netdataUrl}`;
    const cleanUrl = baseUrl.replace(/\/$/, '');
    
    // Create SSE stream
    const encoder = new TextEncoder();
    let intervalId: NodeJS.Timeout | null = null;
    
    const stream = new ReadableStream({
        async start(controller) {
            // Send initial data immediately
            try {
                const data = await fetchNetdataData(cleanUrl, scopes, processLimit);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            } catch {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Failed to fetch' })}\n\n`));
            }
            
            // Set up interval for subsequent updates
            intervalId = setInterval(async () => {
                try {
                    const data = await fetchNetdataData(cleanUrl, scopes, processLimit);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Failed to fetch' })}\n\n`));
                }
            }, interval);
        },
        cancel() {
            if (intervalId) {
                clearInterval(intervalId);
            }
        }
    });
    
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

// ========================================
// POST Endpoint (legacy, for compatibility)
// ========================================
export async function POST(request: Request) {
    try {
        const { url: bodyUrl, processLimit = 10, scope } = await request.json();
        const integrationId = request.headers.get('x-integration-id');
        
        const netdataUrl = await getNetdataUrl(integrationId, bodyUrl);
        if (!netdataUrl) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }
        
        const baseUrl = netdataUrl.startsWith('http') ? netdataUrl : `http://${netdataUrl}`;
        const cleanUrl = baseUrl.replace(/\/$/, '');
        
        const requestedScopes = Array.isArray(scope) && scope.length > 0 ? scope : ['all'];
        const data = await fetchNetdataData(cleanUrl, requestedScopes, processLimit);
        
        return NextResponse.json(data);
    } catch (error) {
        console.error('Netdata API Error:', error);
        return NextResponse.json({ error: 'Failed to connect to Netdata' }, { status: 500 });
    }
}
