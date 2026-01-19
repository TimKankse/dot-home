
export type ItemType = 'widget' | 'shortcut' | null;

export type NewItem = {
  id?: string;
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
  syncConfig?: boolean;
};

export interface FormProps {
  initialData?: Partial<NewItem>;
  onSubmit: (data: NewItem) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isEditing?: boolean;
  activeTab?: 'configuration' | 'appearance' | 'yaml';
  selectedType?: string;
  formId?: string;
  onValidityChange?: (isValid: boolean) => void;
}
