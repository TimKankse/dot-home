export interface WidgetConfigProps {
  config: Record<string, any>;
  onChange: (key: string, value: any) => void;
  styles: Record<string, string>;
}
