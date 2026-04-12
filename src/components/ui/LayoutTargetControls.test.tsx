import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LayoutTargetControls } from './LayoutTargetControls';

const breakpointThresholds = {
  mobileMaxWidth: 767,
  tabletMaxWidth: 975,
};

describe('LayoutTargetControls', () => {
  it('shows the full target picker when desktop preview editing is allowed', () => {
    const onTargetChange = vi.fn();

    render(
      <LayoutTargetControls
        isOpen
        target="desktop"
        isCustom={false}
        sourceBreakpoint="desktop"
        canSelectTarget
        breakpointThresholds={breakpointThresholds}
        onClose={() => {}}
        onTargetChange={onTargetChange}
        onBreakpointWidthChange={() => {}}
        onMakeCustom={() => {}}
        onResetToAuto={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tablet' }));

    expect(screen.getByRole('button', { name: 'Desktop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tablet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mobile' })).toBeInTheDocument();
    expect(onTargetChange).toHaveBeenCalledWith('tablet');
  });

  it('locks mobile editing to the current device layout and keeps the customization action', () => {
    const onMakeCustom = vi.fn();
    const onBreakpointWidthChange = vi.fn();

    render(
      <LayoutTargetControls
        isOpen
        target="mobile"
        isCustom={false}
        sourceBreakpoint="tablet"
        canSelectTarget={false}
        breakpointThresholds={breakpointThresholds}
        onClose={() => {}}
        onTargetChange={() => {}}
        onBreakpointWidthChange={onBreakpointWidthChange}
        onMakeCustom={onMakeCustom}
        onResetToAuto={() => {}}
      />
    );

    expect(screen.queryByRole('button', { name: 'Desktop' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tablet' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mobile' })).not.toBeInTheDocument();
    expect(screen.getByText('Mobile layout')).toBeInTheDocument();
    expect(screen.getByText(/currently inheriting from Tablet/i)).toBeInTheDocument();
    expect(screen.getByText('767px')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Mobile breakpoint max width'), {
      target: { value: '640' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Make Custom' }));

    expect(onBreakpointWidthChange).toHaveBeenCalledWith('mobile', 640);
    expect(onMakeCustom).toHaveBeenCalledTimes(1);
  });

  it('offers reset to auto for a locked custom responsive layout', () => {
    const onResetToAuto = vi.fn();

    render(
      <LayoutTargetControls
        isOpen
        target="tablet"
        isCustom
        sourceBreakpoint="tablet"
        canSelectTarget={false}
        breakpointThresholds={breakpointThresholds}
        onClose={() => {}}
        onTargetChange={() => {}}
        onBreakpointWidthChange={() => {}}
        onMakeCustom={() => {}}
        onResetToAuto={onResetToAuto}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset To Auto' }));

    expect(onResetToAuto).toHaveBeenCalledTimes(1);
  });
});
