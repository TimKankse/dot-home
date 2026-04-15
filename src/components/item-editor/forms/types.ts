export type WidgetConfigValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | object;

export interface WidgetConfigProps<T = Record<string, unknown>> {
  config: Partial<T>;
  onChange: (key: string, value: WidgetConfigValue) => void;
  styles: Record<string, string>;
}
