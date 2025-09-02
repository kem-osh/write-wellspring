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
    
    // Configure Monaco for writing (resolve CSS variables to static hex values for Monaco)
    const getCssVar = (name: string) => {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    };

    const parseHsl = (raw: string) => {
      // Accept formats like "222.2 84% 4.9%" or "hsl(222.2 84% 4.9%)" or with commas
      const cleaned = raw.replace(/hsl\(|\)/gi, '').trim();
      const parts = cleaned.split(/[\s,\/]+/).filter(Boolean);
      const h = parseFloat(parts[0] || '0');
      const s = parseFloat((parts[1] || '0').replace('%', ''));
      const l = parseFloat((parts[2] || '0').replace('%', ''));
      return { h, s, l };
    };

    const hslToHex = (h: number, s: number, l: number, a = 1) => {
      // Convert HSL (0-360, 0-100, 0-100) to hex, with optional alpha
      const S = s / 100;
      const L = l / 100;
      const k = (n: number) => (n + h / 30) % 12;
      const c = (1 - Math.abs(2 * L - 1)) * S;
      const x = (n: number) => L - c / 2 + c * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      const r = Math.round(255 * x(0));
      const g = Math.round(255 * x(8));
      const b = Math.round(255 * x(4));
      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      return a < 1 ? `${base}${toHex(Math.round(a * 255))}` : base;
    };

    const varToHex = (name: string, alpha = 1) => {
      const raw = getCssVar(name);
      const { h, s, l } = parseHsl(raw);
      return hslToHex(h, s, l, alpha);
    };

    const themeColors = {
      bg: varToHex('--surface'),
      fg: varToHex('--foreground'),
      line: varToHex('--muted', 0.3),
      cursor: varToHex('--primary'),
      selection: varToHex('--primary', 0.15),
    };

    monaco.editor.defineTheme('writing-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': themeColors.bg,
        'editor.foreground': themeColors.fg,
        'editor.lineHighlightBackground': themeColors.line,
        'editorCursor.foreground': themeColors.cursor,
        'editor.selectionBackground': themeColors.selection,
      }
    });

    monaco.editor.defineTheme('writing-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': themeColors.bg,
        'editor.foreground': themeColors.fg,
        'editor.lineHighlightBackground': themeColors.line,
        'editorCursor.foreground': themeColors.cursor,
        'editor.selectionBackground': themeColors.selection,
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