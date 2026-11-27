import { useLayoutEffect, useRef, type RefObject, type UIEvent } from "react";

interface UseScrollNavigationProps {
  currentPageIndex: number;
  pagesLength: number;
  setPageIndex: (index: number) => void;
  isModalOpen: boolean;
  effectiveScrollDirection: "vertical" | "horizontal";
  viewportRef: RefObject<HTMLElement | null>;
  wrapperRef: RefObject<HTMLElement | null>;
}

const LAYOUT_RETRY_MS = 32;
const MAX_LAYOUT_RETRIES = 8;
const POSITION_TOLERANCE_PX = 1;

function getPageSize(viewport: HTMLElement, wrapper: HTMLElement | null, vertical: boolean) {
  const page = wrapper?.firstElementChild?.getBoundingClientRect();
  const pageSize = page && (vertical ? page.height : page.width);
  if (pageSize) return pageSize;

  const bounds = viewport.getBoundingClientRect();
  return vertical ? bounds.height : bounds.width;
}

export const useScrollNavigation = ({
  currentPageIndex,
  pagesLength,
  setPageIndex,
  isModalOpen,
  effectiveScrollDirection,
  viewportRef,
  wrapperRef,
}: UseScrollNavigationProps) => {
  const pageFromScroll = useRef<{ index: number; layout: string } | null>(null);
  const layoutRetry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const vertical = effectiveScrollDirection === "vertical";
  const layout = `${effectiveScrollDirection}:${pagesLength}`;

  useLayoutEffect(() => {
    const reportedPage = pageFromScroll.current;
    pageFromScroll.current = null;

    // A page change reported by the viewport should leave the user's gesture in progress.
    if (!pagesLength || (reportedPage?.layout === layout && reportedPage.index === currentPageIndex)) {
      return;
    }

    const index = Math.max(0, Math.min(currentPageIndex, pagesLength - 1));

    const alignViewport = (attempt: number) => {
      layoutRetry.current = undefined;
      const viewport = viewportRef.current;
      const wrapper = wrapperRef.current;
      if (viewport) {
        const pageSize = getPageSize(viewport, wrapper, vertical);
        if (pageSize > 0) {
          const page = wrapper?.children.item(index) as HTMLElement | null;
          const offset = vertical ? page?.offsetTop : page?.offsetLeft;
          const position = offset || index * pageSize;
          viewport.scrollTo({
            top: vertical ? position : 0,
            left: vertical ? 0 : position,
            behavior: "instant",
          });

          const actual = vertical ? viewport.scrollTop : viewport.scrollLeft;
          if (Math.abs(actual - position) <= POSITION_TOLERANCE_PX) return;
        }
      }

      // The restored page can precede usable viewport geometry on mobile.
      if (attempt < MAX_LAYOUT_RETRIES) {
        layoutRetry.current = setTimeout(() => alignViewport(attempt + 1), LAYOUT_RETRY_MS);
      }
    };

    alignViewport(0);
    return () => {
      clearTimeout(layoutRetry.current);
      layoutRetry.current = undefined;
    };
  }, [currentPageIndex, layout, pagesLength, vertical, viewportRef, wrapperRef]);

  return (event: UIEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || isModalOpen || !pagesLength || layoutRetry.current !== undefined) {
      return;
    }

    const viewport = event.currentTarget;
    const pageSize = getPageSize(viewport, wrapperRef.current, vertical);
    if (pageSize <= 0) return;

    const position = vertical ? viewport.scrollTop : viewport.scrollLeft;
    const index = Math.max(0, Math.min(Math.round(position / pageSize), pagesLength - 1));
    if (index !== (pageFromScroll.current?.index ?? currentPageIndex)) {
      pageFromScroll.current = { index, layout };
      setPageIndex(index);
    }
  };
};
