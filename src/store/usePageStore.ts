import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { useWidgetStore } from './useWidgetStore';

export type Page = {
  id: string;
};

interface PageState {
  pages: Page[];
  currentPageIndex: number;
  scrollDirection: 'vertical' | 'horizontal';
  defaultPageId?: string;
  
  setPageIndex: (index: number) => void;
  addPage: () => void;
  removePage: () => void;
  movePage: (direction: 'prev' | 'next') => void;
  setScrollDirection: (direction: 'vertical' | 'horizontal') => void;
  setDefaultPage: (id: string) => void;
  getCurrentPage: () => Page | undefined;
  setPages: (pages: Page[]) => void;
}

export const usePageStore = create<PageState>((set, get) => ({
  pages: [],
  currentPageIndex: 0,
  scrollDirection: 'vertical',
  defaultPageId: undefined,

  setPageIndex: (index) => set({ currentPageIndex: index }),

  addPage: () => set((state) => {
    const newPage = { id: uuidv4() };
    return { 
      pages: [...state.pages, newPage],
      currentPageIndex: state.pages.length // Switch to the new page
    };
  }),

  removePage: () => set((state) => {
    const { pages, currentPageIndex } = state;
    if (pages.length <= 1) return state; // Don't delete the last page

    const pageToRemoveId = pages[currentPageIndex].id;
    
    // Remove widgets on this page via useWidgetStore
    useWidgetStore.getState().removeWidgetsByPage(pageToRemoveId);
    useWidgetStore.getState().removeResponsiveLayoutsByPage(pageToRemoveId);
    
    // Remove the page
    const newPages = pages.filter((_, index) => index !== currentPageIndex);
    
    // Adjust current index if necessary
    let newIndex = currentPageIndex;
    if (newIndex >= newPages.length) {
      newIndex = newPages.length - 1;
    }

    return {
      pages: newPages,
      currentPageIndex: newIndex
    };
  }),

  setScrollDirection: (direction) => set({ scrollDirection: direction }),

  setDefaultPage: (id) => set({ defaultPageId: id }),

  movePage: (direction) => set((state) => {
    const { pages, currentPageIndex } = state;
    if (pages.length <= 1) return state;

    const newPages = [...pages];
    const currentPage = newPages[currentPageIndex];
    
    // Remove current page
    newPages.splice(currentPageIndex, 1);
    
    // Calculate new index
    let newIndex = direction === 'prev' ? currentPageIndex - 1 : currentPageIndex + 1;
    
    // Clamp index
    if (newIndex < 0) newIndex = 0;
    if (newIndex > newPages.length) newIndex = newPages.length;
    
    // Insert at new position
    newPages.splice(newIndex, 0, currentPage);
    
    return {
      pages: newPages,
      currentPageIndex: newIndex
    };
  }),

  getCurrentPage: () => {
    const { pages, currentPageIndex } = get();
    return pages[currentPageIndex];
  },

  setPages: (pages) => set({ pages })
}));
