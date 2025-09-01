import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useCommandRanking } from '@/hooks/useCommandRanking';
import useEmblaCarousel from 'embla-carousel-react';
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
  const [commands, setCommands] = useState<AICommand[]>([]);
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    align: 'center',
    containScroll: 'trimSnaps',
    dragFree: true,
    slidesToScroll: 1
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const rankedCommands = getRankedCommands(ALL_COMMANDS, { selectedText });
    setCommands(rankedCommands.slice(0, 7)); // Show top 7 + More button = 8 total
  }, [selectedText, getRankedCommands]);

  const handleCommand = useCallback((action: string) => {
    recordUsage(action);
    onCommand(action);
  }, [onCommand, recordUsage]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    onSelect();
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
    
    return () => {
      emblaApi.off('reInit', onSelect);
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className={`w-full ${className}`}>
      {/* Embla Carousel Container */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3 px-4 py-2">
          {/* AI Commands */}
          {commands.map((command, index) => {
            const Icon = command.icon;
            const isSelected = index === selectedIndex;
            const isCenterish = Math.abs(index - selectedIndex) <= 1;
            
            return (
              <div key={command.id} className="flex-[0_0_auto] min-w-0">
                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCommand(command.action)}
                  disabled={aiLoading}
                  className={`
                    flex flex-col items-center gap-1 h-16 w-24 p-2 transition-all duration-300
                    ${isSelected ? 'scale-110 shadow-lg' : isCenterish ? 'scale-105' : 'scale-100'}
                    ${isSelected ? 'ring-2 ring-primary/20' : ''}
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium truncate w-full text-center">
                    {command.name}
                  </span>
                </Button>
              </div>
            );
          })}
          
          {/* More Button */}
          <div className="flex-[0_0_auto] min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSettings}
              className="flex flex-col items-center gap-1 h-16 w-24 p-2 transition-all duration-300"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="text-xs font-medium">More</span>
            </Button>
          </div>
        </div>
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
          <button
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
              index === selectedIndex ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
            onClick={() => emblaApi?.scrollTo(index)}
          />
        ))}
      </div>
    </div>
  );
}