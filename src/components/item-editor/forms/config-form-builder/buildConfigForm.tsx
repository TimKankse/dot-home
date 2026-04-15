'use client';

import React, { useState } from 'react';
import { WidgetConfigProps } from '@/components/item-editor/forms/types';
import { ToggleGroup } from '@/components/primitives/toggle-group';
import { renderField } from './fieldRenderers';
import type { 
  FieldDefinition, 
  SectionDefinition, 
  TabDefinition, 
  ConfigFormSchema 
} from './types';

/**
 * Builds a config form component from a flat array of field definitions.
 */
export function buildConfigForm<T>(
  fields: FieldDefinition<T>[]
): React.FC<WidgetConfigProps<T>> {
  return function ConfigForm({ config, onChange, styles }) {
    return (
      <>
        {fields.map((field) =>
          renderField({ field, config, onChange, styles })
        )}
      </>
    );
  };
}

/**
 * Builds a config form with sections (grouped fields with optional titles).
 */
export function buildSectionedConfigForm<T>(
  sections: SectionDefinition<T>[]
): React.FC<WidgetConfigProps<T>> {
  return function SectionedConfigForm({ config, onChange, styles }) {
    return (
      <>
        {sections.map((section, sectionIndex) => {
          // Check section condition
          if (section.condition && !section.condition(config)) {
            return null;
          }

          return (
            <div key={sectionIndex} className={styles.section}>
              {section.title && (
                <h4 
                  className={styles.sectionTitle} 
                  style={{ marginTop: sectionIndex > 0 ? '20px' : 0, marginBottom: '12px' }}
                >
                  {section.title}
                </h4>
              )}
              {section.fields.map((field) =>
                renderField({ field, config, onChange, styles })
              )}
            </div>
          );
        })}
      </>
    );
  };
}

/**
 * Builds a tabbed config form.
 */
export function buildTabbedConfigForm<T>(
  tabs: TabDefinition<T>[]
): React.FC<WidgetConfigProps<T>> {
  return function TabbedConfigForm({ config, onChange, styles }) {
    const [activeTab, setActiveTab] = useState(tabs[0]?.value || '');

    const activeTabDef = tabs.find((t) => t.value === activeTab);

    return (
      <>
        <div style={{ marginBottom: '16px' }}>
          <ToggleGroup
            value={activeTab}
            onChange={(val) => setActiveTab(val as string)}
            options={tabs.map((tab) => ({ value: tab.value, label: tab.label }))}
          />
        </div>

        {activeTabDef && (
          <>
            {/* Render sections if present */}
            {activeTabDef.sections?.map((section, sectionIndex) => {
              if (section.condition && !section.condition(config)) {
                return null;
              }

              return (
                <div key={sectionIndex} className={styles.section}>
                  {section.title && (
                    <h4 
                      className={styles.sectionTitle} 
                      style={{ marginTop: sectionIndex > 0 ? '20px' : 0, marginBottom: '12px' }}
                    >
                      {section.title}
                    </h4>
                  )}
                  {section.fields.map((field) =>
                    renderField({ field, config, onChange, styles })
                  )}
                </div>
              );
            })}

            {/* Render flat fields if present */}
            {activeTabDef.fields?.map((field) =>
              renderField({ field, config, onChange, styles })
            )}
          </>
        )}
      </>
    );
  };
}

/**
 * Generic builder that accepts any schema type.
 */
export function buildForm<T>(
  schema: ConfigFormSchema<T>
): React.FC<WidgetConfigProps<T>> {
  if ('tabs' in schema) {
    return buildTabbedConfigForm(schema.tabs);
  }
  if ('sections' in schema) {
    return buildSectionedConfigForm(schema.sections);
  }
  return buildConfigForm(schema.fields);
}
