import React from 'react';
import styles from '../NetdataWidget.module.css';
import { AlertCircle } from 'lucide-react';
import { Sparkline } from '../components/Sparkline';
import { formatBytes } from '../utils';
import { NetdataApiResponse, NetworkInterfaceData } from '@/app/api/netdata/types';
import type { NetdataWidgetConfig } from '@/types';

interface NetworkHistory {
    netRx: number[];
    netTx: number[];
}

interface NetworkVariationProps {
    data: NetdataApiResponse;
    history: NetworkHistory;
    config?: NetdataWidgetConfig;
    title?: string;
}

export const NetworkVariation: React.FC<NetworkVariationProps> = ({ data, history, config, title }) => {
    // Find target interface
    const targetInterface = config?.interfaceName 
        ? data.network?.find((n: NetworkInterfaceData) => n.interface_name === config.interfaceName)
        : data.network?.find((n: NetworkInterfaceData) => n.interface_name !== 'lo');

    if (!targetInterface) {
        return (
            <div className={styles.widgetContainer}>
                <div className={styles.offlineState}>
                    <AlertCircle size={24} color="var(--accent-red)" />
                    <p style={{ fontSize: '0.8rem' }}>Interface not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.widgetContainer}>
            <div className={styles.header}>
                <span className={styles.widgetTitle}>{title || `NETWORK (${targetInterface.interface_name})`}</span>
            </div>
            <div className={styles.networkSingle}>
                <div className={styles.networkGraphContainer}>
                    {/* Render two graphs or one? Let's do two small ones for now */}
                    <div className={styles.netGraphRow}>
                        <span className={styles.netGraphLabel}>↓</span>
                        <div className={styles.netGraph}>
                             <Sparkline dataPoints={history.netRx} color="var(--accent-blue)" />
                        </div>
                    </div>
                    <div className={styles.netGraphRow}>
                        <span className={styles.netGraphLabel}>↑</span>
                        <div className={styles.netGraph}>
                             <Sparkline dataPoints={history.netTx} color="var(--accent-green)" />
                        </div>
                    </div>
                </div>
                <div className={styles.networkStats}>
                    <div className={styles.networkStat}>
                        <span className={styles.statLabel} style={{ color: 'var(--accent-blue)' }}>↓</span>
                        <span className={styles.statValue}>{formatBytes(targetInterface.rx)}/s</span>
                    </div>
                    <div className={styles.networkStat}>
                        <span className={styles.statLabel} style={{ color: 'var(--accent-green)' }}>↑</span>
                        <span className={styles.statValue}>{formatBytes(targetInterface.tx)}/s</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
