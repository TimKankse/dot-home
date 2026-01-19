export interface NetdataCpu {
  total: number;
  user?: number;
  system?: number;
}

export interface NetdataCore {
  id: number;
  load: number;
  temp?: number;
}

export interface NetdataGpu {
  id: string;
  name: string;
  utilization: number;
  memory?: number;
  temperature?: number;
}

export interface NetdataSystemInfo {
  hostname: string;
  uptime: number;
  os: string;
  kernel: string;
  ip: string;
  virtualization: string;
}

export interface NetdataMem {
  percent: number;
  used: number;
  total: number;
  // free/cached/buffered etc could be added here
}

export interface NetdataFs {
  mnt_point: string;
  percent: number;
  used: number;
  size: number;
}

export interface NetdataSensor {
  label: string;
  value: number;
  unit: string;
}

export interface NetdataProcess {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_percent: number;
  username: string;
}

export interface NetdataNetwork {
  interface_name: string;
  rx: number;
  tx: number;
}

export interface NetdataData {
  cpu?: NetdataCpu;
  cpuModel?: string;
  cores?: NetdataCore[];
  gpus?: NetdataGpu[];
  coresDataType?: 'utilization' | 'frequency';
  systemInfo?: NetdataSystemInfo;
  mem?: NetdataMem;
  fs?: NetdataFs[];
  sensors?: NetdataSensor[];
  processList?: NetdataProcess[];
  network?: NetdataNetwork[];
  chartsError?: string;
}

export interface NetdataScopeState {
  [key: string]: number; // scope -> reference count
}
