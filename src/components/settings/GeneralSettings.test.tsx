import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { GeneralSettings } from './GeneralSettings';
import { useSettingsStore } from '@/store/useSettingsStore';

afterEach(() => useSettingsStore.getState().resetSettings());

it('lets users adjust the page buffer and turn it off without losing their chosen size', () => {
  useSettingsStore.getState().updateBehavior({ autoDetectLocation: false });
  const view = render(<GeneralSettings />);
  const toggle = screen.getByRole('checkbox', { name: 'Page Buffer' });
  const size = screen.getByRole('spinbutton', { name: 'Pages on Each Side' });
  expect(toggle).toBeChecked();
  expect(size).toHaveValue(1);
  fireEvent.change(size, { target: { value: '2' } });
  expect(useSettingsStore.getState().settings.behavior.pageBufferSize).toBe(2);
  fireEvent.click(toggle);
  expect(size).toBeDisabled();
  expect(useSettingsStore.getState().settings.behavior.pageBufferEnabled).toBe(false);
  fireEvent.click(toggle);
  expect(size).toBeEnabled();
  expect(size).toHaveValue(2);
  view.unmount();
});
