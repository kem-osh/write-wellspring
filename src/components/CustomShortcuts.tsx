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
import { CustomCommand } from './CommandSettings';

interface CustomShortcutsProps {
  onShortcut: (
    type: 'light-edit' | 'heavy-polish' | 'expand' | 'condense' | 'simplify' | 'formalize' | 'casualize' | 
         'outline' | 'summarize' | 'bullet-points' | 'paragraph-breaks' | 'add-headers' |
         'analyze' | 'match-voice' | 'change-tone' | 'strengthen-args' | 'add-examples' | 'fact-check' |
         'continue' | 'rewrite',
    prompt: string, 
    model?: string, 
    maxTokens?: number
  ) => void;
  isLoading?: boolean;
  onCommandsChange?: () => void;
  selectedText?: string;
  isMobile?: boolean;
}

type CommandCategory = 'edit' | 'structure' | 'analyze' | 'style';

interface EnhancedCommand extends CustomCommand {
  category: CommandCategory;
  description: string;
  estimatedTime: string;
}

const DEFAULT_COMMANDS: EnhancedCommand[] = [
  // Core Editing Commands
  {
    id: 'light-edit',
    name: 'Light Polish',
    prompt: 'Fix spelling, grammar, and basic punctuation. Preserve the author\'s voice and style completely. Make minimal changes.',
    description: 'Fix grammar, spelling, punctuation while preserving voice',
    icon: 'sparkles',
    model: 'gpt-5-nano-2025-08-07',
    maxTokens: 500,
    sortOrder: 1,
    category: 'edit',
    estimatedTime: '1-2s'
  },
  {
    id: 'heavy-polish',
    name: 'Heavy Polish',
    prompt: 'Improve clarity, flow, and readability. Make style adjustments while preserving the author\'s voice. Enhance sentence structure and transitions.',
    description: 'Improve clarity, flow, and readability with style adjustments',
    icon: 'pen-tool',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 1000,
    sortOrder: 2,
    category: 'edit',
    estimatedTime: '3-5s'
  },
  {
    id: 'expand',
    name: 'Expand',
    prompt: 'Expand this content by 30-50% while maintaining the original tone. Add depth, examples, and supporting details.',
    description: 'Add 30-50% more content with examples and details',
    icon: 'expand',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 1500,
    sortOrder: 3,
    category: 'edit',
    estimatedTime: '4-6s'
  },
  {
    id: 'condense',
    name: 'Condense',
    prompt: 'Reduce this content by 60% while preserving all key points and the author\'s voice.',
    description: 'Reduce by 60% while keeping all key points',
    icon: 'shrink',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 800,
    sortOrder: 4,
    category: 'edit',
    estimatedTime: '3-5s'
  },
  {
    id: 'simplify',
    name: 'Simplify',
    prompt: 'Rewrite for easier reading. Use shorter sentences, simpler words, and clearer structure. Target a general audience.',
    description: 'Make easier to read with simpler language',
    icon: 'type',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 1000,
    sortOrder: 5,
    category: 'style',
    estimatedTime: '3-5s'
  },

  // Structural Commands
  {
    id: 'outline',
    name: 'Outline',
    prompt: 'Create a structured outline with headers and bullet points based on this content.',
    description: 'Create structured outline with headers and bullets',
    icon: 'list',
    model: 'gpt-5-nano-2025-08-07',
    maxTokens: 500,
    sortOrder: 6,
    category: 'structure',
    estimatedTime: '2-3s'
  },
  {
    id: 'summarize',
    name: 'Summarize',
    prompt: 'Extract the key points into a concise summary that is about 25% of the original length.',
    description: 'Extract key points into 25% length summary',
    icon: 'file-text',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 600,
    sortOrder: 7,
    category: 'structure',
    estimatedTime: '3-4s'
  },
  {
    id: 'bullet-points',
    name: 'Bullet Points',
    prompt: 'Convert this content into clear, scannable bullet points that capture all main ideas.',
    description: 'Convert to clear, scannable bullet points',
    icon: 'check-square',
    model: 'gpt-5-nano-2025-08-07',
    maxTokens: 600,
    sortOrder: 8,
    category: 'structure',
    estimatedTime: '2-3s'
  },

  // Analytical Commands
  {
    id: 'analyze',
    name: 'Analyze',
    prompt: 'Comprehensive analysis with improvement recommendations',
    description: 'Get detailed analysis with actionable improvements',
    icon: 'bar-chart-3',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 1200,
    sortOrder: 9,
    category: 'analyze',
    estimatedTime: '5-8s'
  },

  // Style Commands
  {
    id: 'formalize',
    name: 'Formalize',
    prompt: 'Make this more professional and academic while keeping the core meaning intact.',
    description: 'Make more professional and academic',
    icon: 'book-open',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 1000,
    sortOrder: 10,
    category: 'style',
    estimatedTime: '3-5s'
  },
  {
    id: 'casualize',
    name: 'Casualize',
    prompt: 'Make this more conversational and approachable while maintaining professionalism.',
    description: 'Make more conversational and approachable',
    icon: 'message-circle',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 1000,
    sortOrder: 11,
    category: 'style',
    estimatedTime: '3-5s'
  },

  // NEW COMMANDS
  {
    id: 'continue',
    name: 'Continue',
    prompt: 'Continue writing from the provided text, seamlessly matching the existing tone and style.',
    description: 'AI continues writing where you left off',
    icon: 'zap',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 1000,
    sortOrder: 12,
    category: 'edit',
    estimatedTime: '3-5s'
  },
  {
    id: 'rewrite',
    name: 'Rewrite',
    prompt: 'Rewrite the following text to improve its clarity, engagement, and impact. Preserve the core meaning.',
    description: 'A complete rewrite of the selected text or document',
    icon: 'pen-tool',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 2000,
    sortOrder: 13,
    category: 'edit',
    estimatedTime: '4-7s'
  },
  {
    id: 'fact-check',
    name: 'Fact-Check',
    prompt: 'Analyze the following text for factual accuracy. Identify any claims and verify them. Return a summary of your findings.',
    description: 'Verify factual claims within the text',
    icon: 'shield',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 1500,
    sortOrder: 14,
    category: 'analyze',
    estimatedTime: '6-10s'
  }
];

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
  isMobile = false 
}: CustomShortcutsProps) {
  const { user } = useAuth();
  const { selectionChanged, impactLight } = useHaptics();
  const [commands, setCommands] = useState<EnhancedCommand[]>(DEFAULT_COMMANDS);
  const [activeCategory, setActiveCategory] = useState<CommandCategory>('edit');

  useEffect(() => {
    loadCommands();
  }, [user, onCommandsChange]);

  const loadCommands = () => {
    if (!user) return;

    const savedCommands = localStorage.getItem(`commands_${user.id}`);
    if (savedCommands) {
      const parsedCommands = JSON.parse(savedCommands);
      // Merge with defaults and add missing properties
      const enhancedCommands = parsedCommands.map((cmd: CustomCommand) => {
        const defaultCmd = DEFAULT_COMMANDS.find(d => d.id === cmd.id);
        return {
          ...defaultCmd,
          ...cmd,
          category: defaultCmd?.category || 'edit',
          description: defaultCmd?.description || cmd.prompt.substring(0, 50) + '...',
          estimatedTime: defaultCmd?.estimatedTime || '2-4s'
        };
      });
      setCommands(enhancedCommands);
    } else {
      setCommands(DEFAULT_COMMANDS);
    }
  };

  const getActionType = (commandId: string): any => {
    // Map command IDs to their action types
    const typeMap: Record<string, string> = {
      'light-edit': 'light-edit',
      'heavy-polish': 'heavy-polish',
      'expand': 'expand',
      'condense': 'condense',
      'simplify': 'simplify',
      'formalize': 'formalize',
      'casualize': 'casualize',
      'outline': 'outline',
      'summarize': 'summarize',
      'bullet-points': 'bullet-points',
      'paragraph-breaks': 'paragraph-breaks',
      'add-headers': 'add-headers',
      'analyze': 'analyze',
      'match-voice': 'match-voice',
      'change-tone': 'change-tone',
      'strengthen-args': 'strengthen-args',
      'add-examples': 'add-examples',
      'fact-check': 'fact-check',
      'continue': 'continue',
      'rewrite': 'rewrite'
    };
    return typeMap[commandId] || 'light-edit';
  };

  const handleCommandClick = (command: EnhancedCommand) => {
    selectionChanged(); // Haptic feedback
    impactLight(); // Secondary haptic
    onShortcut(getActionType(command.id), command.prompt, command.model, command.maxTokens);
  };

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
                    Est. {command.estimatedTime} • {selectedText ? 'Selection' : 'Full doc'}
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
                  Est. {command.estimatedTime} • {selectedText ? 'Selection' : 'Full doc'}
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
                  onClick={() => {/* Open more commands modal */}}
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