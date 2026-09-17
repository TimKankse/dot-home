export const DEFAULT_PAGE_BUFFER_SIZE = 1;

export function normalizePageBufferSize(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value)))
    : DEFAULT_PAGE_BUFFER_SIZE;
}

export function isPageWithinBuffer(
  pageIndex: number,
  currentPageIndex: number,
  enabled: boolean,
  size: number,
): boolean {
  return !enabled || Math.abs(pageIndex - currentPageIndex) <= normalizePageBufferSize(size);
}
