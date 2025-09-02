import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useHaptics } from '@/hooks/useHaptics';
import { useDevice } from '@/hooks/useDevice';
import { 
  CheckSquare, 
  Square, 
  Sparkles, 
  X,
  ArrowRight,
  FileText,
  Clock,
  BarChart3
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  content: string;
  word_count: number;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EnhancedDocumentSelectionProps {
  documents: Document[];
  selectedDocuments: string[];
  onSelectionChange: (selected: string[]) => void;
  onBulkAction: (actionType: string) => void;
  className?: string;
}

export function EnhancedDocumentSelection({
  documents,
  selectedDocuments,
  onSelectionChange,
  onBulkAction,
  className = ""
}: EnhancedDocumentSelectionProps) {
  const [showSelectionMode, setShowSelectionMode] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const { impactLight, selectionChanged } = useHaptics();
  const { isMobile } = useDevice();

  const selectedCount = selectedDocuments.length;
  const totalWords = documents
    .filter(doc => selectedDocuments.includes(doc.id))
    .reduce((sum, doc) => sum + (doc.word_count || 0), 0);

  // Auto-enable selection mode when documents are selected
  useEffect(() => {
    if (selectedCount > 0 && !showSelectionMode) {
      setShowSelectionMode(true);
    } else if (selectedCount === 0 && showSelectionMode) {
      setShowSelectionMode(false);
    }
  }, [selectedCount, showSelectionMode]);

  const toggleDocument = useCallback((documentId: string, index?: number) => {
    const isSelected = selectedDocuments.includes(documentId);
    let newSelection: string[];

    if (isSelected) {
      newSelection = selectedDocuments.filter(id => id !== documentId);
    } else {
      newSelection = [...selectedDocuments, documentId];
    }

    onSelectionChange(newSelection);
    selectionChanged();
    
    if (index !== undefined) {
      setLastSelectedIndex(index);
    }
  }, [selectedDocuments, onSelectionChange, selectionChanged]);

  const toggleSelectAll = useCallback(() => {
    if (selectedCount === documents.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(documents.map(doc => doc.id));
    }
    impactLight();
  }, [selectedCount, documents, onSelectionChange, impactLight]);

  const handleRangeSelection = useCallback((currentIndex: number, documentId: string) => {
    if (lastSelectedIndex !== null && lastSelectedIndex !== currentIndex) {
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeIds = documents.slice(start, end + 1).map(doc => doc.id);
      
      // Add range to selection
      const newSelection = Array.from(new Set([...selectedDocuments, ...rangeIds]));
      onSelectionChange(newSelection);
      selectionChanged();
    } else {
      toggleDocument(documentId, currentIndex);
    }
  }, [lastSelectedIndex, documents, selectedDocuments, onSelectionChange, toggleDocument, selectionChanged]);

  const clearSelection = useCallback(() => {
    onSelectionChange([]);
    setShowSelectionMode(false);
    impactLight();
  }, [onSelectionChange, impactLight]);

  const quickActions = [
    {
      id: 'synthesize',
      label: 'Synthesize',
      icon: Sparkles,
      disabled: selectedCount < 2,
      description: `Combine ${selectedCount} documents`
    },
    {
      id: 'compare',
      label: 'Compare',
      icon: BarChart3,
      disabled: selectedCount < 2,
      description: `Analyze differences`
    },
    {
      id: 'bulk_actions',
      label: 'More Actions',
      icon: ArrowRight,
      disabled: selectedCount === 0,
      description: `${selectedCount} selected`
    }
  ];

  if (!showSelectionMode && selectedCount === 0) {
    return null;
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 ${className}`}>
      {/* Selection Toolbar */}
      <div className="bg-card/95 backdrop-blur-sm border-t border-border/20 shadow-xl">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {/* Selection Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="p-1 hover:bg-muted/60"
              >
                {selectedCount === documents.length ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : selectedCount > 0 ? (
                  <div className="h-4 w-4 bg-primary rounded-sm flex items-center justify-center">
                    <div className="h-2 w-2 bg-primary-foreground rounded-sm" />
                  </div>
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {selectedCount} selected
                </span>
                {totalWords > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {totalWords.toLocaleString()} words
                  </Badge>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="hover:bg-muted/60"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <EnhancedButton
                  key={action.id}
                  variant={action.disabled ? "outline" : "default"}
                  size="sm"
                  onClick={() => onBulkAction(action.id)}
                  disabled={action.disabled}
                  className="flex-shrink-0 text-xs"
                  interactive={!action.disabled}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {action.label}
                </EnhancedButton>
              );
            })}
          </div>

          {/* Selection Tips */}
          {!isMobile && selectedCount > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              <span>Hold Shift and click to select a range • Click checkbox to select individual documents</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom spacing for mobile nav */}
      {isMobile && <div className="h-20" />}
    </div>
  );
}

// Enhanced document card with selection support
interface SelectableDocumentCardProps {
  document: Document;
  index: number;
  isSelected: boolean;
  onToggle: (documentId: string, index: number) => void;
  onRangeSelect?: (index: number, documentId: string) => void;
  showCheckbox?: boolean;
}

export function SelectableDocumentCard({
  document,
  index,
  isSelected,
  onToggle,
  onRangeSelect,
  showCheckbox = false
}: SelectableDocumentCardProps) {
  const { impactLight } = useHaptics();

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey && onRangeSelect) {
      onRangeSelect(index, document.id);
    } else {
      onToggle(document.id, index);
    }
    impactLight();
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (checked !== isSelected) {
      onToggle(document.id, index);
      impactLight();
    }
  };

  return (
    <div className={`group relative transition-all duration-200 ${
      isSelected ? 'ring-2 ring-primary/20 bg-primary/5' : ''
    }`}>
      {/* Selection Checkbox */}
      {(showCheckbox || isSelected) && (
        <div className="absolute top-3 left-3 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            className="bg-background/80 backdrop-blur-sm border-2"
          />
        </div>
      )}

      {/* Document Card Content */}
      <div
        className="p-4 rounded-lg border border-border/20 hover:border-border cursor-pointer transition-all duration-200"
        onClick={handleClick}
      >
        <div className={`${showCheckbox || isSelected ? 'ml-8' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-sm truncate">{document.title}</h3>
            <Badge variant="secondary" className="text-xs">
              {document.category}
            </Badge>
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {document.content.substring(0, 120)}...
          </p>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {document.word_count || 0} words
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(document.updated_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}