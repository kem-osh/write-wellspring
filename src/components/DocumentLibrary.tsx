import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Grid, List, Plus, FolderPlus, Upload, Folder, FileText, AlertCircle, Loader2, Users, Clock, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DocumentCard } from './DocumentCard';
import { FolderTree } from './FolderTree';
import { DocumentFilters } from './DocumentFilters';
import { BulkDocumentActions } from './BulkDocumentActions';
import { MobileBulkActions } from './MobileBulkActions';
import { CreateDocumentModal } from './CreateDocumentModal';
import { CreateFolderModal } from './CreateFolderModal';
import { BulkUploader } from '@/features/corpus/components/BulkUploader';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentSelection } from '@/hooks/useDocumentSelection';
import { useRealtimeDocuments } from '@/hooks/useRealtimeDocuments';
import { useErrorBoundary } from '@/hooks/useErrorBoundary';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface Document {
  id: string;
  title: string;
  content: string;
  category?: string;
  folder_id?: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  status: 'draft' | 'polished' | 'final';
  user_id: string;
  version?: number;
  display_order?: number;
  embedding?: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id?: string;
  color?: string;
  icon?: string;
  document_count?: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  display_order?: number;
}

interface DocumentLibraryProps {
  className?: string;
}

// Empty state component
const EmptyState: React.FC<{ 
  type: 'documents' | 'search' | 'folder';
  searchQuery?: string;
  folderName?: string;
  onCreateDocument?: () => void;
}> = ({ type, searchQuery, folderName, onCreateDocument }) => {
  const content = useMemo(() => {
    switch (type) {
      case 'search':
        return {
          icon: <Search className="w-16 h-16 text-muted-foreground/50" />,
          title: 'No documents found',
          description: `No documents match "${searchQuery}". Try adjusting your search terms or filters.`,
          action: null
        };
      case 'folder':
        return {
          icon: <Folder className="w-16 h-16 text-muted-foreground/50" />,
          title: `No documents in ${folderName}`,
          description: 'This folder is empty. Start by creating your first document.',
          action: onCreateDocument ? (
            <Button onClick={onCreateDocument} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create Document
            </Button>
          ) : null
        };
      default:
        return {
          icon: <FileText className="w-16 h-16 text-primary/50" />,
          title: 'Welcome to LogosScribe',
          description: 'Your AI-powered writing studio. Start by creating your first document or uploading existing content.',
          action: onCreateDocument ? (
            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <Button onClick={onCreateDocument} size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Document
              </Button>
              <Button variant="outline" size="lg">
                <Upload className="w-4 h-4 mr-2" />
                Upload Documents
              </Button>
            </div>
          ) : null
        };
    }
  }, [type, searchQuery, folderName, onCreateDocument]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="mb-4">{content.icon}</div>
      <h3 className="text-xl font-semibold mb-2">{content.title}</h3>
      <p className="text-muted-foreground max-w-md mb-4">{content.description}</p>
      {content.action}
    </div>
  );
};

