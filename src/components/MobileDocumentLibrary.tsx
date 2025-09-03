import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { SelectionToolbar } from '@/components/SelectionToolbar';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { DocumentCard } from '@/components/DocumentCard';
import type { Document as CardDocument } from '@/components/DocumentCard';
import { Input } from '@/components/ui/input';
import { X, FileText, Search, Plus, Filter, MoreHorizontal } from 'lucide-react';
import { DocumentSearch } from '@/components/DocumentSearch';
import { DocumentFilters } from '@/components/DocumentFilters';
import { BulkDocumentActions } from '@/components/BulkDocumentActions';
import { MoveToFolderDialog } from '@/components/MoveToFolderDialog';

interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  word_count: number;
  folder_id?: string;
  created_at: string;
  updated_at: string;
}

interface MobileDocumentLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
  onDocumentSelect: (doc: CardDocument) => void;
  onCreateNew: () => void;
  onDeleteDocument: (docId: string) => void;
  onDocumentUpdate?: () => void;
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
  onDocumentUpdate,
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
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

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

  const handleDeleteSelected = async () => {
    // Batch delete operation
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .in('id', selectedDocuments);

      if (error) throw error;
      
      // Clear selection after successful delete
      onSelectionChange([]);
      
      // Refresh documents list
      onDocumentUpdate?.();
    } catch (error) {
      console.error('Error deleting documents:', error);
      // Individual fallback
      selectedDocuments.forEach(docId => onDeleteDocument(docId));
      onSelectionChange([]);
    }
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
        side="bottom" 
        className="h-[95vh] p-0 gap-0 bg-background" 
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
              onMoreActions={() => setShowBulkActions(true)}
              className="border-b border-border/20 px-4 py-3 bg-card/50 backdrop-blur-sm"
            />
          )}

          {/* Compact Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/20 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-base font-semibold">Documents</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <EnhancedButton
                variant="outline"
                size="sm"
                onClick={onCreateNew}
                className="h-8 px-3 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 border-0"
              >
                <Plus className="h-3 w-3 mr-1" />
                New
              </EnhancedButton>
              <EnhancedButton
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-muted/60 rounded-lg"
              >
                <X className="h-4 w-4" />
              </EnhancedButton>
            </div>
          </div>
          
          {/* Compact Search and Filters */}
          <div className="p-4 pb-3 bg-muted/10 border-b border-border/20 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 bg-background/80 backdrop-blur-sm border-border/30 focus:border-primary/50 text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <EnhancedButton
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 h-8 px-3 rounded-lg text-xs"
              >
                <Filter className="h-3 w-3" />
                Filters
              </EnhancedButton>
              
              {Object.values(filters).some(v => v !== 'all' && (!Array.isArray(v) || v.length > 0)) && (
                <EnhancedButton
                  variant="ghost"
                  size="sm"
                  onClick={() => onFiltersChange({ category: 'all', status: [], sortBy: 'recent' })}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-3 rounded-lg text-xs"
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
          
          {/* Optimized Document List with smaller cards */}
          <ScrollArea className="flex-1 mobile-scroll">
            <div className="p-3 space-y-2 pb-safe">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 bg-surface/30 animate-pulse rounded-lg border border-border/20" />
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted/30 rounded-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-medium mb-2">
                    {searchQuery ? 'No documents found' : 'No documents yet'}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
                    {searchQuery 
                      ? `No documents match "${searchQuery}". Try different keywords.`
                      : "Create your first document to get started."
                    }
                  </p>
                  <EnhancedButton
                    variant="outline"
                    size="sm"
                    onClick={onCreateNew}
                    className="h-9 px-4 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Document
                  </EnhancedButton>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      layout="list"
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

        {/* Bulk Actions Modal */}
        {showBulkActions && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <BulkDocumentActions
              selectedDocumentIds={selectedDocuments}
              documents={documents.map(doc => ({
                id: doc.id,
                title: doc.title,
                content: doc.content,
                word_count: doc.word_count,
                category: doc.category,
                folder_id: doc.folder_id
              }))}
              onClose={() => setShowBulkActions(false)}
              onAction={(action, result) => {
                if (action === 'move') {
                  setShowBulkActions(false);
                  setShowMoveDialog(true);
                } else {
                  setShowBulkActions(false);
                  onDocumentUpdate?.();
                  if (['delete', 'archive'].includes(action)) {
                    onSelectionChange([]);
                  }
                }
              }}
            />
          </div>
        )}

        {/* Move to Folder Dialog */}
        <MoveToFolderDialog
          isOpen={showMoveDialog}
          onClose={() => setShowMoveDialog(false)}
          documentIds={selectedDocuments}
          onMoveComplete={() => {
            setShowMoveDialog(false);
            onDocumentUpdate?.();
            onSelectionChange([]);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}