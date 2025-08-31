import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, FileText, Search, Plus } from 'lucide-react';
import { DocumentSearch } from '@/components/DocumentSearch';
import { DocumentFilters } from '@/components/DocumentFilters';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

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
  loading
}: MobileDocumentLibraryProps) {
  const [swipedItem, setSwipedItem] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const DocumentItem = ({ doc }: { doc: Document }) => {
    const swipeGesture = useSwipeGesture({
      onSwipeLeft: () => setSwipedItem(doc.id),
      onSwipeRight: () => setSwipedItem(null)
    });

    return (
      <div className="relative">
        <div
          {...swipeGesture}
          className={`transition-transform duration-200 ${
            swipedItem === doc.id ? 'translate-x-[-80px]' : ''
          }`}
        >
          <button
            onClick={() => {
              onDocumentSelect(doc);
              onClose();
            }}
            className="w-full p-4 bg-card rounded-lg border text-left touch-target"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{doc.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span>{formatDate(doc.updated_at)}</span>
                  <span>•</span>
                  <span>{doc.word_count} words</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {doc.content.substring(0, 100)}...
                </p>
              </div>
              <FileText className="h-4 w-4 ml-2 text-muted-foreground flex-shrink-0" />
            </div>
          </button>
        </div>
        
        {/* Delete action revealed on swipe */}
        {swipedItem === doc.id && (
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onDeleteDocument(doc.id);
                setSwipedItem(null);
              }}
              className="text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-full sm:max-w-full p-0 mobile-sheet">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Documents</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCreateNew}
                className="touch-target"
              >
                <Plus className="h-4 w-4" />
              </Button>
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
          
          {/* Search and Filters */}
          <div className="p-4 border-b space-y-3">
            <DocumentSearch 
              onSearch={onSearchChange}
              onClear={() => onSearchChange('')}
              isLoading={loading}
            />
            <DocumentFilters
              initialFilters={filters}
              onFiltersChange={onFiltersChange}
            />
          </div>
          
          {/* Document List */}
          <ScrollArea className="flex-1 mobile-scroll">
            <div className="p-4 space-y-3 pb-safe">
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No documents found</p>
                  <Button
                    variant="outline"
                    onClick={onCreateNew}
                    className="mt-4"
                  >
                    Create your first document
                  </Button>
                </div>
              ) : (
                documents.map(doc => (
                  <DocumentItem key={doc.id} doc={doc} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}