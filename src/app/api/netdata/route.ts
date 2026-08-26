import { NextResponse } from 'next/server';
import { apiSecurityErrorResponse, ApiSecurityError } from '@/lib/api-security';
import {
    resolveIntegrationBaseUrl,
    resolveRequestIntegration,
} from '@/lib/integration-connection';
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

const VALID_SCOPES = new Set([
    'all', 'cpu', 'ram', 'storage', 'processes', 'network',
    'system', 'cpu-cores', 'gpu', 'sensors',
]);
const MIN_INTERVAL_MS = 2000;
const MAX_INTERVAL_MS = 60000;
const MAX_STREAMS_PER_INTEGRATION = 8;
const MAX_STREAM_DURATION_MS = 5 * 60 * 1000;
const activeStreams = new Map<string, number>();

const parseScopes = (scopeParam: string | null): string[] => {
    const scopes = [...new Set((scopeParam || 'all').split(',').filter(Boolean))];
    if (scopes.length === 0 || scopes.some((scope) => !VALID_SCOPES.has(scope))) {
        throw new ApiSecurityError('Invalid Netdata scope', 400, 'invalid_scope');
    }
    return scopes.includes('all') ? ['all'] : scopes;
};

const parseBoundedInteger = (
    value: unknown,
    fallback: number,
    min: number,
    max: number,
): number => {
    const parsed = typeof value === 'number' ? value : Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(parsed)));
};

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
    try {
        const integration = await resolveRequestIntegration(request, 'netdata');
        const reqUrl = new URL(request.url);
        const scopes = parseScopes(reqUrl.searchParams.get('scope'));
        const interval = parseBoundedInteger(
            reqUrl.searchParams.get('interval'),
            MIN_INTERVAL_MS,
            MIN_INTERVAL_MS,
            MAX_INTERVAL_MS,
        );
        const processLimit = parseBoundedInteger(
            reqUrl.searchParams.get('processLimit'),
            10,
            1,
            50,
        );
        const streamCount = activeStreams.get(integration.id) || 0;
        if (streamCount >= MAX_STREAMS_PER_INTEGRATION) {
            throw new ApiSecurityError('Too many Netdata streams', 429, 'stream_limit_exceeded');
        }

        const cleanUrl = (await resolveIntegrationBaseUrl(integration)).toString().replace(/\/$/, '');
        const encoder = new TextEncoder();
        let intervalId: NodeJS.Timeout | null = null;
        let durationId: NodeJS.Timeout | null = null;
        let closed = false;
        let fetching = false;
        activeStreams.set(integration.id, streamCount + 1);

        const release = () => {
            if (closed) return;
            closed = true;
            if (intervalId) clearInterval(intervalId);
            if (durationId) clearTimeout(durationId);
            const remaining = (activeStreams.get(integration.id) || 1) - 1;
            if (remaining > 0) activeStreams.set(integration.id, remaining);
            else activeStreams.delete(integration.id);
        };

        const stream = new ReadableStream({
            async start(controller) {
                const send = async () => {
                    if (closed || fetching) return;
                    fetching = true;
                    try {
                        const data = await fetchNetdataData(cleanUrl, scopes, processLimit);
                        if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                    } catch {
                        if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Failed to fetch' })}\n\n`));
                    } finally {
                        fetching = false;
                    }
                };

                request.signal.addEventListener('abort', () => {
                    release();
                    try { controller.close(); } catch { /* already closed */ }
                }, { once: true });
                await send();
                if (closed) return;
                intervalId = setInterval(send, interval);
                durationId = setTimeout(() => {
                    release();
                    try { controller.close(); } catch { /* already closed */ }
                }, MAX_STREAM_DURATION_MS);
            },
            cancel: release,
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-store',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            },
        });
    } catch (error) {
        return apiSecurityErrorResponse(error, 'Failed to open Netdata stream');
    }
}

// ========================================
// POST Endpoint (legacy, for compatibility)
// ========================================
export async function POST(request: Request) {
    try {
        const integration = await resolveRequestIntegration(request, 'netdata');
        const { processLimit = 10, scope } = await request.json() as {
            processLimit?: unknown;
            scope?: unknown;
        };
        const cleanUrl = (await resolveIntegrationBaseUrl(integration)).toString().replace(/\/$/, '');
        const requestedScopes = Array.isArray(scope)
            ? parseScopes(scope.join(','))
            : ['all'];
        const boundedProcessLimit = parseBoundedInteger(processLimit, 10, 1, 50);
        const data = await fetchNetdataData(cleanUrl, requestedScopes, boundedProcessLimit);
        
        return NextResponse.json(data);
    } catch (error) {
        return apiSecurityErrorResponse(error, 'Failed to connect to Netdata');
    }
}
