import { buildConfigForm } from '@/components/item-editor/forms/config-form-builder';
import type { ImageWidgetConfig } from '@/types';

export const ImageConfig = buildConfigForm<ImageWidgetConfig>([
  { 
    type: 'input', 
    key: 'url', 
    label: 'Image URL', 
    placeholder: 'https://example.com/image.jpg' 
  },
  { 
    type: 'select', 
    key: 'fit', 
    label: 'Object Fit', 
    options: [
      { value: 'cover', label: 'Cover' },
      { value: 'contain', label: 'Contain' },
      { value: 'fill', label: 'Fill' }
    ],
    fullWidth: true
  }
]);
