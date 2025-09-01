import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SelectionToolbar } from '@/components/SelectionToolbar';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { DocumentCard } from '@/components/DocumentCard';
import { Input } from '@/components/ui/input';
import { X, FileText, Search, Plus, Filter, Expand } from 'lucide-react';
import { DocumentSearch } from '@/components/DocumentSearch';
import { DocumentFilters } from '@/components/DocumentFilters';

interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

interface MobileDocumentLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
  onDocumentSelect: (doc: Document) => void;
  onCreateNew: () => void;
  onDeleteDocument: (docId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: any;
  onFiltersChange: (filters: any) => void;
  categories: any[];
  loading: boolean;
  selectedDocuments: string[];
  onSelectionChange: (selected: string[]) => void;
  onSynthesizeSelected: () => void;
  onCompareSelected: () => void;
  expanded?: boolean;
  onExpandToggle?: () => void;
}

export function MobileDocumentLibrary({
  isOpen,
  onClose,
  documents,
  onDocumentSelect,
  onCreateNew,
  onDeleteDocument,
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  categories,
  loading,
  selectedDocuments,
  onSelectionChange,
  onSynthesizeSelected,
  onCompareSelected,
  expanded,
  onExpandToggle
}: MobileDocumentLibraryProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Swipe to close gesture
  const swipeHandlers = useSwipeGesture({
    onSwipeRight: onClose,
    threshold: 50
  });

  const hasSelection = selectedDocuments.length > 0;

  const handleSelectAll = () => {
    if (selectedDocuments.length === documents.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(documents.map(doc => doc.id));
    }
  };

  const handleClearSelection = () => {
    onSelectionChange([]);
  };

  const handleDeleteSelected = () => {
    selectedDocuments.forEach(docId => onDeleteDocument(docId));
    onSelectionChange([]);
  };

  const handleDocumentSelectionToggle = (documentId: string) => {
    const isSelected = selectedDocuments.includes(documentId);
    if (isSelected) {
      onSelectionChange(selectedDocuments.filter(id => id !== documentId));
    } else {
      onSelectionChange([...selectedDocuments, documentId]);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="left" 
        className="w-[80vw] max-w-sm p-0 mobile-sheet data-[state=open]:slide-in-from-left-0" 
        {...swipeHandlers}
      >
        <div className="flex flex-col h-full bg-background">
          {/* Selection Toolbar */}
          {hasSelection && (
            <SelectionToolbar
              selectedCount={selectedDocuments.length}
              totalCount={documents.length}
              onClearSelection={handleClearSelection}
              onSelectAll={handleSelectAll}
              onSynthesizeSelected={onSynthesizeSelected}
              onCompareSelected={onCompareSelected}
              onDeleteSelected={handleDeleteSelected}
            />
          )}
          {/* Enhanced Header */}
          <div className="flex items-center justify-between p-4 border-b bg-surface/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-heading-lg">Documents</h2>
              </div>
              <EnhancedButton
                variant="outline"
                size="icon"
                onClick={onCreateNew}
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </EnhancedButton>
            </div>
            <div className="flex items-center gap-1">
              {onExpandToggle && (
                <EnhancedButton
                  variant="ghost"
                  size="icon"
                  onClick={onExpandToggle}
                  className="h-8 w-8"
                  title="Expand to Full Screen"
                >
                  <Expand className="h-4 w-4" />
                </EnhancedButton>
              )}
              <EnhancedButton
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-5 w-5" />
              </EnhancedButton>
            </div>
          </div>
          
          {/* Enhanced Search and Filters */}
          <div className="p-4 bg-surface/30 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 bg-background border-border focus:border-primary transition-colors"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <EnhancedButton
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </EnhancedButton>
              
              {Object.values(filters).some(v => v !== 'all' && (!Array.isArray(v) || v.length > 0)) && (
                <EnhancedButton
                  variant="ghost"
                  size="sm"
                  onClick={() => onFiltersChange({ category: 'all', status: [], sortBy: 'recent' })}
                  className="text-destructive hover:text-destructive"
                >
                  Clear
                </EnhancedButton>
              )}
            </div>

            {showFilters && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <DocumentFilters
                  initialFilters={filters}
                  onFiltersChange={onFiltersChange}
                />
              </div>
            )}
          </div>
          
          {/* Enhanced Document List */}
          <ScrollArea className="flex-1 mobile-scroll">
            <div className="p-4 space-y-4 pb-safe">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-heading-sm mb-2">
                    {searchQuery ? 'No documents found' : 'No documents yet'}
                  </h3>
                  <p className="text-body-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    {searchQuery 
                      ? `No documents match "${searchQuery}". Try different keywords or check your filters.`
                      : "Create your first document to get started with LogosScribe."
                    }
                  </p>
                  <EnhancedButton
                    variant="default"
                    onClick={onCreateNew}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Document
                  </EnhancedButton>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      isSelected={selectedDocuments.includes(doc.id)}
                      onSelect={(doc) => {
                        onDocumentSelect(doc);
                        onClose();
                      }}
                      onDelete={onDeleteDocument}
                      searchQuery={searchQuery}
                      compact={true}
                      showCheckbox={true}
                      onSelectionToggle={handleDocumentSelectionToggle}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}