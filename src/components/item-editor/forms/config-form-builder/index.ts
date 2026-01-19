/**
 * Config Form Builder
 * 
 * A utility for declaratively building widget configuration forms.
 * Reduces boilerplate by generating forms from field definitions.
 * 
 * @example
 * // Simple flat form
 * export const MyConfig = buildConfigForm<MyWidgetConfig>([
 *   { type: 'input', key: 'url', label: 'URL', placeholder: 'https://...' },
 *   { type: 'select', key: 'mode', label: 'Mode', options: [
 *     { value: 'a', label: 'Option A' },
 *     { value: 'b', label: 'Option B' },
 *   ]},
 * ]);
 * 
 * @example
 * // Tabbed form
 * export const MyConfig = buildTabbedConfigForm<MyWidgetConfig>([
 *   { value: 'general', label: 'General', fields: [...] },
 *   { value: 'advanced', label: 'Advanced', fields: [...] },
 * ]);
 */

export * from './types';
export * from './buildConfigForm';
export { renderField } from './fieldRenderers';
