
export type ItemType = 'widget' | 'shortcut' | null;

export type NewItem = {
  id: string;
  type: ItemType;
  name?: string;
  url?: string;
  internalUrl?: string;
  isSelfHosted?: boolean;
  iconUrl?: string;
  widgetType?: string;
  w: number;
  h: number;
  config?: {
    [key: string]: unknown;
  };
  integrationId?: string;
};

export interface FormProps {
  initialData?: Partial<NewItem>;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isEditing?: boolean;
  activeTab?: 'configuration' | 'appearance' | 'yaml';
  selectedType?: string;
}
