import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SelectionToolbar } from '@/components/SelectionToolbar';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { DocumentCard } from '@/components/DocumentCard';
import { Input } from '@/components/ui/input';
import { X, FileText, Search, Plus, Filter } from 'lucide-react';
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
  onCompareSelected
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
          <div className="flex items-center justify-between p-5 border-b bg-surface/60 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-heading-lg font-semibold">Documents</h2>
              </div>
              <EnhancedButton
                variant="outline"
                size="icon"
                onClick={onCreateNew}
                className="h-9 w-9 border-border/60 hover:border-primary/60 hover:bg-primary/10 rounded-lg shadow-soft transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
              </EnhancedButton>
            </div>
            <EnhancedButton
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 hover:bg-muted/60 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </EnhancedButton>
          </div>
          
          {/* Enhanced Search and Filters */}
          <div className="p-5 bg-surface/40 border-b space-y-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 bg-background/60 border-border/60 focus:border-primary/60 focus:bg-background/80 focus:shadow-soft transition-all duration-200 rounded-lg"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <EnhancedButton
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 h-9 px-4 rounded-lg transition-all duration-200"
              >
                <Filter className="h-4 w-4" />
                Filters
              </EnhancedButton>
              
              {Object.values(filters).some(v => v !== 'all' && (!Array.isArray(v) || v.length > 0)) && (
                <EnhancedButton
                  variant="ghost"
                  size="sm"
                  onClick={() => onFiltersChange({ category: 'all', status: [], sortBy: 'recent' })}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 px-3 rounded-lg transition-colors"
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
            <div className="p-5 space-y-4 pb-safe">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-28 bg-surface/40 animate-pulse rounded-xl border border-border/30" />
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-16">
                  <div className="p-4 bg-muted/30 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <FileText className="h-10 w-10 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-heading-sm mb-3 font-semibold">
                    {searchQuery ? 'No documents found' : 'No documents yet'}
                  </h3>
                  <p className="text-body-sm text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
                    {searchQuery 
                      ? `No documents match "${searchQuery}". Try different keywords or check your filters.`
                      : "Create your first document to get started with LogosScribe."
                    }
                  </p>
                  <EnhancedButton
                    variant="default"
                    onClick={onCreateNew}
                    className="gap-2 h-11 px-6 rounded-lg shadow-soft"
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