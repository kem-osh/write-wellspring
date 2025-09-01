import { useState, useRef, useCallback } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Editor } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Eye, Edit, PanelLeftRight } from 'lucide-react';
import type { Settings } from '@/stores/settingsStore';
import { MarkdownToolbar } from './MarkdownToolbar';
import { MarkdownPreview } from './MarkdownPreview';

interface EnhancedMonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDarkMode: boolean;
  settings: Settings;
  onSelectionChange?: (selectedText: string) => void;
  onProvideEditor?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  showMarkdownToolbar?: boolean;
}

export function EnhancedMonacoEditor({ 
  value, 
  onChange, 
  isDarkMode, 
  settings, 
  onSelectionChange,
  onProvideEditor,
  showMarkdownToolbar = false
}: EnhancedMonacoEditorProps) {
  const [editorMode, setEditorMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor/esm/vs/editor/editor.api')) => {
    editorRef.current = editor;
    
    onProvideEditor?.(editor);
    
    // Configure Monaco themes for writing
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

    // Track selection changes
    if (onSelectionChange) {
      editor.onDidChangeCursorSelection(() => {
        const model = editor.getModel();
        const selection = editor.getSelection();
        if (model && selection && !selection.isEmpty()) {
          const text = model.getValueInRange(selection);
          onSelectionChange(text);
        } else {
          onSelectionChange('');
        }
      });
    }
  }, [onProvideEditor, onSelectionChange]);

  const handleEditorChange = useCallback((newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue);
    }
  }, [onChange]);

  const handleInsertMarkdown = useCallback((text: string, cursorOffset?: number) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const position = editor.getPosition();
      if (position) {
        const range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
        editor.executeEdits('insert-markdown', [{
          range,
          text,
          forceMoveMarkers: true
        }]);
        
        if (cursorOffset) {
          const newPosition = new monaco.Position(
            position.lineNumber,
            position.column + text.length + cursorOffset
          );
          editor.setPosition(newPosition);
        }
        editor.focus();
      }
    }
  }, []);

  const editorOptions = {
    fontSize: settings.fontSize,
    fontFamily: settings.fontFamily === 'serif' ? 'Georgia, Times, serif' : 
                settings.fontFamily === 'mono' ? "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace" : 
                'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    lineHeight: settings.lineHeight === 'compact' ? 1.4 : 
                settings.lineHeight === 'relaxed' ? 1.8 : 1.6,
    wordWrap: 'on' as const,
    lineNumbers: 'off' as const,
    glyphMargin: false,
    folding: false,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 0,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    renderLineHighlight: 'none' as const,
    scrollbar: {
      vertical: 'hidden' as const,
      horizontal: 'hidden' as const
    },
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    renderValidationDecorations: 'off' as const,
    automaticLayout: true,
    padding: { top: 20, bottom: 20 }
  };

  return (
    <div className="h-full w-full flex flex-col">
      {showMarkdownToolbar && (
        <>
          <div className="flex items-center justify-between p-2 border-b">
            <div className="flex gap-1">
              <Button
                variant={editorMode === 'edit' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setEditorMode('edit')}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button
                variant={editorMode === 'split' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setEditorMode('split')}
              >
                <PanelLeftRight className="w-4 h-4 mr-1" />
                Split
              </Button>
              <Button
                variant={editorMode === 'preview' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setEditorMode('preview')}
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
            </div>
          </div>
          <MarkdownToolbar onInsert={handleInsertMarkdown} />
        </>
      )}
      
      {editorMode === 'edit' && (
        <div className="flex-1">
          <Editor
            height="100%"
            value={value}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            theme={isDarkMode ? 'writing-dark' : 'writing-light'}
            language="markdown"
            options={editorOptions}
          />
        </div>
      )}
      
      {editorMode === 'preview' && (
        <div className="flex-1">
          <MarkdownPreview content={value} settings={settings} />
        </div>
      )}
      
      {editorMode === 'split' && (
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div className="border-r pr-2">
            <Editor
              height="100%"
              value={value}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              theme={isDarkMode ? 'writing-dark' : 'writing-light'}
              language="markdown"
              options={{...editorOptions, fontSize: settings.fontSize - 1, padding: { top: 10, bottom: 10 }}}
            />
          </div>
          <div className="pl-2">
            <MarkdownPreview content={value} settings={settings} />
          </div>
        </div>
      )}
    </div>
  );
}