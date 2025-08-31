import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Expand, Shrink, List, BookOpen, Zap, Loader2 } from 'lucide-react';

interface Shortcut {
  id: string;
  name: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CustomShortcutsProps {
  onShortcut: (type: 'light-edit' | 'expand' | 'condense' | 'outline', prompt: string) => void;
  isLoading?: boolean;
}

export function CustomShortcuts({ onShortcut, isLoading }: CustomShortcutsProps) {
  const shortcuts: Shortcut[] = [
    {
      id: 'expand',
      name: 'Expand',
      icon: <Expand className="h-3 w-3" />,
      action: () => onShortcut('expand', 'Expand this content by 30-50% while maintaining tone'),
    },
    {
      id: 'condense',
      name: 'Condense',
      icon: <Shrink className="h-3 w-3" />,
      action: () => onShortcut('condense', 'Condense this content by 60-70% while preserving key points'),
    },
    {
      id: 'outline',
      name: 'Outline',
      icon: <List className="h-3 w-3" />,
      action: () => onShortcut('outline', 'Create a structured outline with headers and bullet points'),
    },
    {
      id: 'improve',
      name: 'Light Edit',
      icon: <Sparkles className="h-3 w-3" />,
      action: () => onShortcut('light-edit', 'Fix spelling, grammar, and formatting while preserving voice'),
    },
    {
      id: 'summarize',
      name: 'Summarize',
      icon: <BookOpen className="h-3 w-3" />,
      action: () => onShortcut('condense', 'Summarize the key points concisely'),
    },
    {
      id: 'energize',
      name: 'Energize',
      icon: <Zap className="h-3 w-3" />,
      action: () => onShortcut('expand', 'Make this text more engaging and energetic'),
    },
  ];

  return (
    <div className="relative flex-1 max-w-lg">
      <div 
        className="flex items-center gap-2 overflow-x-auto scroll-area-horizontal py-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {shortcuts.map((shortcut) => (
          <Button
            key={shortcut.id}
            size="sm"
            className="flex items-center gap-1.5 whitespace-nowrap min-w-fit h-11 bg-command-button text-command-button-foreground hover:bg-command-button/80 border-0 transition-all duration-200"
            onClick={shortcut.action}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              shortcut.icon
            )}
            <span className="text-sm font-medium">{shortcut.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}