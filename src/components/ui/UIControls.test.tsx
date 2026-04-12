import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UIControls } from './UIControls';

describe('UIControls', () => {
  it('keeps the add-page plus badge inside the add-page button when save status is visible', () => {
    render(
      <UIControls
        isEditing
        canEdit
        showLayoutControlsToggle
        isLayoutControlsOpen={false}
        onToggleEdit={vi.fn()}
        onToggleLayoutControls={vi.fn()}
        onAdd={vi.fn()}
        onSave={vi.fn()}
        onAddPage={vi.fn()}
        saveStatus="saving"
        onOpenSettings={vi.fn()}
      />
    );

    const addPageButton = screen.getByRole('button', { name: 'Add Page' });
    const saveStatusIndicator = screen.getByLabelText('Saving...');
    const addPageSvgIcons = addPageButton.querySelectorAll('svg');
    const statusSvgIcons = saveStatusIndicator.querySelectorAll('svg');

    expect(addPageSvgIcons).toHaveLength(2);
    expect(statusSvgIcons).toHaveLength(1);
  });
});
