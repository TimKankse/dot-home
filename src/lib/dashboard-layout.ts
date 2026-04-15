import { v4 as uuidv4 } from 'uuid';
import {
  createDefaultSettings,
  mergeGeneralSettings,
  type PartialGeneralSettings,
} from '@/constants/default-settings';
import type { CityData, GeneralSettings } from '@/types/settings';
import type { ResponsiveLayouts, Widget, WidgetConfig } from '@/types/widget';
import { normalizeResponsiveLayouts } from '@/utils/gridUtils';

export interface DashboardPageData {
  id: string;
}

export interface DashboardLayoutData {
  widgets: Widget[];
  responsiveLayouts: ResponsiveLayouts;
  pages: DashboardPageData[];
  scrollDirection: 'vertical' | 'horizontal';
  defaultPageId: string;
  settings: GeneralSettings;
}

const STARTER_CITY: CityData = {
  name: 'Stockholm',
  country: '',
  timezone: 'Europe/Stockholm',
  latitude: 0,
  longitude: 0,
  abbreviation: 'STO',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toFiniteNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const parsePages = (value: unknown): DashboardPageData[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((page) => (isRecord(page) && typeof page.id === 'string' ? { id: page.id } : null))
    .filter((page): page is DashboardPageData => page !== null);
};

const parseWidgetConfig = (value: unknown): WidgetConfig | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return { ...value };
};

const parseWidget = (
  value: unknown,
  pages: DashboardPageData[],
  fallbackPageId: string,
): Widget | null => {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  const grid = isRecord(value.grid) ? value.grid : {};
  const gridPosition = {
    x: toFiniteNumber(grid.x, 0),
    y: toFiniteNumber(grid.y, 0),
    w: Math.max(1, toFiniteNumber(grid.w, 1)),
    h: Math.max(1, toFiniteNumber(grid.h, 1)),
  };

  const pageIdFromLegacyIndex =
    typeof value.page === 'number' && pages[value.page]
      ? pages[value.page].id
      : undefined;
  const pageId =
    typeof value.pageId === 'string'
      ? value.pageId
      : pageIdFromLegacyIndex ?? fallbackPageId;

  return {
    id: value.id,
    type: typeof value.type === 'string' ? value.type : 'shortcut',
    grid: gridPosition,
    pageId,
    name: typeof value.name === 'string' ? value.name : undefined,
    url: typeof value.url === 'string' ? value.url : undefined,
    iconUrl: typeof value.iconUrl === 'string' ? value.iconUrl : undefined,
    isSelfHosted:
      typeof value.isSelfHosted === 'boolean' ? value.isSelfHosted : undefined,
    internalUrl:
      typeof value.internalUrl === 'string' ? value.internalUrl : undefined,
    widgetType:
      typeof value.widgetType === 'string' ? value.widgetType : undefined,
    config: parseWidgetConfig(value.config),
    integrationId:
      typeof value.integrationId === 'string' ? value.integrationId : undefined,
    syncConfig:
      typeof value.syncConfig === 'boolean' ? value.syncConfig : undefined,
  };
};

const parseResponsiveLayouts = (value: unknown): ResponsiveLayouts => {
  if (!value) {
    return {};
  }

  try {
    return normalizeResponsiveLayouts(value as ResponsiveLayouts);
  } catch {
    return {};
  }
};

const parseSettings = (value: unknown): GeneralSettings =>
  mergeGeneralSettings(isRecord(value) ? (value as PartialGeneralSettings) : undefined);

export const createDashboardPage = (id = uuidv4()): DashboardPageData => ({ id });

export const createEmptyDashboardLayout = (
  options?: {
    pageId?: string;
    settings?: GeneralSettings;
  },
): DashboardLayoutData => {
  const pageId = options?.pageId ?? uuidv4();

  return {
    widgets: [],
    responsiveLayouts: {},
    pages: [{ id: pageId }],
    scrollDirection: 'vertical',
    defaultPageId: pageId,
    settings: options?.settings ? mergeGeneralSettings(options.settings) : createDefaultSettings(),
  };
};

