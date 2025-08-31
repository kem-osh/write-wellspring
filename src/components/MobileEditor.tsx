import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Settings } from '@/stores/settingsStore';

interface MobileEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDarkMode: boolean;
  settings: Settings;
  placeholder?: string;
}

export function MobileEditor({ value, onChange, isDarkMode, settings, placeholder = "Start writing..." }: MobileEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-resize textarea
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="h-full w-full flex flex-col">
      <textarea
        ref={textareaRef}
        className={cn(
          "w-full flex-1 p-4 resize-none border-none outline-none bg-background text-foreground",
          settings.fontFamily === 'serif' ? "font-serif" : 
          settings.fontFamily === 'mono' ? "font-mono" : "font-sans",
          // Prevent iOS zoom on focus
          "text-base sm:text-sm",
          // Mobile-specific optimizations
          "touch-manipulation",
          // Hide scrollbar but keep functionality
          "scrollbar-none overflow-y-auto"
        )}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="on"
        autoCapitalize="sentences"
        spellCheck="true"
        style={{
          fontSize: `${Math.max(16, settings.fontSize)}px`, // Prevent iOS zoom with minimum 16px
          lineHeight: settings.lineHeight === 'compact' ? '1.4' : 
                      settings.lineHeight === 'relaxed' ? '1.8' : '1.6',
          fontFamily: settings.fontFamily === 'serif' ? 'Georgia, Times, serif' : 
                      settings.fontFamily === 'mono' ? "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace" : 
                      'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          WebkitTextSizeAdjust: '100%',
          minHeight: '100%'
        }}
      />
    </div>
  );
}
