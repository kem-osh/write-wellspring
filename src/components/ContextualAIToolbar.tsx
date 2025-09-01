import { useState, useEffect, useRef } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { loadUserCommands } from '@/utils/commandMigration';

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
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [commands, setCommands] = useState<UnifiedCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { 
      mounted.current = false; 
    };
  }, []);

  useEffect(() => {
    const loadContextualCommands = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const allCommands = await loadUserCommands(user.id);
        
        // Filter to contextual commands - those typically used for selected text
        const contextualFunctionNames = [
          'ai-light-edit', 
          'ai-expand-content', 
          'ai-condense-content', 
          'ai-outline',
          'ai-rewrite'
        ];
        
        const contextualCommands = allCommands.filter(cmd => 
          contextualFunctionNames.includes(cmd.function_name) ||
          cmd.category === 'edit' ||
          cmd.category === 'structure'
        );
        
        if (mounted.current) {
          setCommands(contextualCommands);
        }
      } catch (error) {
        console.error('Failed to load contextual commands:', error);
        if (mounted.current) {
          setCommands([]);
        }
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    };

    if (selectedText && selectedText.trim().length > 0) {
      setIsVisible(true);
      loadContextualCommands();
    } else {
      setIsVisible(false);
      setCommands([]);
    }
  }, [selectedText, user]);

  if (!isVisible || !selectedText || commands.length === 0) return null;

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
        {loading ? (
          <div className="col-span-2 flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          commands.map((command) => {
            const iconMap: Record<string, any> = {
              'wand2': Wand2,
              'expand': Expand,
              'minimize2': Minimize2,
              'list': List,
              'sparkles': Wand2,
              'zap': Wand2
            };
            const Icon = iconMap[command.icon] || Wand2;
            
            return (
              <EnhancedButton
                key={command.id}
                variant="ghost"
                size="sm"
                onClick={() => onCommand(command, selectedText)}
                disabled={aiLoading || loading}
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
          })
        )}
      </div>

      {/* Visual indicator */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
        <div className="w-4 h-4 bg-background border-l border-t border-border rotate-45" />
      </div>
    </div>
  );
}