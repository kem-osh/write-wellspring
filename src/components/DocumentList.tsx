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

  // Enhanced multi-select functionality
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
    } else if (!isMultiSelectMode) {
      setIsMultiSelectMode(true);
    }
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === documents.length) {
      // Deselect all
      setSelectedDocs(new Set());
      setIsMultiSelectMode(false);
    } else {
      // Select all
      const allIds = new Set(documents.map(doc => doc.id));
      setSelectedDocs(allIds);
      setIsMultiSelectMode(true);
    }
  };

  const enterMultiSelectMode = (docId?: string) => {
    setIsMultiSelectMode(true);
    if (docId) {
      setSelectedDocs(new Set([docId]));
    }
  };

  const exitMultiSelectMode = () => {
    setIsMultiSelectMode(false);
    setSelectedDocs(new Set());
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
      {/* Enhanced bulk actions bar */}
      {isMultiSelectMode && (
        <div className="flex items-center justify-between p-3 bg-muted border-b">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedDocs.size === documents.length}
              onCheckedChange={toggleSelectAll}
              className="mr-1"
            />
            <span className="text-sm font-medium">{selectedDocs.size} selected</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Category dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Tag className="w-4 h-4 mr-2" />
                  Category
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="z-[60] bg-card">
                <DropdownMenuItem onClick={() => bulkChangeCategory('General')}>General</DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkChangeCategory('Blog')}>Blog</DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkChangeCategory('Book')}>Book</DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkChangeCategory('Essay')}>Essay</DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkChangeCategory('Notes')}>Notes</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Status dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Circle className="w-4 h-4 mr-2" />
                  Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="z-[60] bg-card">
                <DropdownMenuItem onClick={() => bulkChangeStatus('draft')}>
                  <Circle className="w-3 h-3 mr-2 fill-yellow-400 text-yellow-400" /> Draft
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkChangeStatus('polished')}>
                  <Circle className="w-3 h-3 mr-2 fill-blue-400 text-blue-400" /> Polished
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkChangeStatus('final')}>
                  <Circle className="w-3 h-3 mr-2 fill-green-400 text-green-400" /> Final
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Delete all button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={bulkDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </Button>
            
            {/* Clear selection button */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={exitMultiSelectMode}
            >
              Clear
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
                       group relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer 
                       transition-all hover:bg-accent
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
                   >
                     {/* Selection checkbox (visible on hover or in multi-select mode) */}
                     <div className={`flex-shrink-0 transition-opacity ${
                       isMultiSelectMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                     }`}>
                       <Checkbox
                         checked={isSelected}
                         onCheckedChange={() => toggleDocumentSelection(doc.id)}
                         onClick={(e) => e.stopPropagation()}
                       />
                     </div>

                     {/* Document content - flexible container */}
                     <div className="flex-1 min-w-0 overflow-hidden">
                       {/* Title row with proper truncation */}
                       <div className="mb-1">
                         {isEditing ? (
                           <Input
                             value={editingTitle}
                             onChange={(e) => setEditingTitle(e.target.value)}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') saveRename();
                               if (e.key === 'Escape') cancelRename();
                             }}
                             onBlur={saveRename}
                             className="h-6 text-sm w-full"
                             autoFocus
                             onClick={(e) => e.stopPropagation()}
                           />
                         ) : (
                           <TooltipProvider>
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <h3 className="font-medium text-sm overflow-hidden text-ellipsis whitespace-nowrap block">
                                   {highlightSearchTerm(doc.title, searchQuery)}
                                 </h3>
                               </TooltipTrigger>
                               {doc.title.length > 40 && (
                                 <TooltipContent>
                                   <p className="max-w-xs">{doc.title}</p>
                                 </TooltipContent>
                               )}
                             </Tooltip>
                           </TooltipProvider>
                         )}
                       </div>

                       {/* Content preview with proper truncation */}
                       <p className="text-xs text-muted-foreground mb-2 overflow-hidden text-ellipsis whitespace-nowrap leading-relaxed">
                         {doc.content.trim() ? (
                           highlightSearchTerm(getPreviewText(doc.content, 50), searchQuery)
                         ) : (
                           <span className="italic opacity-75">No content yet...</span>
                         )}
                       </p>

                       {/* Metadata row with flex wrap for responsiveness */}
                       <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                         <span className="flex items-center gap-1 flex-shrink-0">
                           <Calendar className="h-3 w-3" />
                           {format(new Date(doc.updated_at), 'MM/dd')}
                         </span>
                         <span className="flex items-center gap-1 flex-shrink-0">
                           <Hash className="h-3 w-3" />
                           {formatWordCount(doc.word_count || 0)} words
                         </span>
                         
                         {/* Status dot */}
                         <div className="flex items-center gap-1 flex-shrink-0">
                           <div 
                             className={`w-2 h-2 rounded-full ${
                               doc.status === 'draft' ? 'bg-yellow-500' :
                               doc.status === 'polished' ? 'bg-blue-500' :
                               doc.status === 'final' ? 'bg-green-500' : 'bg-gray-400'
                             }`}
                           />
                           <span className="capitalize">{doc.status}</span>
                         </div>
                         
                         {/* Category badge */}
                         <div className="flex items-center gap-1 flex-shrink-0">
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

                     {/* Three-dot menu - always visible and accessible */}
                     {!isEditing && (
                       <div className={`flex-shrink-0 transition-opacity ${
                         isMultiSelectMode ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
                       }`}>
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button
                               variant="ghost"
                               size="sm"
                               className="h-8 w-8 p-0 min-w-8"
                               onClick={(e) => e.stopPropagation()}
                             >
                               <MoreVertical className="h-4 w-4" />
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end" className="z-[60] bg-card">
                             <DropdownMenuItem onClick={() => startRename(doc)}>
                               <Edit2 className="w-4 h-4 mr-2" />
                               Rename
                             </DropdownMenuItem>
                             
                             <DropdownMenuSub>
                               <DropdownMenuSubTrigger>
                                 <Tag className="w-4 h-4 mr-2" />
                                 Category
                               </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="z-[60] bg-card">
                                  <DropdownMenuItem onClick={() => changeCategory(doc.id, 'General')}>
                                    General
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => changeCategory(doc.id, 'Blog')}>
                                    Blog
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => changeCategory(doc.id, 'Book')}>
                                    Book
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => changeCategory(doc.id, 'Essay')}>
                                    Essay
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => changeCategory(doc.id, 'Notes')}>
                                    Notes
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                             </DropdownMenuSub>
                             
                             <DropdownMenuSub>
                               <DropdownMenuSubTrigger>
                                 <Circle className="w-4 h-4 mr-2" />
                                 Status
                               </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="z-[60] bg-card">
                                  <DropdownMenuItem onClick={() => changeStatus(doc.id, 'draft')}>
                                    <Circle className="w-3 h-3 mr-2 fill-yellow-500 text-yellow-500" />
                                    Draft
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => changeStatus(doc.id, 'polished')}>
                                    <Circle className="w-3 h-3 mr-2 fill-blue-500 text-blue-500" />
                                    Polished
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => changeStatus(doc.id, 'final')}>
                                    <Circle className="w-3 h-3 mr-2 fill-green-500 text-green-500" />
                                    Final
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                             </DropdownMenuSub>
                             
                             <DropdownMenuItem onClick={() => duplicateDocument(doc)}>
                               <Copy className="w-4 h-4 mr-2" />
                               Duplicate
                             </DropdownMenuItem>
                             
                             <DropdownMenuSeparator />
                             
                             <DropdownMenuItem 
                               onClick={() => setDeleteConfirmId(doc.id)}
                               className="text-destructive focus:text-destructive"
                             >
                               <Trash2 className="w-4 h-4 mr-2" />
                               Delete
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                       </div>
                     )}
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