import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  Wand2, 
  GitCompare, 
  BarChart3, 
  Download, 
  Copy, 
  Archive, 
  Trash2,
  ChevronUp,
  Menu,
  FileText,
  Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBulkActionsProps {
  selectedCount: number;
  totalWords: number;
  onAction: (actionId: string) => void;
  onClear: () => void;
}

interface BulkAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  color: string;
}

export function MobileBulkActions({
  selectedCount,
  totalWords,
  onAction,
  onClear
}: MobileBulkActionsProps) {
  const [showActions, setShowActions] = useState(false);

  const actions: BulkAction[] = [
    {
      id: 'synthesize',
      label: 'Synthesize',
      icon: Wand2,
      variant: 'default',
      color: 'text-primary'
    },
    {
      id: 'compare',
      label: 'Compare',
      icon: GitCompare,
      variant: 'secondary',
      color: 'text-blue-600'
    },
    {
      id: 'analyze',
      label: 'Analyze',
      icon: BarChart3,
      variant: 'secondary',
      color: 'text-purple-600'
    },
    {
      id: 'export',
      label: 'Export',
      icon: Download,
      variant: 'outline',
      color: 'text-green-600'
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      variant: 'outline',
      color: 'text-orange-600'
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      variant: 'outline',
      color: 'text-gray-600'
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive',
      color: 'text-red-600'
    }
  ];

  if (selectedCount === 0) return null;

  return (
    <>
      {/* Mobile Floating Action Button */}
      <div className="md:hidden fixed bottom-20 right-4 z-50">
        <Sheet open={showActions} onOpenChange={setShowActions}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg relative"
              onClick={() => setShowActions(true)}
            >
              <Menu className="h-6 w-6" />
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {selectedCount}
              </Badge>
            </Button>
          </SheetTrigger>
          
          <SheetContent side="bottom" className="h-[70vh]">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center justify-between">
                <span>Bulk Actions</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClear}
                  className="text-muted-foreground"
                >
                  Clear Selection
                </Button>
              </SheetTitle>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {selectedCount} documents
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="w-4 h-4" />
                  {totalWords.toLocaleString()} words
                </span>
              </div>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant={action.variant}
                    size="lg"
                    onClick={() => {
                      onAction(action.id);
                      setShowActions(false);
                    }}
                    className={cn(
                      "h-16 flex flex-col gap-2 text-xs font-medium",
                      action.variant === 'destructive' && "hover:bg-destructive hover:text-destructive-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{action.label}</span>
                  </Button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Slide-up Panel */}
      <div className="hidden md:block">
        <div 
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-out",
            selectedCount > 0 ? "translate-y-0" : "translate-y-full"
          )}
        >
          <Card className="bg-card/95 backdrop-blur-lg border-t shadow-2xl m-4 rounded-t-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Bulk Actions</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {selectedCount} documents
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-4 h-4" />
                      {totalWords.toLocaleString()} words
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={onClear}>
                    Clear Selection
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowActions(!showActions)}
                  >
                    <ChevronUp 
                      className={cn(
                        "h-4 w-4 transition-transform",
                        showActions ? "rotate-180" : ""
                      )} 
                    />
                  </Button>
                </div>
              </div>

              <div 
                className={cn(
                  "grid grid-cols-4 lg:grid-cols-7 gap-2 transition-all duration-200",
                  showActions ? "max-h-32 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
                )}
              >
                {actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant={action.variant}
                      size="sm"
                      onClick={() => onAction(action.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 h-auto p-3 text-xs",
                        action.variant === 'destructive' && "hover:bg-destructive hover:text-destructive-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="truncate max-w-full">{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}