import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UnifiedCommand } from '@/types/commands';
import { cn } from '@/lib/utils';

interface AICommandPaletteProps {
  onCommand: (command: UnifiedCommand) => void;
  isLoading?: boolean;
  selectedText?: string;
  trigger?: React.ReactNode;
}

// Command icon resolver
function CommandIcon({ name, className = "h-4 w-4" }: { name?: string; className?: string }) {
  const IconComponent = (name && (Icons as any)[name]) || Icons.Sparkles;
  return <IconComponent className={className} aria-hidden="true" />;
}

// Simple fuzzy search function
const fuzzySearch = (query: string, text: string): boolean => {
  const queryChars = query.toLowerCase().split('');
  const textLower = text.toLowerCase();
  let textIndex = 0;
  
  for (const char of queryChars) {
    const foundIndex = textLower.indexOf(char, textIndex);
    if (foundIndex === -1) return false;
    textIndex = foundIndex + 1;
  }
  return true;
};

export function AICommandPalette({ 
  onCommand, 
  isLoading, 
  selectedText,
  trigger 
}: AICommandPaletteProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [commands, setCommands] = useState<UnifiedCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load commands when palette opens
  useEffect(() => {
    if (open && commands.length === 0) {
      void loadCommands();
    }
  }, [open]);

  // Keyboard shortcut (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        .order('category')
        .order('name');

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

      // Process commands with context-aware sorting
      const processedCommands = (dbCommands || []).map(cmd => ({
        ...cmd,
        description: cmd.description || cmd.prompt?.substring(0, 50) + '...' || 'Custom command',
        estimated_time: cmd.estimated_time || '3-5s'
      }));

      setCommands(processedCommands);
      
    } catch (err) {
      console.error("Failed to load commands:", err);
      setCommands([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCommandSelect = async (command: UnifiedCommand) => {
    setOpen(false);
    setSearchQuery('');
    
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

  // Filter and group commands
  const filteredCommands = commands.filter(cmd => {
    if (!searchQuery.trim()) return true;
    
    return fuzzySearch(searchQuery, cmd.name) || 
           fuzzySearch(searchQuery, cmd.category || '') ||
           fuzzySearch(searchQuery, cmd.description || '');
  });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((groups, command) => {
    const category = command.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(command);
    return groups;
  }, {} as Record<string, UnifiedCommand[]>);

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      className="h-9 px-3 gap-2 text-muted-foreground"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Search commands...</span>
      <span className="sm:hidden">Search</span>
      <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        side="top" 
        align="end"
        sideOffset={8}
      >
        <Command className="rounded-lg border shadow-md">
          <CommandInput 
            placeholder="Search AI commands..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-9"
          />
          <CommandList className="max-h-80">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <div className="py-6 text-center text-sm">
                    <p className="text-muted-foreground">No commands found.</p>
                    {searchQuery && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Try adjusting your search terms.
                      </p>
                    )}
                  </div>
                </CommandEmpty>
                
                {Object.entries(groupedCommands).map(([category, categoryCommands]) => (
                  <CommandGroup key={category} heading={category.charAt(0).toUpperCase() + category.slice(1)}>
                    {categoryCommands.map((command) => (
                      <CommandItem
                        key={command.id}
                        value={`${command.name} ${command.category} ${command.description}`}
                        onSelect={() => handleCommandSelect(command)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 cursor-pointer",
                          "hover:bg-accent hover:text-accent-foreground",
                          isLoading && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={isLoading}
                      >
                        <CommandIcon name={command.icon} className="h-4 w-4 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{command.name}</span>
                            {(command.usage_count || 0) > 0 && (
                              <span className="text-xs text-muted-foreground ml-2 shrink-0">
                                {command.usage_count}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {command.description}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}