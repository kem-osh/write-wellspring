import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MobileEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDarkMode: boolean;
  placeholder?: string;
}

export function MobileEditor({ value, onChange, isDarkMode, placeholder = "Start writing..." }: MobileEditorProps) {
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
          "font-mono leading-relaxed",
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
          fontSize: '16px', // Prevent iOS zoom
          lineHeight: '1.6',
          WebkitTextSizeAdjust: '100%',
          minHeight: '100%'
        }}
      />
    </div>
  );
}
