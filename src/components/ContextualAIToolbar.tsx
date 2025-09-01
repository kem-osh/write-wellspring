import { useState, useEffect, useRef } from 'react';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { 
  X,
  Loader2
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { UnifiedCommand } from '@/types/commands';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Dynamic icon component
function CommandIcon({ name, className = "h-4 w-4" }: { name?: string; className?: string }) {
  const IconComponent = (name && (Icons as any)[name]) || Icons.Wand2;
  return <IconComponent className={className} aria-hidden="true" />;
}

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
        const { data: dbCommands, error } = await supabase
          .from('user_commands' as any)
          .select('*')
          .eq('user_id', user.id)
          .order('sort_order');

        if (error) {
          console.error('Error loading contextual commands:', error);
          if (mounted.current) {
            setCommands([]);
          }
          return;
        }
        
        // Filter to contextual commands - those typically used for selected text
        const contextualFunctionNames = [
          'ai-light-edit', 
          'ai-expand-content', 
          'ai-condense-content', 
          'ai-outline',
          'ai-rewrite'
        ];
        
        // Map and filter the commands properly
        const allCommands: UnifiedCommand[] = (dbCommands || []).map((cmd: any) => ({
          ...cmd,
          description: cmd.description || cmd.prompt?.substring(0, 50) + '...' || 'Custom command',
          estimated_time: cmd.estimated_time || '3-5s'
        }));
        
        const contextualCommands = allCommands.filter((cmd: UnifiedCommand) => 
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
      bg-surface/95 border border-border/60 rounded-2xl shadow-elevated
      p-4 animate-in slide-in-from-bottom-5 fade-in-0 duration-300
      max-w-sm mx-auto backdrop-blur-lg
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
            return (
              <EnhancedButton
                key={command.id}
                variant="ghost"
                size="sm"
                onClick={() => onCommand(command, selectedText)}
                disabled={aiLoading || loading}
                className="flex flex-col items-center gap-2 p-3 h-auto text-xs hover:bg-primary/10 rounded-lg transition-all duration-200 hover:shadow-soft"
              >
                {aiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CommandIcon name={command.icon} />
                )}
                <span>{command.name}</span>
              </EnhancedButton>
            );
          })
        )}
      </div>

      {/* Visual indicator */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
        <div className="w-4 h-4 bg-surface border-l border-t border-border/60 rotate-45 shadow-soft" />
      </div>
    </div>
  );
}