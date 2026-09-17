import { fetchNetdataJson, type NetdataConnection } from './cached-request';

export const fetchInfo = (connection: NetdataConnection): Promise<Record<string, unknown> | null> =>
    fetchNetdataJson<Record<string, unknown>>(connection, '/api/v1/info', 60_000).catch(() => null);
