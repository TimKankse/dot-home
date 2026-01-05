'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { load, dump } from 'js-yaml';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { yaml } from '@codemirror/lang-yaml';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import styles from './YamlEditorTab.module.css';

// Custom theme using CSS variables from globals.css
const customTheme = EditorView.theme({
  '&': { 
    height: '425px',
    backgroundColor: 'var(--bg-app)',
    color: 'var(--text-main)'
  },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-content': { 
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: '14px'
  },
  '.cm-gutters': { 
    backgroundColor: 'var(--bg-app)',
    color: 'var(--text-muted)',
    borderRight: '1px solid var(--border-dim)'
  },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '.cm-cursor': { borderLeftColor: 'var(--text-main)' },
  '.cm-selectionBackground': { backgroundColor: 'var(--bg-highlight) !important' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--bg-highlight) !important' }
}, { dark: true });

// Custom syntax highlighting using CSS variables
const customHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--accent-blue)' },
  { tag: tags.string, color: 'var(--accent-green)' },
  { tag: tags.number, color: 'var(--accent-purple)' },
  { tag: tags.bool, color: 'var(--accent-purple)' },
  { tag: tags.null, color: 'var(--accent-purple)' },
  { tag: tags.propertyName, color: 'var(--accent-red)' },
  { tag: tags.comment, color: 'var(--text-muted)', fontStyle: 'italic' },
  { tag: tags.punctuation, color: 'var(--text-dim)' },
  { tag: tags.operator, color: 'var(--text-main)' },
]);

interface YamlEditorTabProps {
  isActive: boolean;
  currentState: Record<string, unknown>;
  onUpdate: (parsedState: Record<string, unknown>) => void;
  formStyles: {
    section: string;
    sectionTitle: string;
    formGroup: string;
  };
}

export const YamlEditorTab: React.FC<YamlEditorTabProps> = ({
  isActive,
  currentState,
  onUpdate,
  formStyles
}) => {
  const [yamlError, setYamlError] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const initializedRef = useRef(false);

  const handleChange = useCallback((val: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed: any = load(val);
      if (typeof parsed === 'object' && parsed !== null) {
        setYamlError(null);
        onUpdate(parsed);
      }
    } catch (e) {
      setYamlError((e as Error).message);
    }
  }, [onUpdate]);

  // Initialize CodeMirror when tab becomes active
  useEffect(() => {
    if (!isActive || !editorRef.current || initializedRef.current) return;

    try {
      const yamlContent = dump(currentState);
      
      const state = EditorState.create({
        doc: yamlContent,
        extensions: [
          basicSetup,
          yaml(),
          customTheme,
          syntaxHighlighting(customHighlight),
          EditorView.updateListener.of((update: { docChanged: boolean; state: EditorState }) => {
            if (update.docChanged) {
              handleChange(update.state.doc.toString());
            }
          }),
        ]
      });

      viewRef.current = new EditorView({
        state,
        parent: editorRef.current
      });
      
      initializedRef.current = true;
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setYamlError('Failed to generate YAML.');
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [isActive, currentState, handleChange]);

  if (!isActive) return null;

  return (
    <div className={formStyles.section}>
      <h3 className={formStyles.sectionTitle}>Full Configuration (YAML)</h3>
      <div className={formStyles.formGroup}>
        <div ref={editorRef} className={styles.editorContainer} />
        {yamlError && (
          <div className={styles.errorContainer}>
            {yamlError}
          </div>
        )}
      </div>
    </div>
  );
};
