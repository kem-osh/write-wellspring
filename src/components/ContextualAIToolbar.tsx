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
import { UnifiedCommand } from '@/types/commands';

interface ContextualAIToolbarProps {
  selectedText: string;
  onCommand: (command: UnifiedCommand, selectedText?: string) => void;
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

  const commands: UnifiedCommand[] = [
    {
      id: 'light-edit-contextual',
      user_id: '',
      name: 'Polish',
      prompt: 'Improve this text while keeping the original meaning and style',
      ai_model: 'gpt-5-nano-2025-08-07',
      max_tokens: 500,
      system_prompt: 'You are an expert editor. Fix spelling, grammar, and basic formatting while preserving the author\'s voice.',
      sort_order: 1,
      function_name: 'ai-light-edit',
      icon: 'wand2',
      category: 'edit',
      description: 'Quick polish for selected text',
      estimated_time: '1-2s'
    },
    {
      id: 'expand-contextual',
      user_id: '',
      name: 'Expand',
      prompt: 'Expand this text with more detail and examples',
      ai_model: 'gpt-5-mini-2025-08-07',
      max_tokens: 1000,
      system_prompt: 'You are an expert writer. Expand the content naturally with depth and examples.',
      sort_order: 2,
      function_name: 'ai-expand-content',
      icon: 'expand',
      category: 'edit',
      description: 'Add detail to selected text',
      estimated_time: '3-4s'
    },
    {
      id: 'condense-contextual',
      user_id: '',
      name: 'Condense',
      prompt: 'Make this text more concise while preserving key points',
      ai_model: 'gpt-5-mini-2025-08-07',
      max_tokens: 800,
      system_prompt: 'You are an expert editor. Condense the content while preserving all key points.',
      sort_order: 3,
      function_name: 'ai-condense-content',
      icon: 'minimize2',
      category: 'edit',
      description: 'Make text more concise',
      estimated_time: '2-3s'
    },
    {
      id: 'outline-contextual',
      user_id: '',
      name: 'Outline',
      prompt: 'Create a structured outline from this text',
      ai_model: 'gpt-5-nano-2025-08-07',
      max_tokens: 500,
      system_prompt: 'You are an expert at creating structured outlines.',
      sort_order: 4,
      function_name: 'ai-outline',
      icon: 'list',
      category: 'structure',
      description: 'Create outline from text',
      estimated_time: '2-3s'
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
          const iconMap: Record<string, any> = {
            'wand2': Wand2,
            'expand': Expand,
            'minimize2': Minimize2,
            'list': List
          };
          const Icon = iconMap[command.icon] || Wand2;
          
          return (
            <EnhancedButton
              key={command.id}
              variant="ghost"
              size="sm"
              onClick={() => onCommand(command, selectedText)}
              disabled={aiLoading}
              className="flex flex-col items-center gap-1 p-2 h-auto text-xs hover:bg-primary/10"
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span>{command.name}</span>
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