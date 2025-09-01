import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Sparkles, Expand, Shrink, List, BookOpen, Zap, Loader2, 
  FileText, Type, ChevronRight, Brain, Target, MessageCircle,
  PenTool, Plus, CheckSquare, Hash, BarChart3, Palette, Shield
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useHaptics } from '@/hooks/useHaptics';
import { UnifiedCommand } from '@/types/commands';
import { loadUserCommands } from '@/utils/commandMigration';

interface CustomShortcutsProps {
  onShortcut: (command: UnifiedCommand, selectedText?: string) => void;
  isLoading?: boolean;
  onCommandsChange?: () => void;
  selectedText?: string;
  isMobile?: boolean;
  onOpenMore?: () => void;
}

type CommandCategory = 'edit' | 'structure' | 'analyze' | 'style';

const getIconForCommand = (iconName: string) => {
  const icons: Record<string, React.ReactNode> = {
    sparkles: <Sparkles className="h-3.5 w-3.5" />,
    'pen-tool': <PenTool className="h-3.5 w-3.5" />,
    expand: <Expand className="h-3.5 w-3.5" />,
    shrink: <Shrink className="h-3.5 w-3.5" />,
    type: <Type className="h-3.5 w-3.5" />,
    list: <List className="h-3.5 w-3.5" />,
    'file-text': <FileText className="h-3.5 w-3.5" />,
    'check-square': <CheckSquare className="h-3.5 w-3.5" />,
    'bar-chart-3': <BarChart3 className="h-3.5 w-3.5" />,
    'book-open': <BookOpen className="h-3.5 w-3.5" />,
    'message-circle': <MessageCircle className="h-3.5 w-3.5" />,
    hash: <Hash className="h-3.5 w-3.5" />,
    palette: <Palette className="h-3.5 w-3.5" />,
    target: <Target className="h-3.5 w-3.5" />,
    plus: <Plus className="h-3.5 w-3.5" />,
    shield: <Shield className="h-3.5 w-3.5" />,
    brain: <Brain className="h-3.5 w-3.5" />,
    zap: <Zap className="h-3.5 w-3.5" />,
  };
  return icons[iconName] || <Sparkles className="h-3.5 w-3.5" />;
};

export function CustomShortcuts({ 
  onShortcut, 
  isLoading, 
  onCommandsChange, 
  selectedText, 
  isMobile = false,
  onOpenMore
}: CustomShortcutsProps) {
  const { user } = useAuth();
  const { selectionChanged, impactLight } = useHaptics();
  const [commands, setCommands] = useState<UnifiedCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CommandCategory>('edit');

  useEffect(() => {
    if (user) {
      loadCommands();
    }
  }, [user, onCommandsChange]);

  const loadCommands = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userCommands = await loadUserCommands(user.id);
      setCommands(userCommands);
      
      // If no commands loaded, user needs to restore defaults
      if (userCommands.length === 0) {
        console.log('No commands found for user, they need to restore defaults');
      }
    } catch (error) {
      console.error('Error loading commands:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommandClick = (command: UnifiedCommand) => {
    selectionChanged(); // Haptic feedback
    impactLight(); // Secondary haptic
    onShortcut(command, selectedText);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show empty state if no commands
  if (commands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="text-sm text-muted-foreground mb-2">
          No AI commands found
        </div>
        <div className="text-xs text-muted-foreground">
          Go to Settings to restore default commands
        </div>
      </div>
    );
  }

  const filteredCommands = commands.filter(cmd => cmd.category === activeCategory);
  const primaryCommands = filteredCommands.slice(0, isMobile ? 3 : 4);

  if (isMobile) {
    // Mobile: Category tabs with commands below
    return (
      <div className="space-y-4">
        {/* Category Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {(['edit', 'structure', 'analyze', 'style'] as CommandCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                activeCategory === category
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Command Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredCommands.map((command) => (
            <TooltipProvider key={command.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="default"
                    className="flex flex-col items-center gap-2 h-20 min-h-[44px] bg-command-button text-command-button-foreground hover:bg-command-button/90 border-0 transition-all duration-200"
                    onClick={() => handleCommandClick(command)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      getIconForCommand(command.icon)
                    )}
                   <span className="text-xs font-medium text-center leading-tight">
                     {command.name}
                   </span>
                 </Button>
               </TooltipTrigger>
               <TooltipContent side="bottom" className="max-w-xs">
                 <p className="text-sm">{command.description}</p>
                 <p className="text-xs text-muted-foreground mt-1">
                   Est. {command.estimated_time} • {selectedText ? 'Selection' : 'Full doc'}
                 </p>
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
         ))}
       </div>
      </div>
    );
  }

  // Desktop: Horizontal scrolling with overflow
  return (
    <div className="relative flex-1 max-w-lg">
      <div 
        className="flex items-center gap-2 overflow-x-auto scroll-area-horizontal py-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {primaryCommands.map((command) => (
          <TooltipProvider key={command.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="flex items-center gap-1.5 whitespace-nowrap min-w-fit h-11 bg-command-button text-command-button-foreground hover:bg-command-button/90 border-0 transition-all duration-200"
                  onClick={() => handleCommandClick(command)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    getIconForCommand(command.icon)
                  )}
                  <span className="text-sm font-medium">{command.name}</span>
                </Button>
              </TooltipTrigger>
               <TooltipContent side="top" className="max-w-xs">
                 <p className="text-sm">{command.description}</p>
                 <p className="text-xs text-muted-foreground mt-1">
                   Est. {command.estimated_time} • {selectedText ? 'Selection' : 'Full doc'}
                 </p>
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
         ))}

         {filteredCommands.length > primaryCommands.length && (
           <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1 whitespace-nowrap min-w-fit h-11"
                    onClick={onOpenMore}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    More
                  </Button>
               </TooltipTrigger>
               <TooltipContent side="top">
                 <p className="text-sm">View all {activeCategory} commands</p>
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
         )}
      </div>
    </div>
  );
}