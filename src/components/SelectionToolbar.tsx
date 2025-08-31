import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Combine, 
  Trash2, 
  CheckSquare, 
  Square,
  GitCompare,
  Archive,
  Copy
} from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';

interface SelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onSynthesizeSelected: () => void;
  onCompareSelected: () => void;
  onDeleteSelected: () => void;
  onDuplicateSelected?: () => void;
  onArchiveSelected?: () => void;
  className?: string;
}

export function SelectionToolbar({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAll,
  onSynthesizeSelected,
  onCompareSelected,
  onDeleteSelected,
  onDuplicateSelected,
  onArchiveSelected,
  className = ""
}: SelectionToolbarProps) {
  const { impactMedium } = useHaptics();

  const allSelected = selectedCount === totalCount && totalCount > 0;

  const handleSelectToggle = () => {
    impactMedium();
    if (allSelected) {
      onClearSelection();
    } else {
      onSelectAll();
    }
  };

  return (
    <div className={`
      sticky top-0 z-20 bg-primary/95 backdrop-blur-sm text-primary-foreground 
      border-b border-primary/20 animate-in slide-in-from-top-2 duration-200
      ${className}
    `}>
      <div className="flex items-center justify-between p-3 gap-3">
        {/* Left: Selection info and toggle */}
        <div className="flex items-center gap-3">
          <EnhancedButton
            variant="ghost"
            size="sm"
            onClick={handleSelectToggle}
            className="text-primary-foreground hover:bg-primary-foreground/10 p-1 h-8 w-8"
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </EnhancedButton>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary-foreground/10 text-primary-foreground">
              {selectedCount} selected
            </Badge>
            {selectedCount > 0 && (
              <span className="text-sm text-primary-foreground/70">
                of {totalCount}
              </span>
            )}
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          {selectedCount >= 2 && (
            <>
              <EnhancedButton
                variant="ghost"
                size="sm"
                onClick={onSynthesizeSelected}
                className="text-primary-foreground hover:bg-primary-foreground/10 gap-1 h-8 px-3"
              >
                <Combine className="h-4 w-4" />
                <span className="hidden sm:inline">Synthesize</span>
              </EnhancedButton>
              
              <EnhancedButton
                variant="ghost"
                size="sm"
                onClick={onCompareSelected}
                className="text-primary-foreground hover:bg-primary-foreground/10 gap-1 h-8 px-3"
              >
                <GitCompare className="h-4 w-4" />
                <span className="hidden sm:inline">Compare</span>
              </EnhancedButton>
            </>
          )}

          {selectedCount >= 1 && (
            <>
              {onDuplicateSelected && (
                <EnhancedButton
                  variant="ghost"
                  size="sm"
                  onClick={onDuplicateSelected}
                  className="text-primary-foreground hover:bg-primary-foreground/10 gap-1 h-8 px-3"
                >
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Duplicate</span>
                </EnhancedButton>
              )}

              {onArchiveSelected && (
                <EnhancedButton
                  variant="ghost"
                  size="sm" 
                  onClick={onArchiveSelected}
                  className="text-primary-foreground hover:bg-primary-foreground/10 gap-1 h-8 px-3"
                >
                  <Archive className="h-4 w-4" />
                  <span className="hidden sm:inline">Archive</span>
                </EnhancedButton>
              )}
              
              <EnhancedButton
                variant="ghost"
                size="sm"
                onClick={onDeleteSelected}
                className="text-red-200 hover:bg-red-500/20 hover:text-red-100 gap-1 h-8 px-3"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </EnhancedButton>
            </>
          )}

          <EnhancedButton
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-primary-foreground hover:bg-primary-foreground/10 p-1 h-8 w-8 ml-2"
          >
            <X className="h-4 w-4" />
          </EnhancedButton>
        </div>
      </div>
    </div>
  );
}