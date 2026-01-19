import { NetdataChartResponse, DiskData } from '../types';

export const processStorage = (
    mountPointsList: DiskData[], 
    diskCharts: string[], 
    diskData: (NetdataChartResponse | null)[]
): DiskData[] => {
    let fs: DiskData[] = [];

    if (mountPointsList.length > 0) {
        // Strategy A: Use Netdata 'mount-points' function data
        fs = mountPointsList.filter((m: DiskData) => {
            if (m.mnt_point.startsWith('/host/')) {
                m.mnt_point = m.mnt_point.replace('/host/', '/');
            } else if (m.mnt_point === '/host') {
                m.mnt_point = '/';
            }
            return m.size > 0;
        });
    } else {
        // Strategy B: Fallback to 'disk_space.*' charts
        fs = diskCharts.map((chartName, i) => {
            const d = diskData[i];
            if (!d || !d.data || d.data.length === 0) return null;
    
            const dims = d.labels;
            const vals = d.data[0];
            const availIndex = dims.indexOf('avail');
            const usedIndex = dims.indexOf('used');
            
            const avail = vals[availIndex] || 0;
            const used = vals[usedIndex] || 0;
            const total = avail + used;
            
            let mntPoint = chartName.replace('disk_space.', '').replace(/_/g, '/');
            if (mntPoint.startsWith('/host/')) {
                mntPoint = mntPoint.replace('/host/', '/');
            } else if (mntPoint === '/host') {
                mntPoint = '/';
            }
    
            return {
                mnt_point: mntPoint.startsWith('/') ? mntPoint : '/' + mntPoint,
                percent: total > 0 ? (used / total) * 100 : 0,
                used: used * 1024 * 1024 * 1024, 
                size: total * 1024 * 1024 * 1024
            };
        }).filter((item): item is DiskData => item !== null);
    }
    return fs;
};
