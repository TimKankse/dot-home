import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../ui/IconSelector', () => ({
  IconSelector: () => null,
}));
vi.mock('../../widgets/SyncConfigToggle', () => ({
  SyncConfigToggle: () => null,
}));
vi.mock('@/store/useIntegrationStore', () => ({
  useIntegrationStore: () => ({ integrations: [] }),
}));
vi.mock('@/components/widgets/portainer/PortainerConfig', () => ({
  PortainerConfig: ({ onChange }: { onChange: (key: string, value?: string) => void }) => (
    <button type="button" onClick={() => onChange('integrationId', undefined)}>
      Disconnect Portainer
    </button>
  ),
}));

import { WidgetForm } from './WidgetForm';

describe('WidgetForm legacy configuration preservation', () => {
  it('keeps unknown stored fields when editing through the structured form', () => {
    const onSubmit = vi.fn();
    render(
      <WidgetForm
        initialData={{
          name: 'Stocks',
          type: 'widget',
          widgetType: 'stock',
          w: 2,
          h: 2,
          config: {
            symbol: 'ACME',
            legacyDisplayOption: { compact: true },
          },
        }}
        selectedType="stock"
        activeTab="configuration"
        formId="widget-form"
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Widget Name'), {
      target: { value: 'Market' },
    });
    fireEvent.submit(document.getElementById('widget-form')!);

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Market',
      config: {
        symbol: 'ACME',
        legacyDisplayOption: { compact: true },
      },
    }));
  });

  it('submits an explicit empty integration ID after disconnecting', () => {
    const onSubmit = vi.fn();
    render(
      <WidgetForm
        initialData={{
          name: 'Containers',
          type: 'widget',
          widgetType: 'portainer',
          integrationId: 'portainer-1',
          w: 2,
          h: 2,
          config: { endpointId: '1' },
        }}
        selectedType="portainer"
        activeTab="configuration"
        formId="portainer-widget-form"
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Portainer' }));
    fireEvent.submit(document.getElementById('portainer-widget-form')!);

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      integrationId: '',
      config: { endpointId: '1' },
    }));
  });
});
