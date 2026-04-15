'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  formStyles: Record<string, string>;
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
  // Track current state for syncing - always use latest value
  const currentStateRef = useRef(currentState);
  // Track last synced content to avoid unnecessary updates
  const lastSyncedRef = useRef<string>('');

  // Use a ref for the change handler to avoid recreating the editor
  const handleChangeRef = useRef<((val: string) => void) | undefined>(undefined);
  useEffect(() => {
    currentStateRef.current = currentState;
  }, [currentState]);

  useEffect(() => {
    handleChangeRef.current = (val: string) => {
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
    };
  }, [onUpdate]);

  // Stable string representation of current state for comparison
  const currentStateJson = JSON.stringify(currentState);
  const currentStateJsonRef = useRef(currentStateJson);

  // Initialize CodeMirror when tab becomes active, sync when state changes
  useEffect(() => {
    if (!isActive || !editorRef.current) return;

    try {
      const yamlContent = dump(currentStateRef.current);
      
      // If editor exists, sync content with current form state
      if (viewRef.current && initializedRef.current) {
        const currentDoc = viewRef.current.state.doc.toString();
        // Only update if content actually differs and form state changed (avoid cursor jump)
        if (currentStateJsonRef.current !== currentStateJson) {
          currentStateJsonRef.current = currentStateJson;
          if (currentDoc !== yamlContent) {
            viewRef.current.dispatch({
              changes: { from: 0, to: currentDoc.length, insert: yamlContent }
            });
            lastSyncedRef.current = yamlContent;
          }
        }
        return;
      }

      // First-time initialization
      const state = EditorState.create({
        doc: yamlContent,
        extensions: [
          basicSetup,
          yaml(),
          customTheme,
          syntaxHighlighting(customHighlight),
          EditorView.updateListener.of((update: { docChanged: boolean; state: EditorState }) => {
            if (update.docChanged) {
              const newContent = update.state.doc.toString();
              lastSyncedRef.current = newContent;
              currentStateJsonRef.current = ''; // Mark as needing sync from editor
              handleChangeRef.current?.(newContent);
            }
          }),
        ]
      });

      viewRef.current = new EditorView({
        state,
        parent: editorRef.current
      });
      
      lastSyncedRef.current = yamlContent;
      currentStateJsonRef.current = currentStateJson;
      initializedRef.current = true;
    } catch {
      window.setTimeout(() => {
        setYamlError('Failed to generate YAML.');
      }, 0);
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
        initializedRef.current = false;
        lastSyncedRef.current = '';
      }
    };
  }, [isActive, currentStateJson]); // Sync when tab becomes active OR state changes

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
