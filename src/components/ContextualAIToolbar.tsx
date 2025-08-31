import { useState, useEffect } from 'react';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { 
  Wand2, 
  Expand, 
  Minimize2, 
  List, 
  X,
  Loader2,
  ArrowRight
} from 'lucide-react';

interface ContextualAIToolbarProps {
  selectedText: string;
  onCommand: (type: 'light-edit' | 'expand' | 'condense' | 'outline', prompt: string) => void;
  aiLoading: boolean;
  onClose: () => void;
}

export function ContextualAIToolbar({
  selectedText,
  onCommand,
  aiLoading,
  onClose
}: ContextualAIToolbarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (selectedText) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [selectedText]);

  if (!isVisible || !selectedText) return null;

  const commands = [
    {
      type: 'light-edit' as const,
      icon: Wand2,
      label: 'Polish',
      prompt: 'Improve this text while keeping the original meaning and style'
    },
    {
      type: 'expand' as const,
      icon: Expand,
      label: 'Expand',
      prompt: 'Expand this text with more detail and examples'
    },
    {
      type: 'condense' as const,
      icon: Minimize2,
      label: 'Condense',
      prompt: 'Make this text more concise while preserving key points'
    },
    {
      type: 'outline' as const,
      icon: List,
      label: 'Outline',
      prompt: 'Create a structured outline from this text'
    }
  ];

  const wordCount = selectedText.trim().split(/\s+/).length;

  return (
    <div className="
      fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50
      bg-background border border-border rounded-xl shadow-xl
      p-3 animate-in slide-in-from-bottom-5 fade-in-0 duration-200
      max-w-sm mx-auto backdrop-blur-sm
    ">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-xs text-muted-foreground">
            {wordCount} word{wordCount !== 1 ? 's' : ''} selected
          </span>
        </div>
        <EnhancedButton
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </EnhancedButton>
      </div>

      {/* Command buttons */}
      <div className="grid grid-cols-2 gap-2">
        {commands.map((command) => {
          const Icon = command.icon;
          return (
            <EnhancedButton
              key={command.type}
              variant="ghost"
              size="sm"
              onClick={() => onCommand(command.type, command.prompt)}
              disabled={aiLoading}
              className="flex flex-col items-center gap-1 p-2 h-auto text-xs hover:bg-primary/10"
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span>{command.label}</span>
            </EnhancedButton>
          );
        })}
      </div>

      {/* Visual indicator */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
        <div className="w-4 h-4 bg-background border-l border-t border-border rotate-45" />
      </div>
    </div>
  );
}