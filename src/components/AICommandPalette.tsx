import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Search, Zap } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UnifiedCommand } from '@/types/commands';

interface AICommandPaletteProps {
  onCommandSelect: (command: UnifiedCommand) => void;
  selectedText?: string;
  isLoading?: boolean;
  trigger?: React.ReactNode;
}

// Safe icon resolver with fallback
function CommandIcon({ name, className = "h-4 w-4" }: { name?: string; className?: string }) {
  const IconComponent = (name && (Icons as any)[name]) || Sparkles;
  return <IconComponent className={className} aria-hidden="true" />;
}

// Fuzzy search function
function fuzzySearch(query: string, text: string): boolean {
  if (!query) return true;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact substring match gets priority
  if (textLower.includes(queryLower)) return true;
  
  // Fuzzy match - check if all query characters appear in order
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length;
}

// Default trigger button
const DefaultTrigger = ({ selectedText }: { selectedText?: string }) => (
  <Button variant="ghost" size="sm" className="gap-2">
    <Zap className="h-4 w-4" />
    AI Commands
    {selectedText && (
      <Badge variant="secondary" className="ml-2 text-xs">
        Selection
      </Badge>
    )}
  </Button>
);

export function AICommandPalette({ 
  onCommandSelect, 
  selectedText, 
  isLoading,
  trigger 
}: AICommandPaletteProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [commands, setCommands] = useState<UnifiedCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // If no trigger provided, render command content directly (for mobile sheets)
  const isDirectRender = !trigger;

  // Load commands when dialog opens or component mounts (for direct render)
  const loadCommands = useCallback(async () => {
    if (!user || commands.length > 0) return; // Use cache if available
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_commands')
        .select('*')
        .eq('user_id', user.id)
        .order('category')
        .order('sort_order');

      if (error) throw error;

      const unifiedCommands: UnifiedCommand[] = (data || []).map((cmd: any) => ({
        ...cmd,
        description: cmd.description || cmd.prompt?.substring(0, 100) + '...' || 'Custom command',
        estimated_time: cmd.estimated_time || '3-5s'
      }));

      setCommands(unifiedCommands);
      console.log(`[AICommandPalette] Loaded ${unifiedCommands.length} commands`);
    } catch (error) {
      console.error('Failed to load commands:', error);
      toast({
        title: "Failed to load commands",
        description: "Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, commands.length, toast]);

  // Load commands on mount for direct render, or when dialog opens
  useEffect(() => {
    if (isDirectRender) {
      loadCommands();
    }
  }, [isDirectRender, loadCommands]);

  // Debounced search with useMemo
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return commands;
    
    return commands.filter(command => {
      const searchableText = [
        command.name,
        command.description || '',
        command.category || '',
        command.prompt || ''
      ].join(' ');
      
      return fuzzySearch(searchQuery, searchableText);
    });
  }, [commands, searchQuery]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, UnifiedCommand[]> = {};
    
    filteredCommands.forEach(command => {
      const category = command.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(command);
    });
    
    // Sort groups by priority
    const categoryOrder = ['edit', 'structure', 'analyze', 'mythology', 'style', 'utility'];
    const sortedGroups: [string, UnifiedCommand[]][] = [];
    
    categoryOrder.forEach(cat => {
      if (groups[cat]) {
        sortedGroups.push([cat, groups[cat]]);
      }
    });
    
    // Add remaining categories
    Object.entries(groups).forEach(([cat, cmds]) => {
      if (!categoryOrder.includes(cat)) {
        sortedGroups.push([cat, cmds]);
      }
    });
    
    return sortedGroups;
  }, [filteredCommands]);

  // Handle command selection
  const handleCommandSelect = (command: UnifiedCommand) => {
    if (!isDirectRender) {
      setOpen(false);
      setSearchQuery(''); // Reset search
    }
    onCommandSelect(command);
  };

  // Handle dialog open
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      loadCommands();
    } else {
      setSearchQuery(''); // Reset search when closing
    }
  };

  // Keyboard shortcut (Cmd+K / Ctrl+K) - only for dialog mode
  useEffect(() => {
    if (isDirectRender) return; // No keyboard shortcuts in direct render mode
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDirectRender]);

  // Capitalize category names
  const formatCategoryName = (category: string): string => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Command content component
  const CommandContent = () => (
    <Command shouldFilter={false} className="w-80">
      <CommandInput
        placeholder="Search AI commands..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      
      <CommandList className="max-h-96">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading commands...</span>
          </div>
        ) : (
          <>
            <CommandEmpty>
              <div className="text-center p-4">
                <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No commands found matching "{searchQuery}"
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different search term or check your spelling
                </p>
              </div>
            </CommandEmpty>

            {groupedCommands.map(([category, categoryCommands]) => (
              <CommandGroup key={category} heading={formatCategoryName(category)}>
                {categoryCommands.map((command) => (
                  <CommandItem
                    key={command.id}
                    value={`${command.name} ${command.description} ${command.category}`}
                    onSelect={() => handleCommandSelect(command)}
                    className="flex items-center gap-3 p-3 cursor-pointer"
                    disabled={isLoading}
                  >
                    <CommandIcon name={command.icon} className="h-4 w-4 text-muted-foreground" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{command.name}</span>
                        {isLoading && (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {command.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{command.estimated_time}</span>
                      {selectedText && (
                        <Badge variant="secondary" className="text-xs">
                          Selection
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </>
        )}
      </CommandList>
    </Command>
  );

  // Direct render mode (for mobile sheets)
  if (isDirectRender) {
    return <CommandContent />;
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {trigger || <DefaultTrigger selectedText={selectedText} />}
      </PopoverTrigger>
      
      <PopoverContent 
        side="top" 
        align="end" 
        className="w-80 p-0 shadow-lg border"
        onOpenAutoFocus={(e) => {
          // Prevent auto-focus on popover open to avoid keyboard jumping
          e.preventDefault();
          // Focus the search input instead
          setTimeout(() => {
            const input = (e.currentTarget as HTMLElement).querySelector('input');
            input?.focus();
          }, 0);
        }}
      >
        <CommandContent />
      </PopoverContent>
    </Popover>
  );
}