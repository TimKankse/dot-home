export interface IntegrationConfig extends Record<string, unknown> {
  url?: string;
  externalUrl?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  iconUrl?: string;
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  config: IntegrationConfig;
}
