import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Expand, Shrink, List, BookOpen, Zap, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CustomCommand } from './CommandSettings';

interface CustomShortcutsProps {
  onShortcut: (type: 'light-edit' | 'expand' | 'condense' | 'outline', prompt: string, model?: string, maxTokens?: number) => void;
  isLoading?: boolean;
  onCommandsChange?: () => void;
}

const DEFAULT_COMMANDS: CustomCommand[] = [
  {
    id: 'light-edit',
    name: 'Light Edit',
    prompt: 'Fix spelling, grammar, and basic formatting. Preserve the author\'s voice and style completely. Make minimal changes.',
    icon: 'sparkles',
    model: 'gpt-5-nano-2025-08-07',
    maxTokens: 500,
    sortOrder: 1
  },
  {
    id: 'expand',
    name: 'Expand',
    prompt: 'Expand this content by 20-40% while maintaining the original tone. Add depth, examples, and supporting details.',
    icon: 'expand',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 1500,
    sortOrder: 2
  },
  {
    id: 'condense',
    name: 'Condense',
    prompt: 'Reduce this content by 60-70% while preserving all key points and the author\'s voice.',
    icon: 'shrink',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 800,
    sortOrder: 3
  },
  {
    id: 'outline',
    name: 'Outline',
    prompt: 'Create a structured outline with headers and bullet points based on this content.',
    icon: 'list',
    model: 'gpt-5-nano-2025-08-07',
    maxTokens: 500,
    sortOrder: 4
  }
];

const getIconForCommand = (iconName: string) => {
  const icons: Record<string, React.ReactNode> = {
    sparkles: <Sparkles className="h-3 w-3" />,
    expand: <Expand className="h-3 w-3" />,
    shrink: <Shrink className="h-3 w-3" />,
    list: <List className="h-3 w-3" />,
    'book-open': <BookOpen className="h-3 w-3" />,
    zap: <Zap className="h-3 w-3" />,
  };
  return icons[iconName] || <Sparkles className="h-3 w-3" />;
};

export function CustomShortcuts({ onShortcut, isLoading, onCommandsChange }: CustomShortcutsProps) {
  const { user } = useAuth();
  const [commands, setCommands] = useState<CustomCommand[]>(DEFAULT_COMMANDS);
  const [commandSettingsKey, setCommandSettingsKey] = useState(0);

  useEffect(() => {
    loadCommands();
  }, [user, onCommandsChange]);

  const loadCommands = () => {
    if (!user) return;

    const savedCommands = localStorage.getItem(`commands_${user.id}`);
    if (savedCommands) {
      const parsedCommands = JSON.parse(savedCommands);
      // Sort by sortOrder
      parsedCommands.sort((a: CustomCommand, b: CustomCommand) => a.sortOrder - b.sortOrder);
      setCommands(parsedCommands);
    } else {
      setCommands(DEFAULT_COMMANDS);
    }
  };

  const getActionType = (commandId: string): 'light-edit' | 'expand' | 'condense' | 'outline' => {
    if (commandId.includes('expand')) return 'expand';
    if (commandId.includes('condense')) return 'condense';
    if (commandId.includes('outline')) return 'outline';
    return 'light-edit';
  };

  return (
    <div className="relative flex-1 max-w-lg">
      <div 
        className="flex items-center gap-2 overflow-x-auto scroll-area-horizontal py-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {commands.map((command) => (
          <Button
            key={command.id}
            size="sm"
            className="flex items-center gap-1.5 whitespace-nowrap min-w-fit h-11 bg-command-button text-command-button-foreground hover:bg-command-button/80 border-0 transition-all duration-200"
            onClick={() => onShortcut(getActionType(command.id), command.prompt, command.model, command.maxTokens)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              getIconForCommand(command.icon)
            )}
            <span className="text-sm font-medium">{command.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}