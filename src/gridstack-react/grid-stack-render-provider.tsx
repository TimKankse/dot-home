import {
  PropsWithChildren,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useGridStackContext } from "./grid-stack-context";
import { GridStack, GridStackOptions, GridStackWidget } from "gridstack";
import { GridStackRenderContext } from "./grid-stack-render-context";
import isEqual from "react-fast-compare";

export const gridWidgetContainersMap = new WeakMap<GridStack, Map<string, HTMLElement>>();

interface GridStackRenderProviderProps {
  className?: string;
  style?: React.CSSProperties;
}

export function GridStackRenderProvider({ children, className, style }: PropsWithChildren<GridStackRenderProviderProps>) {
  const {
    _gridStack: { value: gridStack, set: setGridStack },
    initialOptions,
  } = useGridStackContext();

  const widgetContainersRef = useRef<Map<string, HTMLElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<GridStackOptions>(initialOptions);

  const renderCBFn = useCallback(
    (element: HTMLElement, widget: GridStackWidget & { grid?: GridStack }) => {
      if (widget.id && widget.grid) {
        let containers = gridWidgetContainersMap.get(widget.grid);
        if (!containers) {
          containers = new Map<string, HTMLElement>();
          gridWidgetContainersMap.set(widget.grid, containers);
        }
        containers.set(widget.id, element);
        widgetContainersRef.current.set(widget.id, element);
      }
    },
    []
  );

  const initGrid = useCallback(() => {
    if (containerRef.current) {
      GridStack.renderCB = renderCBFn;
      return GridStack.init(optionsRef.current, containerRef.current);
    }
    return null;
  }, [renderCBFn]);

  useLayoutEffect(() => {
    if (!isEqual(initialOptions, optionsRef.current) && gridStack) {
      try {
        gridStack.removeAll(false);
        gridStack.destroy(false);
        widgetContainersRef.current.clear();

        gridWidgetContainersMap.delete(gridStack);
        optionsRef.current = initialOptions;
        setGridStack(initGrid());
      } catch (e) {
        console.error("Error reinitializing gridstack", e);
      }
    }
  }, [initialOptions, gridStack, initGrid, setGridStack]);

  useLayoutEffect(() => {
    if (!gridStack) {
      try {
        setGridStack(initGrid());
      } catch (e) {
        console.error("Error initializing gridstack", e);
      }
    }
  }, [gridStack, initGrid, setGridStack]);

  return (
    <GridStackRenderContext.Provider
      value={useMemo(
        () => ({
          getWidgetContainer: (widgetId: string) => {
            if (gridStack) {
              const containers = gridWidgetContainersMap.get(gridStack);
              if (containers?.has(widgetId)) {
                return containers.get(widgetId) || null;
              }
            }
            return widgetContainersRef.current.get(widgetId) || null;
          },
        }),
        [gridStack]
      )}
    >
      <div ref={containerRef} className={className} style={style}>{gridStack ? children : null}</div>
    </GridStackRenderContext.Provider>
  );
}