import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDarkMode: boolean;
}

export function MonacoEditor({ value, onChange, isDarkMode }: MonacoEditorProps) {
  const editorRef = useRef<any>(null);

  function handleEditorDidMount(editor: any, monaco: any) {
    editorRef.current = editor;
    
    // Configure Monaco for writing
    monaco.editor.defineTheme('writing-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#fefefe',
        'editor.foreground': '#1f2937',
        'editor.lineHighlightBackground': '#f8fafc',
        'editorCursor.foreground': '#3b82f6',
        'editor.selectionBackground': '#dbeafe',
      }
    });

    monaco.editor.defineTheme('writing-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e293b',
        'editor.foreground': '#f1f5f9',
        'editor.lineHighlightBackground': '#334155',
        'editorCursor.foreground': '#60a5fa',
        'editor.selectionBackground': '#1e3a8a',
      }
    });
  }

  function handleEditorChange(newValue: string | undefined) {
    onChange(newValue || '');
  }

  return (
    <div className="h-full w-full">
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
          padding: { top: 20, bottom: 20 },
          fontSize: 16,
          fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
          lineHeight: 1.8,
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