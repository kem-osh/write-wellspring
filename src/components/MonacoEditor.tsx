import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type { Settings } from '@/stores/settingsStore';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDarkMode: boolean;
  settings: Settings;
  onSelectionChange?: (text: string) => void;
  onProvideEditor?: (editor: any, monaco: any) => void;
}

export function MonacoEditor({ value, onChange, isDarkMode, settings, onSelectionChange, onProvideEditor }: MonacoEditorProps) {
  const editorRef = useRef<any>(null);

  function handleEditorDidMount(editor: any, monaco: any) {
    editorRef.current = editor;
    
    // Expose editor to parent if needed
    if (onProvideEditor) onProvideEditor(editor, monaco);
    
    // Configure Monaco for writing
    monaco.editor.defineTheme('writing-light', {
      base: 'vs',
      inherit: true,
      rules: [],
        colors: {
          'editor.background': 'hsl(var(--surface))',
          'editor.foreground': 'hsl(var(--foreground))',
          'editor.lineHighlightBackground': 'hsl(var(--muted)/0.3)',
          'editorCursor.foreground': 'hsl(var(--primary))',
          'editor.selectionBackground': 'hsl(var(--primary)/0.15)',
        }
    });

    monaco.editor.defineTheme('writing-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
        colors: {
          'editor.background': 'hsl(var(--surface))',
          'editor.foreground': 'hsl(var(--foreground))',
          'editor.lineHighlightBackground': 'hsl(var(--muted)/0.3)',
          'editorCursor.foreground': 'hsl(var(--primary))',
          'editor.selectionBackground': 'hsl(var(--primary)/0.15)',
        }
    });

    // Track selection changes and report selected text
    if (onSelectionChange) {
      editor.onDidChangeCursorSelection(() => {
        try {
          const model = editor.getModel();
          const selection = editor.getSelection();
          if (model && selection) {
            const text = model.getValueInRange(selection) || '';
            onSelectionChange(text);
          }
        } catch (e) {
          // no-op
        }
      });
    }
  }

  function handleEditorChange(newValue: string | undefined) {
    onChange(newValue || '');
  }

  return (
    <div className="h-full w-full bg-surface/50 rounded-xl border border-border/50 shadow-soft overflow-hidden backdrop-blur-sm">
      <Editor
        height="100%"
        defaultLanguage="markdown"
        value={value}
        theme={isDarkMode ? 'writing-dark' : 'writing-light'}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          lineNumbers: 'off',
          wordWrap: 'on',
          padding: { top: 32, bottom: 32, left: 24, right: 24 },
          fontSize: settings.fontSize,
          fontFamily: settings.fontFamily === 'serif' ? 'Georgia, Times, serif' : 
                      settings.fontFamily === 'mono' ? "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace" : 
                      'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          lineHeight: settings.lineHeight === 'compact' ? 1.4 : 
                      settings.lineHeight === 'relaxed' ? 1.8 : 1.6,
          scrollBeyondLastLine: false,
          folding: false,
          glyphMargin: false,
          contextmenu: false,
          scrollbar: {
            vertical: 'hidden',
            horizontal: 'hidden',
            verticalScrollbarSize: 0,
            horizontalScrollbarSize: 0,
          },
        }}
      />
    </div>
  );
}