export const createStarterDashboardLayout = (): DashboardLayoutData => {
  const pageId = uuidv4();

  return {
    widgets: [
      {
        id: uuidv4(),
        type: 'clock',
        name: 'clock',
        iconUrl: '',
        grid: { x: 2, y: 0, w: 4, h: 2 },
        pageId,
        config: { showCityName: true },
      },
      {
        id: uuidv4(),
        type: 'weather',
        name: 'weather',
        iconUrl: '',
        grid: { x: 0, y: 0, w: 2, h: 2 },
        pageId,
        config: { view: 'daily' },
        widgetType: 'weather',
        syncConfig: true,
      },
      {
        id: uuidv4(),
        type: 'search',
        name: 'search',
        iconUrl: '',
        grid: { x: 2, y: 2, w: 4, h: 1 },
        pageId,
        config: {},
      },
      {
        id: uuidv4(),
        type: 'calendar',
        name: 'calendar',
        iconUrl: '',
        grid: { x: 0, y: 2, w: 2, h: 3 },
        pageId,
        config: {},
      },
      {
        id: uuidv4(),
        type: 'rss',
        name: 'rss',
        iconUrl: '',
        grid: { x: 6, y: 0, w: 2, h: 5 },
        pageId,
        config: {
          feedUrls: ['https://selfh.st/rss/'],
          feedUrl: 'https://selfh.st/rss/',
          maxItems: 20,
          refreshInterval: 20,
        },
        widgetType: 'rss',
        syncConfig: true,
      },
      {
        id: uuidv4(),
        type: 'shortcut',
        name: 'Youtube',
        url: 'https://youtube.com',
        iconUrl: '',
        internalUrl: '',
        isSelfHosted: false,
        grid: { x: 2, y: 3, w: 1, h: 1 },
        pageId,
      },
      {
        id: uuidv4(),
        type: 'shortcut',
        name: 'IMDB',
        url: 'https://imdb.com',
        iconUrl: '',
        internalUrl: '',
        isSelfHosted: false,
        grid: { x: 3, y: 3, w: 1, h: 1 },
        pageId,
      },
      {
        id: uuidv4(),
        type: 'shortcut',
        name: 'Reddit',
        url: 'https://reddit.com',
        iconUrl: '',
        internalUrl: '',
        isSelfHosted: false,
        grid: { x: 4, y: 3, w: 1, h: 1 },
        pageId,
      },
      {
        id: uuidv4(),
        type: 'shortcut',
        name: 'Github',
        url: 'https://github.com',
        iconUrl: '',
        internalUrl: '',
        isSelfHosted: false,
        grid: { x: 5, y: 3, w: 1, h: 1 },
        pageId,
      },
    ],
    responsiveLayouts: {},
    pages: [{ id: pageId }],
    scrollDirection: 'vertical',
    defaultPageId: pageId,
    settings: mergeGeneralSettings({
      display: {
        timezone: STARTER_CITY.timezone,
        city: STARTER_CITY,
      },
    }),
  };
};

export const clampWidgetsToMaxRows = (
  widgets: Widget[],
  maxRows: number,
): Widget[] =>
  widgets.map((widget) => {
    const { x, w } = widget.grid;
    let { y, h } = widget.grid;

    if (h > maxRows) {
      h = maxRows;
    }

    if (y + h > maxRows) {
      y = Math.max(0, maxRows - h);
    }

    return {
      ...widget,
      grid: { x, y, w, h },
    };
  });

export const parseStoredDashboardLayout = (value: unknown): DashboardLayoutData => {
  const source = isRecord(value) ? value : {};
  let pages = parsePages(source.pages);

  if (pages.length === 0) {
    const totalPages =
      typeof source.totalPages === 'number' && source.totalPages > 0
        ? Math.floor(source.totalPages)
        : 0;

    pages = totalPages > 0
      ? Array.from({ length: totalPages }, () => createDashboardPage())
      : [createDashboardPage()];
  }

  const firstPageId = pages[0]?.id ?? uuidv4();
  const widgets = Array.isArray(source.widgets)
    ? source.widgets
        .map((widget) => parseWidget(widget, pages, firstPageId))
        .filter((widget): widget is Widget => widget !== null)
    : [];

  const scrollDirection =
    source.scrollDirection === 'horizontal' ? 'horizontal' : 'vertical';
  const responsiveLayouts = parseResponsiveLayouts(
    source.responsiveLayouts ?? source.mediumLayouts,
  );
  const settings = parseSettings(source.settings);
  const defaultPageId =
    typeof source.defaultPageId === 'string'
      && pages.some((page) => page.id === source.defaultPageId)
      ? source.defaultPageId
      : firstPageId;

  return {
    widgets,
    responsiveLayouts,
    pages,
    scrollDirection,
    defaultPageId,
    settings,
  };
};

export const serializeDashboardLayout = (layout: DashboardLayoutData): string =>
  JSON.stringify(layout);

export const getDashboardLayoutSummary = (layout: DashboardLayoutData) => ({
  pageCount: layout.pages.length,
  widgetCount: layout.widgets.length,
});
