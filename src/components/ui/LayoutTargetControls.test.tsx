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
    expect(screen.getByRole('button', { name: /mobile max width/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Mobile breakpoint max width'), {
      target: { value: '640' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Make Custom' }));

    expect(onBreakpointWidthChange).toHaveBeenCalledWith('mobile', 640);
    expect(onMakeCustom).toHaveBeenCalledTimes(1);
  });

  it('keeps the collapsible headers minimal without summary text or duplicate slider titles', () => {
    render(
      <LayoutTargetControls
        isOpen
        target="tablet"
        isCustom
        sourceBreakpoint="tablet"
        diagnostics={{
          fitWithinPage: false,
          segmentCount: 3,
          adjustedWidgetIds: ['a', 'b'],
          unplaceableWidgetIds: ['c'],
        }}
        canSelectTarget={false}
        breakpointThresholds={breakpointThresholds}
        onClose={() => {}}
        onTargetChange={() => {}}
        onBreakpointWidthChange={() => {}}
        onMakeCustom={() => {}}
        onResetToAuto={() => {}}
      />
    );

    const diagnosticsToggle = screen.getByRole('button', { name: /diagnostics/i });
    const sliderToggle = screen.getByRole('button', { name: /tablet max width/i });

    expect(diagnosticsToggle).toBeInTheDocument();
    expect(sliderToggle).toBeInTheDocument();
    expect(diagnosticsToggle).not.toHaveTextContent('3 pages');
    expect(sliderToggle).not.toHaveTextContent('975px');
    expect(screen.getAllByText('Tablet max width')).toHaveLength(1);
  });

  it('renders the slider section above diagnostics and keeps diagnostics collapsed by default', () => {
    render(
      <LayoutTargetControls
        isOpen
        target="tablet"
        isCustom
        sourceBreakpoint="tablet"
        diagnostics={{
          fitWithinPage: false,
          segmentCount: 3,
          adjustedWidgetIds: ['a', 'b'],
          unplaceableWidgetIds: ['c'],
        }}
        canSelectTarget={false}
        breakpointThresholds={breakpointThresholds}
        onClose={() => {}}
        onTargetChange={() => {}}
        onBreakpointWidthChange={() => {}}
        onMakeCustom={() => {}}
        onResetToAuto={() => {}}
      />
    );

    const sliderToggle = screen.getByRole('button', { name: /tablet max width/i });
    const diagnosticsToggle = screen.getByRole('button', { name: /diagnostics/i });

    expect(sliderToggle).toHaveAttribute('aria-expanded', 'true');
    expect(diagnosticsToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Tablet breakpoint max width')).toBeVisible();
    expect(screen.getByText('Adjusted')).not.toBeVisible();
    expect(sliderToggle.compareDocumentPosition(diagnosticsToggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('lets the breakpoint slider section collapse and expand', () => {
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
        onBreakpointWidthChange={() => {}}
        onMakeCustom={() => {}}
        onResetToAuto={() => {}}
      />
    );

    const sliderToggle = screen.getByRole('button', { name: /mobile max width/i });
    const slider = screen.getByLabelText('Mobile breakpoint max width');

    expect(sliderToggle).toHaveAttribute('aria-expanded', 'true');
    expect(slider).toBeVisible();

    fireEvent.click(sliderToggle);

    expect(sliderToggle).toHaveAttribute('aria-expanded', 'false');
    expect(slider).not.toBeVisible();

    fireEvent.click(sliderToggle);

    expect(sliderToggle).toHaveAttribute('aria-expanded', 'true');
    expect(slider).toBeVisible();
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

  it('shows responsive layout diagnostics for the active target', () => {
    render(
      <LayoutTargetControls
        isOpen
        target="tablet"
        isCustom
        sourceBreakpoint="tablet"
        diagnostics={{
          fitWithinPage: false,
          segmentCount: 3,
          adjustedWidgetIds: ['a', 'b'],
          unplaceableWidgetIds: ['c'],
        }}
        canSelectTarget={false}
        breakpointThresholds={breakpointThresholds}
        onClose={() => {}}
        onTargetChange={() => {}}
        onBreakpointWidthChange={() => {}}
        onMakeCustom={() => {}}
        onResetToAuto={() => {}}
      />
    );

    const diagnosticsToggle = screen.getByRole('button', { name: /diagnostics/i });

    expect(diagnosticsToggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(diagnosticsToggle);

    expect(diagnosticsToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Adjusted')).toBeVisible();
    expect(screen.getByText('Unplaceable')).toBeVisible();
    const diagnosticsHint = screen.getByText(/needs responsive overflow pages/i);
    expect(diagnosticsHint).toBeVisible();

    fireEvent.click(diagnosticsToggle);

    expect(diagnosticsToggle).toHaveAttribute('aria-expanded', 'false');
    expect(diagnosticsHint).not.toBeVisible();
  });
});
