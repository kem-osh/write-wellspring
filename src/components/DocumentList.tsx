import { useState, useCallback, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  ContextMenu, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuTrigger,
  ContextMenuSeparator
} from '@/components/ui/context-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  MoreVertical, 
  Edit2, 
  Copy, 
  Trash2, 
  Download,
  Calendar,
  Hash,
  FolderOpen,
  Check,
  X,
  Tag,
  Circle
} from 'lucide-react';
import { format } from 'date-fns';
import { DocumentCard } from './DocumentCard';
import { BulkDocumentActions } from './BulkDocumentActions';
import { MoveToFolderDialog } from './MoveToFolderDialog';

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

interface Category {
  id: string;
  name: string;
  color: string;
}

interface DocumentListProps {
  documents: Document[];
  categories: Category[];
  currentDocument?: Document | null;
  onDocumentSelect: (doc: Document) => void;
  onDocumentUpdate: () => void;
  searchQuery?: string;
  selectedDocuments?: string[];
  onDocumentSelectionChange?: (documentIds: string[]) => void;
  // Pagination props
  hasMore?: boolean;
  loading?: boolean;
  onLoadMore?: () => void;
}

export function DocumentList({
  documents,
  categories,
  currentDocument,
  onDocumentSelect,
  onDocumentUpdate,
  searchQuery = '',
  selectedDocuments = [],
  onDocumentSelectionChange,
  hasMore = false,
  loading = false,
  onLoadMore
}: DocumentListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set(selectedDocuments));
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(selectedDocuments.length > 0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const { toast } = useToast();

  // Sync external selection with internal state
  useEffect(() => {
    setSelectedDocs(new Set(selectedDocuments));
    setIsMultiSelectMode(selectedDocuments.length > 0);
  }, [selectedDocuments]);

  const getCategoryColor = useCallback((categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || '#6B7280';
  }, [categories]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'polished': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'final': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatWordCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const getPreviewText = (content: string, maxLength: number = 60) => {
    const text = content.replace(/\n/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const highlightSearchTerm = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const startRename = (doc: Document) => {
    setEditingId(doc.id);
    setEditingTitle(doc.title);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveRename = async () => {
    if (!editingId || !editingTitle.trim()) return;

    const { error } = await supabase
      .from('documents')
      .update({ title: editingTitle.trim() })
      .eq('id', editingId);

    if (error) {
      toast({
        title: "Error renaming document",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Document renamed",
        description: "Document title has been updated.",
      });
      onDocumentUpdate();
    }

    setEditingId(null);
    setEditingTitle('');
  };

  const duplicateDocument = async (doc: Document) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      toast({
        title: "Error duplicating document",
        description: "Unable to verify user authentication.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('documents')
      .insert([{
        title: `${doc.title} (Copy)`,
        content: doc.content,
        category: doc.category,
        status: 'draft',
        user_id: user.id,
        folder_id: doc.folder_id,
        word_count: doc.word_count
      }]);

    if (error) {
      toast({
        title: "Error duplicating document",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Document duplicated",
        description: "A copy has been created.",
      });
      onDocumentUpdate();
    }
  };

  const deleteDocument = async (docId: string) => {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', docId);

    if (error) {
      toast({
        title: "Error deleting document",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Document deleted",
        description: "Document has been removed.",
      });
      onDocumentUpdate();
    }
    setDeleteConfirmId(null);
  };

  // Enhanced multi-select functionality
  const toggleDocumentSelection = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);

    // Notify parent component of selection change
    const selectedArray = Array.from(newSelected);
    onDocumentSelectionChange?.(selectedArray);

    if (newSelected.size === 0) {
      setIsMultiSelectMode(false);
    } else if (!isMultiSelectMode) {
      setIsMultiSelectMode(true);
    }
  };

  const toggleSelectAll = () => {
    let newSelected: Set<string>;
    if (selectedDocs.size === documents.length) {
      // Deselect all
      newSelected = new Set();
      setIsMultiSelectMode(false);
    } else {
      // Select all
      newSelected = new Set(documents.map(doc => doc.id));
      setIsMultiSelectMode(true);
    }
    setSelectedDocs(newSelected);
    onDocumentSelectionChange?.(Array.from(newSelected));
  };

  const enterMultiSelectMode = (docId?: string) => {
    setIsMultiSelectMode(true);
    if (docId) {
      const newSelected = new Set([docId]);
      setSelectedDocs(newSelected);
      onDocumentSelectionChange?.([docId]);
    }
  };

  const exitMultiSelectMode = () => {
    setIsMultiSelectMode(false);
    setSelectedDocs(new Set());
    setShowBulkActions(false); // Close bulk actions when exiting selection
    onDocumentSelectionChange?.([]);
  };

  // Bulk operations
  const bulkUpdateDocuments = async (updates: Partial<Document>) => {
    const docIds = Array.from(selectedDocs);
    
    const { error } = await supabase
      .from('documents')
      .update(updates)
      .in('id', docIds);

    if (error) {
      toast({
        title: "Error updating documents",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Documents updated",
        description: `${docIds.length} document(s) have been updated.`,
      });
      onDocumentUpdate();
      exitMultiSelectMode();
    }
  };

  const bulkChangeCategory = (category: string) => {
    bulkUpdateDocuments({ category });
  };

  const bulkChangeStatus = (status: string) => {
    bulkUpdateDocuments({ status });
  };

  const bulkDelete = async () => {
    const docIds = Array.from(selectedDocs);
    
    if (!window.confirm(`Delete ${docIds.length} documents? This cannot be undone.`)) {
      return;
    }

    const { error } = await supabase
      .from('documents')
      .delete()
      .in('id', docIds);

    if (error) {
      toast({
        title: "Error deleting documents",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Documents deleted",
        description: `${docIds.length} document(s) have been removed.`,
      });
      onDocumentUpdate();
      exitMultiSelectMode();
    }
  };

  // Individual document operations
  const changeCategory = async (docId: string, category: string) => {
    const { error } = await supabase
      .from('documents')
      .update({ category })
      .eq('id', docId);

    if (error) {
      toast({
        title: "Error updating category",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Category updated",
        description: "Document category has been changed.",
      });
      onDocumentUpdate();
    }
  };

  const changeStatus = async (docId: string, status: string) => {
    const { error } = await supabase
      .from('documents')
      .update({ status })
      .eq('id', docId);

    if (error) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Status updated",
        description: "Document status has been changed.",
      });
      onDocumentUpdate();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitMultiSelectMode();
      } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggleSelectAll();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedDocs.size > 0) {
          e.preventDefault();
          bulkDelete();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedDocs, documents]);

  const deleteSelectedDocuments = async () => {
    bulkDelete();
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* No documents state */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="bg-surface/30 rounded-full p-8 mb-6">
            <FileText className="h-16 w-16 text-muted-foreground/60" />
          </div>
          <h3 className="text-heading-lg font-semibold mb-3 text-foreground">
            {searchQuery ? 'No documents found' : 'No documents yet'}
          </h3>
          <p className="text-body-md text-muted-foreground mb-6 max-w-md leading-relaxed">
            {searchQuery 
              ? `No documents match "${searchQuery}". Try different keywords or check your filters.`
              : "Create your first document to get started with LogosScribe."
            }
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))}
              className="font-medium"
            >
              Clear search to see all documents
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Enhanced bulk actions bar */}
          {isMultiSelectMode && (
            <div className="flex items-center justify-between p-4 bg-surface/60 backdrop-blur-sm border-b border-border/50 shadow-sm rounded-t-lg">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedDocs.size === documents.length}
                  onCheckedChange={toggleSelectAll}
                  className="mr-2"
                />
                <span className="text-body-md font-semibold text-foreground">{selectedDocs.size} selected</span>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Category dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-card hover:bg-secondary/80">
                      <Tag className="w-4 h-4 mr-2" />
                      Category
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border-border shadow-lg">
                    {categories.map((category) => (
                      <DropdownMenuItem 
                        key={category.id} 
                        onClick={() => bulkChangeCategory(category.name)}
                        className="hover:bg-secondary/50"
                      >
                        <Circle 
                          className="w-3 h-3 mr-2" 
                          style={{ color: category.color, fill: category.color }} 
                        />
                        {category.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Status dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-card hover:bg-secondary/80">
                      <Circle className="w-4 h-4 mr-2" />
                      Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border-border shadow-lg">
                    <DropdownMenuItem onClick={() => bulkChangeStatus('draft')} className="hover:bg-secondary/50">
                      <Circle className="w-3 h-3 mr-2 fill-status-draft text-status-draft" /> Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkChangeStatus('polished')} className="hover:bg-secondary/50">
                      <Circle className="w-3 h-3 mr-2 fill-primary text-primary" /> Polished
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkChangeStatus('final')} className="hover:bg-secondary/50">
                      <Circle className="w-3 h-3 mr-2 fill-accent text-accent" /> Final
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Delete all button */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={bulkDelete}
                  className="text-destructive hover:text-destructive bg-card hover:bg-destructive/5 border-destructive/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All
                </Button>
                
                {/* More Actions button */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowBulkActions(true)}
                  className="bg-card hover:bg-secondary/80"
                >
                  <MoreVertical className="w-4 h-4 mr-2" />
                  More Actions
                </Button>
                
                {/* Clear selection button */}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={exitMultiSelectMode}
                  className="hover:bg-secondary/50"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="p-6">
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    isSelected={selectedDocs.has(doc.id)}
                    onSelect={() => {
                      if (isMultiSelectMode) {
                        toggleDocumentSelection(doc.id);
                      } else {
                        onDocumentSelect(doc);
                      }
                    }}
                    onEdit={(doc) => startRename(doc)}
                    onDuplicate={duplicateDocument}
                    onDelete={(docId) => setDeleteConfirmId(docId)}
                    searchQuery={searchQuery}
                    showCheckbox={isMultiSelectMode}
                    onSelectionToggle={toggleDocumentSelection}
                  />
                ))}
              </div>
              
              {/* Load More Button */}
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={onLoadMore}
                    disabled={loading}
                    className="px-8"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                        Loading more documents...
                      </>
                    ) : (
                      'Load More Documents'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-heading-md">Delete Document</AlertDialogTitle>
            <AlertDialogDescription className="text-body-md text-muted-foreground">
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary/50 hover:bg-secondary/80">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && deleteDocument(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Actions Modal */}
      {showBulkActions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <BulkDocumentActions
            selectedDocumentIds={Array.from(selectedDocs)}
            documents={documents}
            onClose={() => setShowBulkActions(false)}
            onAction={(action, result) => {
              if (action === 'move') {
                setShowBulkActions(false);
                setShowMoveDialog(true);
              } else {
                setShowBulkActions(false);
                onDocumentUpdate();
                if (['delete', 'archive'].includes(action)) {
                  exitMultiSelectMode();
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
        documentIds={Array.from(selectedDocs)}
        onMoveComplete={() => {
          setShowMoveDialog(false);
          onDocumentUpdate();
          exitMultiSelectMode();
        }}
      />
    </div>
  );
}