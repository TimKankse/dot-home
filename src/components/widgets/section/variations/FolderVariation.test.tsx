import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Widget } from '@/types/widget';
import { useWidgetStore } from '@/store/useWidgetStore';

vi.mock('@/gridstack-react/grid-stack-context', () => ({ useGridStackContext: () => ({ gridStack: null }) }));
vi.mock('@/hooks/useGridStackShortcutDrag', () => ({ useGridStackShortcutDrag: () => ({}) }));
vi.mock('@/hooks/useShortcutIcon', () => ({ useShortcutIcon: () => ({ fallbackLetter: 'S' }) }));
vi.mock('@/components/primitives/modal', () => ({
  Modal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => isOpen ? <div>{children}</div> : null,
  ModalContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModalBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModalHeader: () => null,
}));
vi.mock('../ShortcutCollection', () => ({
  ShortcutCollection: ({ visibleShortcuts }: { visibleShortcuts: Widget[] }) => <ul>
    {visibleShortcuts.map((shortcut) => <li key={shortcut.id}>{shortcut.name}</li>)}
  </ul>,
}));
import { FolderVariation } from './FolderVariation';

const shortcuts: Widget[] = Array.from({ length: 49 }, (_, i) => ({
  id: `s${i + 1}`, name: `Shortcut ${i + 1}`, type: 'shortcut', pageId: 'p', grid: { x: 0, y: 0, w: 1, h: 1 },
}));

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  useWidgetStore.setState({ widgets: [], responsiveLayouts: {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('folder pagination', () => {
  it('keeps a 49th shortcut reachable after moving it into a folder', () => {
    const folder: Widget = {
      id: 'folder', type: 'section', pageId: 'p', grid: { x: 0, y: 0, w: 2, h: 2 },
      config: { variant: 'folder', shortcutIds: shortcuts.slice(0, 48).map(s => s.id) },
    };
    useWidgetStore.getState().setWidgets([folder, ...shortcuts]);
    useWidgetStore.getState().moveShortcut('s49', { container: { type: 'section', sectionId: 'folder' }, index: 48 });
    const state = useWidgetStore.getState();
    const ids = state.widgets.find(w => w.id === 'folder')!.config!.shortcutIds as string[];
    const contents = ids.map(id => state.widgets.find(w => w.id === id)!);
    expect(state.getRenderableWidgetsByPage('p').some(w => w.id === 's49')).toBe(false);
    render(<FolderVariation title="Folder" sectionId="folder" shortcuts={contents} />);
    fireEvent.click(screen.getByRole('button', { name: /Folder/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Page 5' }));
    expect(screen.getByText('Shortcut 49')).toBeInTheDocument();
  });

  it('selects the preceding page when the last page disappears', () => {
    const { rerender } = render(<FolderVariation title="Folder" shortcuts={shortcuts} />);
    fireEvent.click(screen.getByRole('button', { name: /Folder/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Page 5' }));
    rerender(<FolderVariation title="Folder" shortcuts={shortcuts.slice(0, 48)} />);
    expect(screen.getByText('Shortcut 48')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    rerender(<FolderVariation title="Folder" shortcuts={[]} />);
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });
});
