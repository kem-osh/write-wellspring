import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/ui/enhanced-button";

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  PenTool, 
  Clipboard, 
  Upload, 
  FileText, 
  Settings, 
  Menu, 
  MessageSquare, 
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDevice } from "@/hooks/useDevice";
import { UserMenu } from "@/components/UserMenu";
import { AIChatSidebar } from "@/components/AIChatSidebar";
import { DocumentSearch } from "@/components/DocumentSearch";
import { DocumentFilters } from "@/components/DocumentFilters";
import { DocumentList } from "@/components/DocumentList";
import { DocumentStats } from "@/components/DocumentStats";
import { useDocumentStore } from "@/lib/stores/useDocumentStore";
import { useDocumentSelection } from "@/hooks/useDocumentSelection";
import { BulkUploader } from '@/features/corpus/components/BulkUploader';
import { SettingsModal } from "@/components/SettingsModal";
import { VoiceRecorder } from "@/components/VoiceRecorder";
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
  user_id?: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
}

interface FilterOptions {
  category: string;
  status: string[];
  sortBy: 'recent' | 'oldest' | 'az' | 'za' | 'wordcount';
  folderId?: string;
}

export default function DocumentLibrary() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { isMobile, isTablet } = useDevice();
  
  // Document state management via Zustand store
  const {
    documents,
    loading: documentsLoading,
    hasMore,
    loadDocuments,
    loadMoreDocuments,
    addDocument,
    updateDocument,
    removeDocument
  } = useDocumentStore();
  
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'all',
    status: [],
    sortBy: 'recent',
    folderId: undefined
  });
  
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(!isMobile);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(!isMobile);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBulkUploader, setShowBulkUploader] = useState(false);
  const [selectedDocumentForPreview, setSelectedDocumentForPreview] = useState<Document | null>(null);
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('list');

  // Document selection hook
  const {
    selectedDocuments,
    toggleDocumentSelection,
    selectAllDocuments,
    clearSelection,
    isDocumentSelected,
    selectionCount
  } = useDocumentSelection();

  // Load initial data
  useEffect(() => {
    if (user) {
      loadDocuments({ userId: user.id });
      loadCategories();
    }
  }, [user]);

  // Update filtered documents when documents, search, or filters change
  useEffect(() => {
    applyFiltersAndSearch();
  }, [documents, searchQuery, filters]);

  // Settings keyboard shortcut (Cmd/Ctrl + ,)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setShowSettingsModal(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadCategories = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("display_order");

    if (error) {
      console.error("Error loading categories:", error);
    } else {
      setCategories(data || []);
    }
  };

  const applyFiltersAndSearch = () => {
    setSearchLoading(true);
    
    setTimeout(() => {
      let filtered = [...documents];

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(doc => 
          doc.title.toLowerCase().includes(query) ||
          doc.content.toLowerCase().includes(query) ||
          doc.category.toLowerCase().includes(query)
        );
      }

      // Apply category filter
      if (filters.category !== 'all') {
        filtered = filtered.filter(doc => doc.category === filters.category);
      }

      // Apply status filter
      if (filters.status.length > 0) {
        filtered = filtered.filter(doc => filters.status.includes(doc.status));
      }

      // Apply sorting
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'oldest':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'az':
            return a.title.localeCompare(b.title);
          case 'za':
            return b.title.localeCompare(a.title);
          case 'wordcount':
            return (b.word_count || 0) - (a.word_count || 0);
          case 'recent':
          default:
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
      });

      setFilteredDocuments(filtered);
      setSearchLoading(false);
    }, searchQuery.trim() ? 100 : 0);
  };

  const createNewDocument = async () => {
    if (!user) return;

    const newDoc: Document = {
      id: 'temp-' + Date.now(),
      title: "New Document",
      content: "",
      category: categories.find(c => c.is_default)?.name || 'general',
      status: "draft",
      word_count: 0,
      folder_id: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: user.id
    };

    // Create document in database first
    const { data, error } = await supabase
      .from('documents')
      .insert([{
        title: newDoc.title,
        content: newDoc.content,
        category: newDoc.category,
        status: newDoc.status,
        user_id: user.id,
        word_count: 0
      }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating document",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Navigate to editor with the new document
    navigate(`/editor/${data.id}`);
    
    toast({
      title: "New document created",
      description: "Opening editor...",
    });
  };

  const handlePasteContent = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast({
          title: "No content to paste",
          description: "Your clipboard is empty.",
          variant: "destructive",
        });
        return;
      }

      if (!user) return;

      // Create document with pasted content
      const { data, error } = await supabase
        .from('documents')
        .insert([{
          title: "Pasted Content",
          content: text,
          category: categories.find(c => c.is_default)?.name || 'general',
          status: "draft",
          user_id: user.id,
          word_count: text.split(' ').length
        }])
        .select()
        .single();

      if (error) {
        toast({
          title: "Error creating document",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Navigate to editor with the pasted content
      navigate(`/editor/${data.id}`);
      
      toast({
        title: "Content pasted",
        description: "Opening in editor...",
      });
    } catch (error) {
      toast({
        title: "Failed to paste content",
        description: "Unable to access clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleVoiceToDocument = async (transcript: string) => {
    if (!user || !transcript.trim()) return;

    const { data, error } = await supabase
      .from('documents')
      .insert([{
        title: "Voice Note",
        content: transcript,
        category: categories.find(c => c.is_default)?.name || 'general',
        status: "draft",
        user_id: user.id,
        word_count: transcript.split(' ').length
      }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating document",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    navigate(`/editor/${data.id}`);
    
    toast({
      title: "Voice note created",
      description: "Opening in editor...",
    });
  };

  const handleDocumentEdit = (doc: Document) => {
    navigate(`/editor/${doc.id}`);
  };

  const handleDocumentPreview = (doc: Document) => {
    setSelectedDocumentForPreview(doc);
  };

  const handleDocumentSelect = (doc: Document) => {
    handleDocumentEdit(doc);
  };

  const handleDocumentUpdate = () => {
    if (user) {
      loadDocuments({ userId: user.id });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface/30 to-background">
      {/* Main Layout */}
      <div className="h-screen flex">
        {/* Mobile Menu Sheet */}
        {isMobile && (
          <Sheet open={leftSidebarOpen} onOpenChange={setLeftSidebarOpen}>
            <SheetContent side="left" className="w-80 p-0">
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-border/50">
                  <h2 className="text-heading-md font-semibold">Documents</h2>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    <DocumentSearch 
                      onSearch={setSearchQuery}
                      onClear={() => setSearchQuery('')}
                      isLoading={searchLoading}
                    />
                    <DocumentFilters
                      initialFilters={filters}
                      onFiltersChange={setFilters}
                    />
                    <DocumentStats documents={filteredDocuments} />
                  </div>
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Desktop Layout with Resizable Panels */}
        {isMobile ? (
          /* Mobile Layout - No Resizable Panels */
          <div className="flex-1 flex flex-col bg-surface/20">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 bg-surface/60 backdrop-blur-sm border-b border-border/50 shadow-sm">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setLeftSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-heading-lg font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    LogosScribe
                  </h1>
                  <p className="text-sm text-muted-foreground">Document Library</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* View Layout Toggle */}
                <div className="flex items-center bg-muted/50 rounded-lg p-1">
                  <Button
                    variant={viewLayout === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewLayout('list')}
                    className="h-7 px-2"
                  >
                    <List className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={viewLayout === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewLayout('grid')}
                    className="h-7 px-2"
                  >
                    <Grid3X3 className="h-3 w-3" />
                  </Button>
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                  className="hover:bg-sidebar-accent"
                >
                  <MessageSquare className="h-5 w-5" />
                </Button>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowSettingsModal(true)}
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Document Preview Panel */}
            {selectedDocumentForPreview && (
              <div className="flex-shrink-0 p-4 bg-card/50 border-b border-border/50">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-heading-sm font-semibold">{selectedDocumentForPreview.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {selectedDocumentForPreview.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {selectedDocumentForPreview.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {selectedDocumentForPreview.word_count} words
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleDocumentEdit(selectedDocumentForPreview)}>
                      <PenTool className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDocumentForPreview(null)}>
                      ×
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {selectedDocumentForPreview.content.substring(0, 300)}
                  {selectedDocumentForPreview.content.length > 300 && '...'}
                </div>
              </div>
            )}

            {/* Document List */}
            <div className="flex-1 overflow-hidden">
              <DocumentList
                documents={filteredDocuments}
                categories={categories}
                onDocumentSelect={handleDocumentSelect}
                onDocumentUpdate={handleDocumentUpdate}
                searchQuery={searchQuery}
                selectedDocuments={selectedDocuments}
                onDocumentSelectionChange={(ids) => {
                  ids.forEach(id => {
                    if (!isDocumentSelected(id)) {
                      toggleDocumentSelection(id);
                    }
                  });
                }}
                hasMore={hasMore}
                loading={documentsLoading}
                onLoadMore={() => user && loadMoreDocuments(user.id)}
              />
            </div>
          </div>
        ) : (
          /* Desktop Layout with Resizable Panels */
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Left Sidebar - Document Library Panel */}
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
              <div className="w-full h-full bg-sidebar/95 backdrop-blur-sm border-r border-sidebar-border shadow-lg">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex-shrink-0 p-5 border-b border-sidebar-border bg-sidebar shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-sidebar-primary/10 border border-sidebar-primary/20">
                          <FileText className="w-5 h-5 text-sidebar-primary" />
                        </div>
                        <div>
                          <h2 className="text-heading-md font-semibold text-sidebar-foreground">Documents</h2>
                          <p className="text-xs text-muted-foreground">{documents.length} documents</p>
                        </div>
                      </div>
                      <UserMenu />
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="space-y-2">
                      <EnhancedButton 
                        size="sm" 
                        onClick={createNewDocument}
                        className="w-full justify-start shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <PenTool className="h-4 w-4 mr-2" />
                        Write New Document
                      </EnhancedButton>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handlePasteContent}
                          className="flex-1 justify-start text-xs bg-card/50 hover:bg-card border-border/60 hover:border-sidebar-primary/30"
                        >
                          <Clipboard className="h-3 w-3 mr-1" />
                          Paste
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowBulkUploader(true)}
                          className="flex-1 justify-start text-xs bg-card/50 hover:bg-card border-border/60 hover:border-sidebar-primary/30"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Upload
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex-shrink-0 p-4 space-y-4 bg-surface/30">
                    <DocumentSearch 
                      onSearch={setSearchQuery}
                      onClear={() => setSearchQuery('')}
                      isLoading={searchLoading}
                    />
                    <DocumentFilters
                      initialFilters={filters}
                      onFiltersChange={setFilters}
                    />
                  </div>

                  {/* Document Stats */}
                  <div className="flex-shrink-0 p-4">
                    <DocumentStats documents={filteredDocuments} />
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Center Panel - Document Management Center */}
            <ResizablePanel>
              <div className="h-full flex flex-col bg-surface/20">
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-4 bg-surface/60 backdrop-blur-sm border-b border-border/50 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div>
                      <h1 className="text-heading-lg font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                        LogosScribe
                      </h1>
                      <p className="text-sm text-muted-foreground">Document Library</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* View Layout Toggle */}
                    <div className="flex items-center bg-muted/50 rounded-lg p-1">
                      <Button
                        variant={viewLayout === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewLayout('list')}
                        className="h-7 px-2"
                      >
                        <List className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={viewLayout === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewLayout('grid')}
                        className="h-7 px-2"
                      >
                        <Grid3X3 className="h-3 w-3" />
                      </Button>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                      className="hover:bg-sidebar-accent"
                    >
                      <MessageSquare className="h-5 w-5" />
                    </Button>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowSettingsModal(true)}
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Document Preview Panel */}
                {selectedDocumentForPreview && (
                  <div className="flex-shrink-0 p-4 bg-card/50 border-b border-border/50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-heading-sm font-semibold">{selectedDocumentForPreview.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {selectedDocumentForPreview.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {selectedDocumentForPreview.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {selectedDocumentForPreview.word_count} words
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleDocumentEdit(selectedDocumentForPreview)}>
                          <PenTool className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDocumentForPreview(null)}>
                          ×
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 max-h-32 overflow-y-auto">
                      {selectedDocumentForPreview.content.substring(0, 300)}
                      {selectedDocumentForPreview.content.length > 300 && '...'}
                    </div>
                  </div>
                )}

                {/* Document List */}
                <div className="flex-1 overflow-hidden">
                  <DocumentList
                    documents={filteredDocuments}
                    categories={categories}
                    onDocumentSelect={handleDocumentSelect}
                    onDocumentUpdate={handleDocumentUpdate}
                    searchQuery={searchQuery}
                    selectedDocuments={selectedDocuments}
                    onDocumentSelectionChange={(ids) => {
                      ids.forEach(id => {
                        if (!isDocumentSelected(id)) {
                          toggleDocumentSelection(id);
                        }
                      });
                    }}
                    hasMore={hasMore}
                    loading={documentsLoading}
                    onLoadMore={() => user && loadMoreDocuments(user.id)}
                  />
                </div>
              </div>
            </ResizablePanel>

            {/* Right Sidebar - AI Chat Panel */}
            {rightSidebarOpen && (
              <>
                <ResizableHandle />
                <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                  <AIChatSidebar
                    isOpen={true}
                    onClose={() => setRightSidebarOpen(false)}
                    onDocumentSelect={handleDocumentSelect}
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        )}
      </div>

      {/* Voice Recorder - Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <VoiceRecorder onTranscription={handleVoiceToDocument} />
      </div>

      {/* Modals */}
      <SettingsModal 
        open={showSettingsModal} 
        onOpenChange={setShowSettingsModal} 
      />

      {showBulkUploader && (
        <Dialog open={showBulkUploader} onOpenChange={setShowBulkUploader}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <BulkUploader
              onUploadComplete={(completed, failed) => {
                toast({
                  title: "Upload Complete",
                  description: `${completed} documents uploaded successfully${failed > 0 ? `, ${failed} failed` : ''}`,
                });
              }}
              onDocumentAdded={() => handleDocumentUpdate()}
              onClose={() => setShowBulkUploader(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}