// Loading skeleton grid
const LoadingSkeleton: React.FC<{ viewMode: 'grid' | 'list' }> = ({ viewMode }) => (
  <div className={cn(
    viewMode === 'grid' 
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      : "space-y-3"
  )}>
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className={cn(
        "rounded-lg border bg-card",
        viewMode === 'grid' ? "aspect-[3/2]" : "h-20"
      )}>
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          {viewMode === 'grid' && (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ className }) => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Error handling and connectivity
  const { executeWithRetry, isOnline } = useErrorBoundary();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState({
    category: 'all',
    status: [] as string[],
    sortBy: 'recent' as 'recent' | 'oldest' | 'az' | 'za' | 'wordcount'
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Document selection hook
  const {
    selectedDocuments,
    selectedCount,
    selectDocument,
    toggleDocument,
    selectAll,
    clearSelection,
    isSelected
  } = useDocumentSelection();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch documents with comprehensive filtering
  const { 
    data: documents = [], 
    isLoading: documentsLoading, 
    error: documentsError,
    refetch: refetchDocuments
  } = useQuery({
    queryKey: ['documents', selectedFolder, debouncedSearch, filters],
    queryFn: async () => {
      return await executeWithRetry({
        execute: async () => {
          let query = supabase
            .from('documents')
            .select(`
              *,
              folder:folders(name, color)
            `);

          // Folder filter
          if (selectedFolder) {
            query = query.eq('folder_id', selectedFolder);
          }

          // Search filter
          if (debouncedSearch) {
            query = query.or(`title.ilike.%${debouncedSearch}%, content.ilike.%${debouncedSearch}%`);
          }

          // Status filter
          if (filters.status.length > 0) {
            query = query.in('status', filters.status);
          }

          // Category filter
          if (filters.category !== 'all') {
            query = query.eq('category', filters.category);
          }

          // Sorting
          const sortMap: Record<string, [string, boolean]> = {
            'recent': ['updated_at', false],
            'oldest': ['created_at', true],
            'az': ['title', true],
            'za': ['title', false],
            'wordcount': ['word_count', false]
          };
          const [sortField, ascending] = sortMap[filters.sortBy];
          query = query.order(sortField, { ascending });

          const { data, error } = await query;
          if (error) throw error;
          return data as Document[];
        },
        retryConfig: { maxAttempts: 3, backoffMs: 1000 }
      }) || [];
    },
    retry: false, // Handle retries via executeWithRetry
    refetchOnWindowFocus: false,
  });

  // Enable real-time document synchronization
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { connected } = useRealtimeDocuments(currentUser?.id);
  
  // Get current user for real-time sync
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);
  
  // Invalidate queries when real-time updates occur
  useEffect(() => {
    if (connected) {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  }, [connected, queryClient]);

  // Fetch folders
  const { 
    data: folders = [], 
    isLoading: foldersLoading 
  } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('name');
      if (error) throw error;
      // Add default values for missing properties
      return (data as any[]).map(folder => ({
        ...folder,
        color: folder.color || '#6B7280',
        icon: folder.icon || 'folder',
        document_count: folder.document_count || 0
      })) as Folder[];
    },
  });

  // Document statistics
  const documentStats = useMemo(() => {
    if (!documents.length) return null;
    
    const totalWords = documents.reduce((sum, doc) => sum + (doc.word_count || 0), 0);
    const statusCounts = documents.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { totalWords, statusCounts, total: documents.length };
  }, [documents]);

  // Event handlers
  const handleCreateDocument = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleCreateFolder = useCallback(() => {
    setShowFolderModal(true);
  }, []);

  const handleBulkUpload = useCallback(() => {
    setShowUploader(true);
  }, []);

  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedCount === documents.length) {
      clearSelection();
    } else {
      selectAll(documents.map(doc => doc.id));
    }
  }, [selectedCount, documents.length, clearSelection, selectAll, documents]);

  const handleDocumentAction = useCallback(async (action: string, docId: string) => {
    try {
      switch (action) {
        case 'edit':
          // Navigate to editor - implement based on routing
          console.log('Edit document:', docId);
          break;
        case 'duplicate':
          const doc = documents.find(d => d.id === docId);
          if (doc) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            
            await supabase.from('documents').insert({
              title: `${doc.title} (Copy)`,
              content: doc.content,
              category: doc.category,
              status: 'draft',
              folder_id: doc.folder_id,
              user_id: user.id
            });
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            toast({ title: 'Document duplicated successfully' });
          }
          break;
        case 'delete':
          await supabase.from('documents').delete().eq('id', docId);
          queryClient.invalidateQueries({ queryKey: ['documents'] });
          clearSelection();
          toast({ title: 'Document deleted successfully' });
          break;
      }
    } catch (error) {
      toast({
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      });
    }
  }, [documents, queryClient, toast, clearSelection]);

  // Selected folder name
  const selectedFolderName = useMemo(() => {
    return selectedFolder ? folders.find(f => f.id === selectedFolder)?.name : null;
  }, [selectedFolder, folders]);

  // Error state
  if (documentsError) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load documents. 
            <Button variant="link" onClick={() => refetchDocuments()} className="ml-2 p-0 h-auto">
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render mobile layout
  if (isMobile) {
    return (
      <div className={cn("flex flex-col h-full bg-background", className)}>
        {/* Mobile Header */}
        <div className="bg-card border-b px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Library</h1>
              {documentStats && (
                <p className="text-xs text-muted-foreground">
                  {documentStats.total} documents • {documentStats.totalWords.toLocaleString()} words
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={handleCreateFolder}>
                <FolderPlus className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkUpload}>
                <Upload className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={handleCreateDocument}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick filters */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Badge 
              variant={filters.status.length === 0 ? 'default' : 'secondary'}
              className="cursor-pointer whitespace-nowrap" 
              onClick={() => setFilters(prev => ({ ...prev, status: [] }))}
            >
              All
            </Badge>
            {['draft', 'polished', 'final'].map(status => (
              <Badge 
                key={status}
                variant={filters.status.includes(status) ? 'default' : 'secondary'}
                className="cursor-pointer whitespace-nowrap capitalize"
                onClick={() => setFilters(prev => ({
                  ...prev,
                  status: prev.status.includes(status) 
                    ? prev.status.filter(s => s !== status)
                    : [...prev.status, status]
                }))}
              >
                {status}
              </Badge>
            ))}
          </div>
        </div>

        {/* Bulk Selection Bar */}
        {selectedCount > 0 && (
          <div className="bg-primary/10 border-b px-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedCount} document{selectedCount > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedCount === documents.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="documents" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
              <TabsTrigger value="documents">
                Documents
                {documentStats && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {documentStats.total}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="folders">
                Folders
                <Badge variant="secondary" className="ml-2 text-xs">
                  {folders.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="documents" className="flex-1 overflow-hidden mt-2">
              <div className="h-full overflow-y-auto px-4 pb-20">
                {documentsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : documents.length === 0 ? (
                  <EmptyState 
                    type={debouncedSearch ? 'search' : selectedFolder ? 'folder' : 'documents'}
                    searchQuery={debouncedSearch}
                    folderName={selectedFolderName || undefined}
                    onCreateDocument={handleCreateDocument}
                  />
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        document={doc}
                        compact={true}
                        isSelected={isSelected(doc.id)}
                        showCheckbox={true}
                        onSelectionToggle={() => toggleDocument(doc.id)}
                        searchQuery={debouncedSearch}
                        onEdit={(doc) => handleDocumentAction('edit', doc.id)}
                        onDuplicate={(doc) => handleDocumentAction('duplicate', doc.id)}
                        onDelete={(docId) => handleDocumentAction('delete', docId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="folders" className="flex-1 overflow-hidden mt-2">
              <div className="h-full overflow-y-auto px-4">
                {foldersLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <FolderTree
                    folders={folders}
                    selectedFolder={selectedFolder}
                    onFolderSelect={setSelectedFolder}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Mobile Bulk Actions */}
        <MobileBulkActions
          selectedCount={selectedCount}
          totalWords={documentStats?.totalWords || 0}
          onAction={(actionId) => {
            clearSelection();
            queryClient.invalidateQueries({ queryKey: ['documents'] });
          }}
          onClear={clearSelection}
        />

        {/* Desktop Bulk Actions Modal */}
        {selectedCount > 0 && !isMobile && (
          <BulkDocumentActions
            selectedDocumentIds={selectedDocuments}
            documents={documents}
            onClose={clearSelection}
            onAction={() => {
              clearSelection();
              queryClient.invalidateQueries({ queryKey: ['documents'] });
            }}
          />
        )}

        {/* Modals */}
        <CreateDocumentModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          defaultFolderId={selectedFolder}
        />
        <CreateFolderModal
          open={showFolderModal}
          onOpenChange={setShowFolderModal}
          parentFolderId={selectedFolder}
        />
        <BulkUploader
          onUploadComplete={() => {
            setShowUploader(false);
            queryClient.invalidateQueries({ queryKey: ['documents'] });
          }}
          onDocumentAdded={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
          onClose={() => setShowUploader(false)}
        />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className={cn("flex h-full bg-background", className)}>
      {/* Sidebar */}
      <div className="w-72 border-r bg-card flex flex-col">
        <div className="p-4 border-b space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Library</h2>
            {documentStats && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {documentStats.total}
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {documentStats.totalWords.toLocaleString()}
                </span>
              </div>
            )}
          </div>
          
          <Button onClick={handleCreateDocument} className="w-full justify-start">
            <Plus className="w-4 h-4 mr-2" />
            New Document
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handleCreateFolder}>
              <FolderPlus className="w-4 h-4 mr-1" />
              Folder
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkUpload}>
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {foldersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <FolderTree
              folders={folders}
              selectedFolder={selectedFolder}
              onFolderSelect={setSelectedFolder}
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-card border-b p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">
                {selectedFolderName || 'All Documents'}
              </h1>
              <Badge variant="secondary">
                {documents.length} document{documents.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Search and bulk actions */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {selectedCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedCount} selected
                </span>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedCount === documents.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="border-b bg-muted/30 p-4">
            <DocumentFilters
              onFiltersChange={handleFiltersChange}
              onSearchChange={setSearchQuery}
              onViewModeChange={setViewMode}
              initialFilters={{
                category: filters.category,
                status: filters.status,
                sortBy: filters.sortBy,
                searchQuery,
                viewMode
              }}
              documentCount={documents.length}
            />
          </div>
        )}

        {/* Document Grid/List */}
        <div className="flex-1 overflow-y-auto p-4">
          {documentsLoading ? (
            <LoadingSkeleton viewMode={viewMode} />
          ) : documents.length === 0 ? (
            <EmptyState 
              type={debouncedSearch ? 'search' : selectedFolder ? 'folder' : 'documents'}
              searchQuery={debouncedSearch}
              folderName={selectedFolderName || undefined}
              onCreateDocument={handleCreateDocument}
            />
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "space-y-3"
            )}>
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  compact={viewMode === 'list'}
                  isSelected={isSelected(doc.id)}
                  showCheckbox={selectedCount > 0 || isSelected(doc.id)}
                  onSelectionToggle={() => toggleDocument(doc.id)}
                  searchQuery={debouncedSearch}
                  onEdit={(doc) => handleDocumentAction('edit', doc.id)}
                  onDuplicate={(doc) => handleDocumentAction('duplicate', doc.id)}
                  onDelete={(docId) => handleDocumentAction('delete', docId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bulk Actions */}
      <MobileBulkActions
        selectedCount={selectedCount}
        totalWords={documentStats?.totalWords || 0}
        onAction={(actionId) => {
          clearSelection();
          queryClient.invalidateQueries({ queryKey: ['documents'] });
        }}
        onClear={clearSelection}
      />

      {/* Desktop Bulk Actions Modal */}
      {selectedCount > 0 && (
        <BulkDocumentActions
          selectedDocumentIds={selectedDocuments}
          documents={documents}
          onClose={clearSelection}
          onAction={() => {
            clearSelection();
            queryClient.invalidateQueries({ queryKey: ['documents'] });
          }}
        />
      )}

      {/* Modals */}
      <CreateDocumentModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        defaultFolderId={selectedFolder}
      />
      <CreateFolderModal
        open={showFolderModal}
        onOpenChange={setShowFolderModal}
        parentFolderId={selectedFolder}
      />
      <BulkUploader
        onUploadComplete={() => {
          setShowUploader(false);
          queryClient.invalidateQueries({ queryKey: ['documents'] });
        }}
        onDocumentAdded={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
        onClose={() => setShowUploader(false)}
      />
    </div>
  );
};