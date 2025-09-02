import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  MoreVertical, 
  PenTool, 
  RefreshCw, 
  CheckCircle, 
  Combine, 
  GitCompare,
  FileText,
  Sparkles,
  Settings
} from 'lucide-react';
import { useDevice } from '@/hooks/useDevice';

interface CompactMoreCommandsProps {
  selectedDocuments: string[];
  onContinue: () => void;
  onRewrite: () => void;
  onFactCheck: () => void;
  onSynthesize: () => void;
  onCompare: () => void;
  onViewAllCommands: () => void;
  isLoading: boolean;
}

export function CompactMoreCommands({
  selectedDocuments,
  onContinue,
  onRewrite,
  onFactCheck,
  onSynthesize,
  onCompare,
  onViewAllCommands,
  isLoading
}: CompactMoreCommandsProps) {
  const { isMobile } = useDevice();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleAction = (action: () => void) => {
    action();
    setPopoverOpen(false);
    setSheetOpen(false);
  };

  const quickCommands = [
    {
      icon: PenTool,
      label: 'Continue',
      action: onContinue,
      description: 'Continue writing from cursor'
    },
    {
      icon: RefreshCw,
      label: 'Rewrite',
      action: onRewrite,
      description: 'Rewrite selected text'
    },
    {
      icon: CheckCircle,
      label: 'Fact Check',
      action: onFactCheck,
      description: 'Check against your documents'
    },
    {
      icon: Sparkles,
      label: 'Analyze',
      action: onFactCheck, // Same as fact check for now
      description: 'Analyze content patterns'
    }
  ];

  const multiDocCommands = selectedDocuments.length > 1 ? [
    {
      icon: Combine,
      label: `Synthesize (${selectedDocuments.length})`,
      action: onSynthesize,
      description: 'Combine selected documents'
    },
    {
      icon: GitCompare,
      label: 'Compare',
      action: onCompare,
      description: 'Analyze differences'
    }
  ] : [];

  const content = (
    <div className="w-72 p-1">
      <div className="grid gap-1">
        {quickCommands.map((command) => {
          const Icon = command.icon;
          return (
            <Button
              key={command.label}
              variant="ghost"
              size="sm"
              onClick={() => handleAction(command.action)}
              disabled={isLoading}
              className="justify-start h-10 px-3 text-left"
            >
              <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{command.label}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {command.description}
                </div>
              </div>
            </Button>
          );
        })}
        
        {multiDocCommands.length > 0 && (
          <>
            <div className="h-px bg-border my-1" />
            {multiDocCommands.map((command) => {
              const Icon = command.icon;
              return (
                <Button
                  key={command.label}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction(command.action)}
                  disabled={isLoading}
                  className="justify-start h-10 px-3 text-left"
                >
                  <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{command.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {command.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </>
        )}
        
        <div className="h-px bg-border my-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAction(onViewAllCommands)}
          className="justify-start h-10 px-3 text-left"
        >
          <Settings className="w-4 h-4 mr-3 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium">View All Commands</div>
            <div className="text-xs text-muted-foreground truncate">
              Customize and manage commands
            </div>
          </div>
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>AI Commands</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0">
        {content}
      </PopoverContent>
    </Popover>
  );
}