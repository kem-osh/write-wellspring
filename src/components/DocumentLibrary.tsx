import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Grid, List, Plus, FolderPlus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentCard } from './DocumentCard';
import { FolderTree } from './FolderTree';
import { DocumentFilters } from './DocumentFilters';
import { BulkDocumentActions } from './BulkDocumentActions';
import { CreateDocumentModal } from './CreateDocumentModal';
import { CreateFolderModal } from './CreateFolderModal';
import { BulkUploader } from '@/features/corpus/components/BulkUploader';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentSelection } from '@/hooks/useDocumentSelection';
import { useIsMobile } from '@/hooks/use-mobile';
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
  created_at: string;
  updated_at: string;
  user_id: string;
  display_order?: number;
}

interface DocumentLibraryProps {
  className?: string;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ className }) => {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'updated_at' | 'created_at' | 'title' | 'word_count'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { selectedDocuments, toggleDocumentSelection, selectAllDocuments, clearSelection, isDocumentSelected } = useDocumentSelection();

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', selectedFolder, searchQuery, sortBy, sortOrder, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select(`
          *,
          folder:folders(name, color, icon)
        `);

      if (selectedFolder) {
        query = query.eq('folder_id', selectedFolder);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%, content.ilike.%${searchQuery}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as any[];
    },
  });

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          doc.title.toLowerCase().includes(query) ||
          doc.content.toLowerCase().includes(query) ||
          (doc.category && doc.category.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [documents, searchQuery]);

  const handleCreateDocument = () => {
    setShowCreateModal(true);
  };

  const handleCreateFolder = () => {
    setShowFolderModal(true);
  };

  const handleBulkUpload = () => {
    setShowUploader(true);
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      {!isMobile && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="hidden sm:flex"
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </>
      )}
      <Button variant="outline" size="sm" onClick={handleCreateFolder}>
        <FolderPlus className="w-4 h-4 mr-2" />
        Folder
      </Button>
      <Button variant="outline" size="sm" onClick={handleBulkUpload}>
        <Upload className="w-4 h-4 mr-2" />
        Upload
      </Button>
      <Button size="sm" onClick={handleCreateDocument}>
        <Plus className="w-4 h-4 mr-2" />
        New Doc
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        {/* Mobile Header */}
        <div className="flex flex-col gap-3 p-4 border-b bg-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Library</h2>
            {headerActions}
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Badge 
              variant={statusFilter === 'all' ? 'default' : 'secondary'}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Badge>
            <Badge 
              variant={statusFilter === 'draft' ? 'default' : 'secondary'}
              className="cursor-pointer whitespace-nowrap status-draft"
              onClick={() => setStatusFilter('draft')}
            >
              Draft
            </Badge>
            <Badge 
              variant={statusFilter === 'polished' ? 'default' : 'secondary'}
              className="cursor-pointer whitespace-nowrap status-polished"
              onClick={() => setStatusFilter('polished')}
            >
              Polished
            </Badge>
            <Badge 
              variant={statusFilter === 'final' ? 'default' : 'secondary'}
              className="cursor-pointer whitespace-nowrap status-final"
              onClick={() => setStatusFilter('final')}
            >
              Final
            </Badge>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="documents" className="h-full">
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="folders">Folders</TabsTrigger>
            </TabsList>
            
            <TabsContent value="documents" className="mt-2 h-full">
              {selectedDocuments.length > 0 && (
                <div className="px-4 mb-3">
                  <BulkDocumentActions
                    selectedDocumentIds={selectedDocuments}
                    documents={filteredDocuments}
                    onClose={clearSelection}
                    onAction={(action, result) => {
                      // Handle bulk action results
                      clearSelection();
                    }}
                  />
                </div>
              )}
              
              <div className="px-4 space-y-3 overflow-y-auto h-full pb-20">
                {filteredDocuments.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      isSelected={isDocumentSelected(doc.id)}
                      onSelectionToggle={toggleDocumentSelection}
                      className="w-full"
                      compact={true}
                    />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="folders" className="mt-2 h-full">
              <div className="px-4 h-full">
                <FolderTree
                  folders={folders}
                  selectedFolder={selectedFolder}
                  onFolderSelect={setSelectedFolder}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

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
          onUploadComplete={(completed, failed) => {
            // Handle upload completion
            setShowUploader(false);
          }}
          onDocumentAdded={(doc) => {
            // Handle new document
          }}
          onClose={() => setShowUploader(false)}
        />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className={cn("flex h-full bg-background", className)}>
      {/* Sidebar */}
      <div className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-3">Library</h2>
          <div className="space-y-2">
            <Button size="sm" onClick={handleCreateDocument} className="w-full justify-start">
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
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <FolderTree
            folders={folders}
            selectedFolder={selectedFolder}
            onFolderSelect={setSelectedFolder}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">
                {selectedFolder ? folders.find(f => f.id === selectedFolder)?.name : 'All Documents'}
              </h1>
              <Badge variant="secondary">
                {filteredDocuments.length} documents
              </Badge>
            </div>
            {headerActions}
          </div>

          {/* Search and Filters */}
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
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_at">Last Modified</SelectItem>
                <SelectItem value="created_at">Created</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="word_count">Word Count</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4">
            <DocumentFilters
              onFiltersChange={(filters) => {
                setStatusFilter(filters.status.join(',') || 'all');
                setSortBy(filters.sortBy === 'recent' ? 'updated_at' : 'title');
              }}
              initialFilters={{
                category: 'all',
                status: statusFilter === 'all' ? [] : [statusFilter],
                sortBy: sortBy === 'updated_at' ? 'recent' : 'az'
              }}
            />
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedDocuments.length > 0 && (
          <div className="p-4 bg-muted/50 border-b">
            <BulkDocumentActions
              selectedDocumentIds={selectedDocuments}
              documents={filteredDocuments}
              onClose={clearSelection}
              onAction={(action, result) => {
                clearSelection();
              }}
            />
          </div>
        )}

        {/* Document Grid/List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "space-y-2"
            )}>
              {filteredDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  isSelected={isDocumentSelected(doc.id)}
                  onSelectionToggle={toggleDocumentSelection}
                  compact={viewMode === 'list'}
                />
              ))}
            </div>
          )}
        </div>
      </div>

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
        onUploadComplete={(completed, failed) => {
          setShowUploader(false);
        }}
        onDocumentAdded={(doc) => {
          // Handle new document
        }}
        onClose={() => setShowUploader(false)}
      />
    </div>
  );
};