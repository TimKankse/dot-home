import { useEffect, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WidgetActivity } from './WidgetActivity';
import { isPageWithinBuffer } from '@/utils/pageBuffer';

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
it('pauses polling on inactive pages and hidden tabs while preserving local widget state', () => {
  vi.useFakeTimers();
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const poll = vi.fn();
  function Widget() {
    const [value, setValue] = useState(0);
    useEffect(() => { const timer = setInterval(poll, 1000); return () => clearInterval(timer); }, []);
    return <button onClick={() => setValue(value + 1)}>Value {value}</button>;
  }
  const page = (active: boolean) => <WidgetActivity active={active}><Widget /></WidgetActivity>;
  const view = render(page(true));
  fireEvent.click(screen.getByRole('button'));
  act(() => vi.advanceTimersByTime(1000));
  expect(poll).toHaveBeenCalledOnce();
  view.rerender(page(false));
  act(() => vi.advanceTimersByTime(5000));
  expect(poll).toHaveBeenCalledOnce();
  view.rerender(page(true));
  expect(screen.getByRole('button').textContent).toBe('Value 1');
  hidden.mockReturnValue(true);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  act(() => vi.advanceTimersByTime(5000));
  expect(poll).toHaveBeenCalledOnce();
  hidden.mockReturnValue(false);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  act(() => vi.advanceTimersByTime(1000));
  expect(poll).toHaveBeenCalledTimes(2);
  view.unmount();
});

it('moves the active window, clips at page boundaries, and pauses hidden tabs even when buffering is off', () => {
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const activePages = new Set<number>();
  function Widget({ page }: { page: number }) {
    useEffect(() => {
      activePages.add(page);
      return () => { activePages.delete(page); };
    }, [page]);
    return <div>Page {page}</div>;
  }
  const pages = (current: number, size = 1, enabled = true) => Array.from({ length: 5 }, (_, index) => (
    <WidgetActivity key={index} active={isPageWithinBuffer(index, current, enabled, size)}>
      <Widget page={index} />
    </WidgetActivity>
  ));
  const active = () => [...activePages].sort();
  const view = render(pages(0));
  expect(active()).toEqual([0, 1]);
  view.rerender(pages(2));
  expect(active()).toEqual([1, 2, 3]);
  view.rerender(pages(2, 2));
  expect(active()).toEqual([0, 1, 2, 3, 4]);
  view.rerender(pages(2, 0));
  expect(active()).toEqual([2]);
  view.rerender(pages(2, 0, false));
  expect(active()).toEqual([0, 1, 2, 3, 4]);
  hidden.mockReturnValue(true);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(active()).toEqual([]);
  hidden.mockReturnValue(false);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(active()).toEqual([0, 1, 2, 3, 4]);
  view.rerender(pages(4));
  expect(active()).toEqual([3, 4]);
  view.unmount();
});
