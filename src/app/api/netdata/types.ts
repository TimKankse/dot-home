export interface NetdataChartResponse {
  labels: string[];
  data: number[][];
}

export interface CpuData {
  total: number;
}

export interface MemoryData {
  percent: number;
  used: number;
  total: number;
}

export interface DiskData {
  mnt_point: string;
  percent: number;
  used: number;
  size: number;
}

export interface ProcessData {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_percent: number;
  username: string;
}

export interface CpuCoreData {
  id: number;
  load: number;
  temp?: number;
}

export interface GpuData {
  id: string;
  name: string;
  utilization: number;
  memory?: number;
  temperature?: number;
}

export interface NetworkInterfaceData {
  interface_name: string;
  rx: number;
  tx: number;
}

export interface SensorData {
  label: string;
  value: number;
  unit: string;
}

export interface SystemInfoData {
  hostname: string;
  uptime: number;
  os: string;
  kernel: string;
  ip: string;
  virtualization: string;
}

export interface NetdataApiResponse {
  cpu?: CpuData;
  cores?: CpuCoreData[];
  coresDataType?: string;
  gpus?: GpuData[];
  mem?: MemoryData;
  fs?: DiskData[];
  sensors?: SensorData[];
  processList?: ProcessData[];
  network?: NetworkInterfaceData[];
  cpuModel?: string | null;
  systemInfo?: SystemInfoData;
  error?: string;
}
