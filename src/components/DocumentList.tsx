import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  MoreHorizontal, 
  Edit2, 
  Copy, 
  Trash2, 
  Download,
  Calendar,
  Hash,
  FolderOpen,
  Check,
  X
} from 'lucide-react';
import { format } from 'date-fns';

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
}

export function DocumentList({
  documents,
  categories,
  currentDocument,
  onDocumentSelect,
  onDocumentUpdate,
  searchQuery = ''
}: DocumentListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { toast } = useToast();

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

  const toggleDocumentSelection = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);

    if (newSelected.size === 0) {
      setIsMultiSelectMode(false);
    }
  };

  const enterMultiSelectMode = (docId: string) => {
    setIsMultiSelectMode(true);
    setSelectedDocs(new Set([docId]));
  };

  const exitMultiSelectMode = () => {
    setIsMultiSelectMode(false);
    setSelectedDocs(new Set());
  };

  const deleteSelectedDocuments = async () => {
    const docIds = Array.from(selectedDocs);
    
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

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <FileText className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
        <h3 className="text-lg font-medium mb-2">
          {searchQuery ? 'No documents found' : 'No documents yet'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {searchQuery 
            ? `No documents match "${searchQuery}". Try different keywords or check your filters.`
            : "Create your first document to get started with LogosScribe."
          }
        </p>
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))}
            className="text-xs"
          >
            Clear search to see all documents
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Multi-select mode header */}
      {isMultiSelectMode && (
        <div className="p-3 bg-muted border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{selectedDocs.size} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteSelectedDocuments}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={exitMultiSelectMode}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {documents.map((doc) => {
            const isSelected = selectedDocs.has(doc.id);
            const isCurrent = currentDocument?.id === doc.id;
            const isEditing = editingId === doc.id;

            return (
              <ContextMenu key={doc.id}>
                <ContextMenuTrigger asChild>
                  <div
                    className={`
                      group relative p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent
                      ${isCurrent ? 'bg-accent border-primary/50' : ''}
                      ${isSelected ? 'bg-primary/10 border-primary' : ''}
                    `}
                    onClick={() => {
                      if (isMultiSelectMode) {
                        toggleDocumentSelection(doc.id);
                      } else if (!isEditing) {
                        onDocumentSelect(doc);
                      }
                    }}
                    onDoubleClick={() => enterMultiSelectMode(doc.id)}
                  >
                    {/* Selection checkbox */}
                    {(isMultiSelectMode || isSelected) && (
                      <div className="absolute top-2 left-2">
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer
                            ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}
                          `}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDocumentSelection(doc.id);
                          }}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                      </div>
                    )}

                    {/* Document content */}
                    <div className={isMultiSelectMode ? 'ml-6' : ''}>
                      {/* Title */}
                      <div className="flex items-center justify-between mb-1">
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveRename();
                                if (e.key === 'Escape') cancelRename();
                              }}
                              onBlur={saveRename}
                              className="h-6 text-sm"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        ) : (
                          <h3 className="font-medium text-sm truncate flex-1">
                            {highlightSearchTerm(doc.title, searchQuery)}
                          </h3>
                        )}

                        {/* Action buttons (visible on hover) */}
                        {!isEditing && !isMultiSelectMode && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                startRename(doc);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(doc.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Content preview */}
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
                        {doc.content.trim() ? (
                          highlightSearchTerm(getPreviewText(doc.content, 80), searchQuery)
                        ) : (
                          <span className="italic opacity-75">No content yet...</span>
                        )}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(doc.updated_at), 'MM/dd')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {formatWordCount(doc.word_count || 0)} words
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Status indicator dot */}
                          <div 
                            className={`w-2 h-2 rounded-full ${
                              doc.status === 'draft' ? 'bg-yellow-500' :
                              doc.status === 'polished' ? 'bg-blue-500' :
                              doc.status === 'final' ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                            title={`Status: ${doc.status}`}
                          />
                          
                          {/* Category badge */}
                          <div className="flex items-center gap-1">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: getCategoryColor(doc.category) }}
                            />
                            <span className="text-xs truncate max-w-16" title={doc.category}>
                              {doc.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ContextMenuTrigger>
                
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => startRename(doc)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Rename
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => duplicateDocument(doc)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => setDeleteConfirmId(doc.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && deleteDocument(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}