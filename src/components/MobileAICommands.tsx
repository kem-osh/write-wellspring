import { Sheet, SheetContent } from '@/components/ui/sheet';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Card, CardContent } from '@/components/ui/enhanced-card';
import { Badge } from '@/components/ui/badge';
import { X, Sparkles, Zap, Loader2, Clock } from 'lucide-react';
import { CustomShortcuts } from '@/components/CustomShortcuts';
import { UnifiedCommand } from '@/types/commands';

interface MobileAICommandsProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (command: UnifiedCommand, selectedText?: string) => void;
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

  const handleCommand = (command: UnifiedCommand, selectedText?: string) => {
    onCommand(command, selectedText);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl border-t-0 bg-background overflow-y-auto overscroll-contain">
        <div className="space-y-6 pb-safe pt-2">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-ai-button/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-ai-button" />
              </div>
              <div>
                <h3 className="text-heading-lg">AI Assistant</h3>
                <p className="text-body-sm text-muted-foreground">
                  Enhance your writing with AI
                </p>
              </div>
            </div>
            <EnhancedButton
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </EnhancedButton>
          </div>

          {/* Selection Info Card */}
          {selectedText && (
            <Card variant="surface" className="border-l-4 border-l-primary">
              <CardContent padding="sm">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-primary/10 rounded">
                    <Zap className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-muted-foreground mb-1">Selected text:</p>
                    <p className="text-body-sm line-clamp-3 bg-muted/50 p-2 rounded text-foreground">
                      "{selectedText.length > 150 ? selectedText.substring(0, 150) + '...' : selectedText}"
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedText.split(' ').length} words selected
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* AI Status */}
          {aiLoading && (
            <Card variant="surface">
              <CardContent padding="sm">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-ai-button" />
                  <div className="flex-1">
                    <p className="text-body-sm font-medium">Processing...</p>
                    <p className="text-body-sm text-muted-foreground">AI is analyzing your content</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>2-5s</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Enhanced Custom Shortcuts with Categories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-heading-sm">AI Commands</h4>
              <Badge variant="outline" className="text-xs">
                {selectedText ? 'Selection' : 'Full Document'}
              </Badge>
            </div>
            
            <div className="mobile-commands">
              <CustomShortcuts 
                onShortcut={handleCommand}
                isLoading={aiLoading}
                selectedText={selectedText}
                isMobile={true}
              />
            </div>
          </div>

          {/* Enhanced Tips */}
          <Card variant="ghost" className="bg-accent/5 border-accent/20">
            <CardContent padding="sm">
              <div className="flex items-start gap-3">
                <div className="p-1 bg-accent/10 rounded">
                  <Sparkles className="h-3 w-3 text-accent" />
                </div>
                <div>
                  <p className="text-body-sm font-medium text-accent-foreground">Pro Tips</p>
                  <div className="text-body-sm text-muted-foreground space-y-1 mt-1">
                    <p>• Select text for precise edits</p>
                    <p>• Use keyboard shortcuts (Ctrl+L for Light Polish)</p>
                    <p>• Analyze gives detailed feedback</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}