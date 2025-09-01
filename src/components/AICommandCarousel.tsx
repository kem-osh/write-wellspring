import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UnifiedCommand } from '@/types/commands';
import { cn } from '@/lib/utils';

interface AICommandCarouselProps {
  onCommand: (command: UnifiedCommand) => void;
  isLoading?: boolean;
  selectedText?: string;
  className?: string;
}

// SAFE dynamic icon resolver
function CommandIcon({ name, className = "h-4 w-4" }: { name?: string; className?: string }) {
  const IconComponent = (name && (Icons as any)[name]) || Icons.Sparkles;
  return <IconComponent className={className} aria-hidden="true" />;
}

export function AICommandCarousel({ 
  onCommand, 
  isLoading, 
  selectedText, 
  className 
}: AICommandCarouselProps) {
  const { user } = useAuth();
  const { selectionChanged, impactLight } = useHaptics();
  const { toast } = useToast();
  
  const [commands, setCommands] = useState<UnifiedCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredCommand, setHoveredCommand] = useState<string | null>(null);

  useEffect(() => {
    void loadCommands();
  }, [user?.id]);

  const loadCommands = async () => {
    if (!user) {
      setCommands([]);
      return;
    }

    setLoading(true);
    try {
      const { data: dbCommands, error } = await supabase
        .from('user_commands')
        .select('*')
        .eq('user_id', user.id)
        .order('usage_count', { ascending: false })
        .order('sort_order');

      if (error) {
        console.error("Error loading commands:", error);
        toast({ 
          title: "Error", 
          description: "Could not load AI commands.", 
          variant: "destructive" 
        });
        setCommands([]);
        return;
      }

      // Apply context-aware sorting
      const sortedCommands = sortCommandsByContext(dbCommands || [], selectedText);
      setCommands(sortedCommands);
      
    } catch (err) {
      console.error("Failed to load commands:", err);
      setCommands([]);
    } finally {
      setLoading(false);
    }
  };

  // Context-aware command sorting
  const sortCommandsByContext = useCallback((commands: any[], selectedText?: string) => {
    return commands.map(cmd => {
      let contextScore = cmd.usage_count || 0;
      
      // Boost score based on context
      if (selectedText) {
        // Boost editing and style commands when text is selected
        if (['edit', 'style', 'mythology'].includes(cmd.category)) {
          contextScore += 100;
        }
      } else {
        // Boost generation commands when no text is selected
        if (['structure', 'generate'].includes(cmd.category)) {
          contextScore += 50;
        }
      }
      
      return {
        ...cmd,
        contextScore,
        description: cmd.description || cmd.prompt?.substring(0, 50) + '...' || 'Custom command',
        estimated_time: cmd.estimated_time || '3-5s'
      };
    }).sort((a, b) => b.contextScore - a.contextScore);
  }, []);

  const handleCommandClick = async (command: UnifiedCommand) => {
    selectionChanged?.();
    impactLight?.();
    
    // Track usage
    try {
      await supabase
        .from('user_commands')
        .update({ 
          usage_count: (command.usage_count || 0) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', command.id);
    } catch (error) {
      console.error('Failed to update usage count:', error);
    }
    
    onCommand(command);
  };

  // Debounced hover handler to prevent tooltip flicker
  const handleMouseEnter = useCallback((commandId: string) => {
    setTimeout(() => setHoveredCommand(commandId), 150);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCommand(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (commands.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
        No AI commands available
      </div>
    );
  }

  return (
    <div className={cn("relative max-w-2xl", className)}>
      <Carousel
        opts={{
          align: "center",
          loop: true,
          slidesToScroll: 1,
          containScroll: "trimSnaps"
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {commands.slice(0, 12).map((command, index) => (
            <CarouselItem key={command.id} className="pl-2 md:pl-4 basis-1/3 md:basis-1/5 lg:basis-1/7">
              <TooltipProvider>
                <Tooltip open={hoveredCommand === command.id}>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "flex flex-col items-center gap-2 h-16 w-full relative overflow-hidden transition-all duration-200",
                        "hover:scale-105 hover:shadow-md focus:scale-105 focus:shadow-md",
                        isLoading && "opacity-50 cursor-not-allowed",
                        // Visual emphasis based on usage frequency
                        (command.usage_count || 0) > 5 && "ring-1 ring-primary/20 bg-primary/5"
                      )}
                      onClick={() => handleCommandClick(command)}
                      onMouseEnter={() => handleMouseEnter(command.id)}
                      onMouseLeave={handleMouseLeave}
                      disabled={isLoading}
                      aria-label={`${command.name} command`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CommandIcon name={command.icon} className="h-4 w-4" />
                      )}
                      <span className="text-xs font-medium text-center leading-tight truncate w-full">
                        {command.name}
                      </span>
                      {/* Usage indicator for high-frequency commands */}
                      {(command.usage_count || 0) > 10 && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="max-w-xs"
                    sideOffset={8}
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{command.name}</p>
                      <p className="text-sm text-muted-foreground">{command.description}</p>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Est. {command.estimated_time}</span>
                        <span>{selectedText ? 'Selection' : 'Full doc'}</span>
                      </div>
                      {(command.usage_count || 0) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Used {command.usage_count} time{(command.usage_count || 0) !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {commands.length > 7 && (
          <>
            <CarouselPrevious className="hidden md:flex -left-12" />
            <CarouselNext className="hidden md:flex -right-12" />
          </>
        )}
      </Carousel>
    </div>
  );
}