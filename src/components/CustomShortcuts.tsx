import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Expand, Shrink, List, BookOpen, Zap } from 'lucide-react';

interface Shortcut {
  id: string;
  name: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CustomShortcutsProps {
  onShortcut: (prompt: string) => void;
}

export function CustomShortcuts({ onShortcut }: CustomShortcutsProps) {
  const shortcuts: Shortcut[] = [
    {
      id: 'expand',
      name: 'Expand',
      icon: <Expand className="h-3 w-3" />,
      action: () => onShortcut('Expand this text with more detail and depth'),
    },
    {
      id: 'condense',
      name: 'Condense',
      icon: <Shrink className="h-3 w-3" />,
      action: () => onShortcut('Condense this text to be more concise'),
    },
    {
      id: 'outline',
      name: 'Outline',
      icon: <List className="h-3 w-3" />,
      action: () => onShortcut('Create an outline from this text'),
    },
    {
      id: 'improve',
      name: 'Improve',
      icon: <Sparkles className="h-3 w-3" />,
      action: () => onShortcut('Improve the writing quality and clarity'),
    },
    {
      id: 'summarize',
      name: 'Summarize',
      icon: <BookOpen className="h-3 w-3" />,
      action: () => onShortcut('Summarize the key points'),
    },
    {
      id: 'energize',
      name: 'Energize',
      icon: <Zap className="h-3 w-3" />,
      action: () => onShortcut('Make this text more engaging and energetic'),
    },
  ];

  return (
    <ScrollArea className="w-full">
      <div className="flex items-center gap-2 pb-2">
        {shortcuts.map((shortcut) => (
          <Button
            key={shortcut.id}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 whitespace-nowrap"
            onClick={shortcut.action}
          >
            {shortcut.icon}
            {shortcut.name}
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}