import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useCommandRanking } from '@/hooks/useCommandRanking';
import { 
  Sparkles, 
  Zap, 
  Edit3, 
  Expand, 
  Minimize, 
  FileText, 
  MoreHorizontal,
  Mic,
  Target,
  BookOpen
} from 'lucide-react';
import { Card } from '@/components/ui/card';

interface AICommand {
  id: string;
  name: string;
  icon: typeof Sparkles;
  action: string;
  description: string;
  priority: number;
}

interface AISmartCarouselProps {
  onCommand: (action: string) => void;
  aiLoading: boolean;
  selectedText?: string;
  onOpenSettings: () => void;
  className?: string;
}

const ALL_COMMANDS: AICommand[] = [
  {
    id: 'light-edit',
    name: 'Polish',
    icon: Sparkles,
    action: 'light-edit',
    description: 'Quick grammar and style fixes',
    priority: 10
  },
  {
    id: 'expand',
    name: 'Expand',
    icon: Expand,
    action: 'expand',
    description: 'Add more detail and depth',
    priority: 8
  },
  {
    id: 'condense',
    name: 'Condense',
    icon: Minimize,
    action: 'condense',
    description: 'Make it concise and clear',
    priority: 7
  },
  {
    id: 'outline',
    name: 'Outline',
    icon: FileText,
    action: 'outline',
    description: 'Create a structured outline',
    priority: 6
  },
  {
    id: 'continue',
    name: 'Continue',
    icon: Zap,
    action: 'continue',
    description: 'AI continues your writing',
    priority: 9
  },
  {
    id: 'rewrite',
    name: 'Rewrite',
    icon: Edit3,
    action: 'rewrite',
    description: 'Complete rewrite with style',
    priority: 5
  },
  {
    id: 'voice',
    name: 'Voice',
    icon: Mic,
    action: 'voice-match',
    description: 'Match your writing voice',
    priority: 4
  },
  {
    id: 'focus',
    name: 'Focus',
    icon: Target,
    action: 'focus-improve',
    description: 'Improve clarity and focus',
    priority: 3
  },
  {
    id: 'review',
    name: 'Review',
    icon: BookOpen,
    action: 'review-analyze',
    description: 'Comprehensive review',
    priority: 2
  }
];

export function AISmartCarousel({ onCommand, aiLoading, selectedText, onOpenSettings, className }: AISmartCarouselProps) {
  const { getRankedCommands, recordUsage } = useCommandRanking();
  const [activeIndex, setActiveIndex] = useState(0);
  const [commands, setCommands] = useState<AICommand[]>([]);

  useEffect(() => {
    const rankedCommands = getRankedCommands(ALL_COMMANDS, { selectedText });
    setCommands(rankedCommands.slice(0, 7)); // Show top 7 + More button = 8 total
  }, [selectedText, getRankedCommands]);

  const handleCommand = useCallback((action: string) => {
    recordUsage(action);
    onCommand(action);
  }, [onCommand, recordUsage]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const itemWidth = 120; // Approximate width of each item
    const newIndex = Math.round(container.scrollLeft / itemWidth);
    setActiveIndex(newIndex);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Carousel Container */}
      <div 
        className="flex gap-3 overflow-x-auto scrollbar-hide px-4 py-2 scroll-smooth"
        onScroll={handleScroll}
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* AI Commands */}
        {commands.map((command, index) => {
          const Icon = command.icon;
          const isCenter = index === Math.floor(commands.length / 2);
          const isActive = index === activeIndex;
          
          return (
            <Button
              key={command.id}
              variant={isCenter ? "default" : "outline"}
              size="sm"
              onClick={() => handleCommand(command.action)}
              disabled={aiLoading}
              className={`
                flex-shrink-0 flex flex-col items-center gap-1 h-16 w-24 p-2 transition-all duration-300
                ${isCenter ? 'scale-110 shadow-lg' : 'scale-100'}
                ${isActive ? 'ring-2 ring-primary/20' : ''}
                scroll-snap-align: center;
              `}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium truncate w-full text-center">
                {command.name}
              </span>
            </Button>
          );
        })}
        
        {/* More Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSettings}
          className="flex-shrink-0 flex flex-col items-center gap-1 h-16 w-24 p-2 scroll-snap-align: center;"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="text-xs font-medium">More</span>
        </Button>
      </div>
      
      {/* Context Indicator */}
      {selectedText && (
        <div className="px-4 py-1">
          <div className="text-xs text-muted-foreground text-center">
            {selectedText.length > 50 
              ? `${selectedText.slice(0, 50)}...` 
              : selectedText
            }
          </div>
        </div>
      )}
      
      {/* Scroll Indicators */}
      <div className="flex justify-center gap-1 px-4 py-1">
        {commands.map((_, index) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
              index === activeIndex ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}