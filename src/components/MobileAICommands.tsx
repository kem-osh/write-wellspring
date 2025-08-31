import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { X, Edit, Maximize2, Minimize2, List, Sparkles } from 'lucide-react';
import { CustomShortcuts } from '@/components/CustomShortcuts';

interface MobileAICommandsProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (type: 'light-edit' | 'expand' | 'condense' | 'outline', prompt: string, model?: string, maxTokens?: number) => void;
  aiLoading: boolean;
  selectedText: string;
}

export function MobileAICommands({
  isOpen,
  onClose,
  onCommand,
  aiLoading,
  selectedText
}: MobileAICommandsProps) {

  const handleCommand = (type: 'light-edit' | 'expand' | 'condense' | 'outline', prompt: string, model?: string, maxTokens?: number) => {
    onCommand(type, prompt, model, maxTokens);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-xl">
        <div className="space-y-4 pb-safe">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">AI Commands</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="touch-target"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Selection Info */}
          {selectedText && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Selected text:</p>
              <p className="text-sm line-clamp-2">{selectedText}</p>
            </div>
          )}
          
          {/* Custom Shortcuts Component */}
          <div className="mobile-commands">
            <CustomShortcuts 
              onShortcut={handleCommand}
              isLoading={aiLoading}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}