import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useIntegrationStore } from '@/store/useIntegrationStore';
import type { Integration } from '@/types/integration';
import { IntegrationsSettings } from './IntegrationsSettings';

afterEach(() => {
  useIntegrationStore.getState().setIntegrations([]);
  vi.unstubAllGlobals();
});

it('shows credential status after loading dashboard settings and submits only replacements', async () => {
  const integration: Integration = {
    id: 'test-jellyfin',
    name: 'Jellyfin',
    type: 'jellyfin',
    config: { url: 'http://jellyfin.test' },
    credentialStatus: { apiKey: 'unreadable' },
  };
  useIntegrationStore.getState().setIntegrations([integration]);
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({
    ...integration,
    config: { ...integration.config, apiKey: '********' },
    credentialStatus: { apiKey: 'saved' },
  }));
  vi.stubGlobal('fetch', fetch);

  render(<IntegrationsSettings />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Jellyfin' }));
  expect(screen.getByText('Saved credential can’t be decrypted. Enter a replacement.')).toBeVisible();
  const apiKeyInput = screen.getByPlaceholderText<HTMLInputElement>('API Key / Token');
  // Some autofill integrations change the field without delivering a React change event.
  apiKeyInput.value = 'fixture-replacement';
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));

  fireEvent.click(await screen.findByRole('button', { name: 'Edit Jellyfin' }));
  expect(screen.getByPlaceholderText('Saved. Enter a replacement to change it.')).toHaveValue('');
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  await screen.findByRole('button', { name: 'Edit Jellyfin' });

  const configs = fetch.mock.calls.map(([, request]) => JSON.parse(String(request.body)).config);
  expect(configs).toEqual([
    { url: 'http://jellyfin.test', apiKey: 'fixture-replacement' },
    { url: 'http://jellyfin.test' },
  ]);
});
