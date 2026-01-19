// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface WidgetConfigProps<T = Record<string, any>> {
  config: Partial<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (key: string, value: any) => void;
  styles: Record<string, string>;
}
