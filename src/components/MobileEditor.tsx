import { useRef, useEffect, useCallback } from 'react';
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

  // Optimized auto-resize with better performance
  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Use requestAnimationFrame for smooth resize
    requestAnimationFrame(() => {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, window.innerHeight * 0.8);
      textarea.style.height = `${newHeight}px`;
    });
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // Trigger resize immediately for smooth typing experience
    autoResize();
  };

  // Handle focus for better mobile UX
  const handleFocus = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Scroll into view on mobile to avoid keyboard overlap
    setTimeout(() => {
      textarea.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 300); // Wait for keyboard animation
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-surface/50 rounded-xl border border-border/50 shadow-soft backdrop-blur-sm overflow-hidden">
      <textarea
        ref={textareaRef}
        className={cn(
          "w-full flex-1 p-6 resize-none border-none outline-none bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-inset",
          settings.fontFamily === 'serif' ? "font-serif" : 
          settings.fontFamily === 'mono' ? "font-mono" : "font-sans",
          // Prevent iOS zoom on focus
          "text-base sm:text-sm",
          // Enhanced mobile optimizations
          "touch-manipulation",
          // Hide scrollbar but keep functionality
          "scrollbar-none overflow-y-auto",
          // Better iOS scroll behavior
          "overscroll-behavior-y-contain",
          // Optimize for mobile rendering
          "will-change-scroll"
        )}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
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
          minHeight: '100%',
          // Enhanced mobile input handling
          WebkitAppearance: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      />
    </div>
  );
}
