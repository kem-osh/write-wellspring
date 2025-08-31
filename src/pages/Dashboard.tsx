import { useState, useEffect, lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Moon, Sun, Maximize2, Minimize2, Plus, FileText, Settings, X, Mic, Loader2, Menu, MoreVertical, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDevice } from "@/hooks/useDevice";
import { MonacoEditor } from "@/components/MonacoEditor";
import { MobileEditor } from "@/components/MobileEditor";
import { MobileDocumentLibrary } from "@/components/MobileDocumentLibrary";
import { MobileAICommands } from "@/components/MobileAICommands";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { UserMenu } from "@/components/UserMenu";
import { CustomShortcuts } from "@/components/CustomShortcuts";
import { AdvancedAICommands } from "@/components/AdvancedAICommands";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { AISuggestionPanel } from "@/components/AISuggestionPanel";
import { AIChatSidebar } from "@/components/AIChatSidebar";
import { DocumentSearch } from "@/components/DocumentSearch";
import { DocumentFilters } from "@/components/DocumentFilters";
import { DocumentList } from "@/components/DocumentList";
import { DocumentStats } from "@/components/DocumentStats";
import { useEmbeddings } from "@/hooks/useEmbeddings";
import { Badge } from "@/components/ui/badge";
import { CommandSettings } from "@/components/CommandSettings";

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
  is_default: boolean;
}

interface FilterOptions {
  category: string;
  status: string[];
  sortBy: 'recent' | 'oldest' | 'az' | 'za' | 'wordcount';
  folderId?: string;
}

interface AISuggestion {
  id: string;
  type: 'light-edit' | 'expand' | 'condense' | 'outline';
  originalText: string;
  suggestedText: string;
  changes?: boolean;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { generateEmbeddingsSilently } = useEmbeddings();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'all',
    status: [],
    sortBy: 'recent',
    folderId: undefined
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showCommandSettings, setShowCommandSettings] = useState(false);
  const [commandSettingsKey, setCommandSettingsKey] = useState(0);
  
  // Mobile state
  const [mobileDocumentLibraryOpen, setMobileDocumentLibraryOpen] = useState(false);
  const [mobileAICommandsOpen, setMobileAICommandsOpen] = useState(false);
  
  const { isMobile, isTablet, isDesktop } = useDevice();

  // Load documents and categories on mount
  useEffect(() => {
    loadDocuments();
    loadCategories();
  }, []);

  // Update filtered documents when documents, search, or filters change
  useEffect(() => {
    applyFiltersAndSearch();
  }, [documents, searchQuery, filters]);

  // Auto-save document content
  useEffect(() => {
    if (currentDocument && documentContent !== currentDocument.content) {
      const timeoutId = setTimeout(() => {
        saveDocument();
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [documentContent, currentDocument]);

  // Persist dark mode
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const loadDocuments = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading documents",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Calculate word count for documents that don't have it
      const documentsWithWordCount = (data || []).map(doc => ({
        ...doc,
        word_count: doc.word_count || doc.content.trim().split(/\s+/).filter(word => word.length > 0).length
      })) as Document[];
      setDocuments(documentsWithWordCount);
    }
    setLoading(false);
  };

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
    
    // Add small delay to show loading state for very fast searches
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

      const newDoc = {
        title: "New Document",
        content: "",
        user_id: user.id,
        category: "general",
        status: "draft",
        word_count: 0,
      };

    const { data, error } = await supabase
      .from("documents")
      .insert([newDoc])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating document",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setDocuments([data, ...documents]);
      setCurrentDocument(data);
      setDocumentTitle(data.title);
      setDocumentContent(data.content);
      toast({
        title: "New document created",
        description: "Your new document is ready for editing.",
      });
    }
  };

  const openDocument = (doc: Document) => {
    setCurrentDocument(doc);
    setDocumentTitle(doc.title);
    setDocumentContent(doc.content);
  };

  const saveDocument = async () => {
    if (!currentDocument) return;

    const wordCount = documentContent.trim().split(/\s+/).filter(word => word.length > 0).length;

    const { error } = await supabase
      .from("documents")
      .update({ 
        title: documentTitle,
        content: documentContent,
        word_count: wordCount,
        updated_at: new Date().toISOString()
      })
      .eq("id", currentDocument.id);

    if (error) {
      toast({
        title: "Error saving document",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Update local state
      const updatedDoc = { 
        ...currentDocument, 
        title: documentTitle, 
        content: documentContent,
        word_count: wordCount 
      };
      setCurrentDocument(updatedDoc);
      setDocuments(documents.map(doc => 
        doc.id === currentDocument.id ? updatedDoc : doc
      ));
      
      // Generate embeddings in the background for AI search
      if (documentContent.trim()) {
        generateEmbeddingsSilently(currentDocument.id, documentContent);
      }
    }
  };

  const deleteDocument = async (docId: string) => {
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", docId);

    if (error) {
      toast({
        title: "Error deleting document",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setDocuments(documents.filter(doc => doc.id !== docId));
      if (currentDocument?.id === docId) {
        setCurrentDocument(null);
        setDocumentTitle("");
        setDocumentContent("");
      }
      toast({
        title: "Document deleted",
        description: "The document has been removed.",
      });
    }
  };

  const handleCustomShortcut = async (type: 'light-edit' | 'expand' | 'condense' | 'outline', prompt: string, model?: string, maxTokens?: number) => {
    if (!currentDocument) {
      toast({
        title: "No document selected",
        description: "Please select or create a document first.",
        variant: "destructive",
      });
      return;
    }

    const textToProcess = selectedText || documentContent;
    if (!textToProcess.trim()) {
      toast({
        title: "No content to process",
        description: "Please add some content to your document first.",
        variant: "destructive",
      });
      return;
    }

    setAiLoading(true);

    try {
      const functionName = type === 'light-edit' ? 'ai-light-edit' : 
                          type === 'expand' ? 'ai-expand-content' : 
                          type === 'condense' ? 'ai-condense-content' :
                          'ai-outline';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          content: selectedText ? undefined : documentContent,
          selectedText: selectedText || undefined,
          customPrompt: prompt,
          model: model || 'gpt-5-nano-2025-08-07',
          maxTokens: maxTokens || 500
        }
      });

      if (error) throw error;

      const suggestion: AISuggestion = {
        id: Date.now().toString(),
        type,
        originalText: textToProcess,
        suggestedText: data[type === 'light-edit' ? 'editedText' : 
                          type === 'expand' ? 'expandedText' : 
                          type === 'condense' ? 'condensedText' : 'outlineText'],
        changes: type === 'light-edit' ? data.changes : true
      };

      setAiSuggestion(suggestion);
    } catch (error) {
      console.error('AI processing error:', error);
      toast({
        title: "AI processing failed",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleVoiceTranscription = async (text: string) => {
    if (currentDocument && documentContent.trim()) {
      // Append to existing document with content
      const newContent = documentContent + '\n\n' + text;
      setDocumentContent(newContent);
      
      // Auto-generate title if current title is generic and content is substantial
      const wordCount = newContent.trim().split(/\s+/).filter(word => word.length > 0).length;
      if (wordCount >= 50 && (documentTitle === "New Document" || documentTitle.trim() === "")) {
        try {
          const { data: titleData } = await supabase.functions.invoke('ai-generate-title', {
            body: { content: newContent.substring(0, 200) }
          });

          if (titleData?.title) {
            const currentDate = new Date().toLocaleDateString('en-US', { 
              month: '2-digit', 
              day: '2-digit', 
              year: 'numeric' 
            });
            const generatedTitle = `${titleData.title} - ${currentDate}`;
            setDocumentTitle(generatedTitle);
          }
        } catch (error) {
          console.error('Failed to generate title:', error);
        }
      }

      toast({
        title: "Voice added to document",
        description: "Transcription has been added to your current document.",
      });
    } else if (currentDocument && !documentContent.trim()) {
      // Replace empty document content
      setDocumentContent(text);
      
      // Auto-generate title for new content
      const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
      if (wordCount >= 10) {
        try {
          const { data: titleData } = await supabase.functions.invoke('ai-generate-title', {
            body: { content: text.substring(0, 200) }
          });

          if (titleData?.title) {
            const currentDate = new Date().toLocaleDateString('en-US', { 
              month: '2-digit', 
              day: '2-digit', 
              year: 'numeric' 
            });
            const generatedTitle = `${titleData.title} - ${currentDate}`;
            setDocumentTitle(generatedTitle);
          }
        } catch (error) {
          console.error('Failed to generate title:', error);
        }
      }

      toast({
        title: "Voice transcription complete",
        description: "Your document has been updated with the transcribed content.",
      });
    } else {
      // Create new document
      await createNewDocumentFromVoice(text);
    }
  };

  const createNewDocumentFromVoice = async (content: string) => {
    if (!user) return;

    try {
      // Generate AI title first if content is substantial
      let title = 'Voice Note';
      
      if (content.trim().split(/\s+/).filter(word => word.length > 0).length >= 10) {
        try {
          const { data: titleData } = await supabase.functions.invoke('ai-generate-title', {
            body: { content: content.substring(0, 200) }
          });

          if (titleData?.title) {
            const currentDate = new Date().toLocaleDateString('en-US', { 
              month: '2-digit', 
              day: '2-digit', 
              year: 'numeric' 
            });
            title = `${titleData.title} - ${currentDate}`;
          }
        } catch (error) {
          console.error('Failed to generate title:', error);
        }
      }

      const newDoc = {
        title,
        content,
        user_id: user.id,
        category: "voice-note",
        status: "draft",
        word_count: content.trim().split(/\s+/).filter(word => word.length > 0).length,
      };

      const { data, error } = await supabase
        .from("documents")
        .insert([newDoc])
        .select()
        .single();

      if (error) throw error;

      setDocuments([data, ...documents]);
      setCurrentDocument(data);
      setDocumentTitle(data.title);
      setDocumentContent(data.content);
      
      toast({
        title: "Voice note created",
        description: `Created "${title}" from your voice input.`,
      });
    } catch (error) {
      console.error('Error creating voice document:', error);
      toast({
        title: "Error creating document",
        description: "Failed to create document from voice input.",
        variant: "destructive",
      });
    }
  };

  const handleAcceptSuggestion = async (suggestion: AISuggestion) => {
    if (selectedText) {
      // Replace selected text
      const newContent = documentContent.replace(selectedText, suggestion.suggestedText);
      setDocumentContent(newContent);
    } else {
      // Replace entire document
      setDocumentContent(suggestion.suggestedText);
    }

    setSelectedText('');
    
    toast({
      title: "Changes applied",
      description: "AI suggestion has been applied to your document.",
    });
  };

  const handleRejectSuggestion = () => {
    setSelectedText('');
    toast({
      title: "Changes rejected",
      description: "AI suggestion has been discarded.",
    });
  };

  const handleDocumentSearch = (query: string) => {
    setSearchQuery(query);
  };

  const clearDocumentSearch = () => {
    setSearchQuery('');
  };

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  // Advanced AI command handlers
  const handleDocumentCreated = (documentId: string) => {
    loadDocuments();
    // Open the newly created document
    setTimeout(() => {
      const newDoc = documents.find(doc => doc.id === documentId);
      if (newDoc) {
        openDocument(newDoc);
      }
    }, 500);
  };

  const handleTextInsert = (text: string) => {
    if (currentDocument) {
      // Insert text at cursor position or append to document
      const newContent = documentContent + text;
      setDocumentContent(newContent);
    }
  };

  const handleTextReplace = (text: string) => {
    if (selectedText && currentDocument) {
      // Replace selected text
      const newContent = documentContent.replace(selectedText, text);
      setDocumentContent(newContent);
      setSelectedText('');
    }
  };

  const getCurrentText = () => documentContent;
  const getSelectedText = () => selectedText;
  const getCursorContext = () => {
    // Return last 500 characters as cursor context
    return documentContent.slice(-500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className={`flex flex-col h-screen bg-background ${isMobile ? 'mobile-layout' : ''}`}>
        {/* Mobile Layout */}
        {isMobile ? (
          <>
            {/* Mobile Header */}
            <header className="flex items-center justify-between p-3 border-b bg-card h-14">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileDocumentLibraryOpen(true)}
                className="touch-target"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex-1 mx-3 min-w-0">
                <input
                  value={documentTitle || 'New Document'}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  className="w-full text-base font-medium bg-transparent border-none outline-none text-center truncate"
                  placeholder="Document title..."
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="touch-target"
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </header>

            {/* Mobile Editor */}
            <main className="flex-1 overflow-hidden">
              {currentDocument ? (
                <MobileEditor
                  value={documentContent}
                  onChange={setDocumentContent}
                  isDarkMode={isDarkMode}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div>
                    <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h2 className="text-xl font-semibold mb-2">Welcome to LogosScribe</h2>
                    <p className="text-muted-foreground mb-4">
                      Your AI-powered writing studio
                    </p>
                    <Button onClick={createNewDocument} className="touch-target">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Document
                    </Button>
                  </div>
                </div>
              )}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="flex items-center justify-around border-t bg-card h-16 px-2 pb-safe">
              <Button
                variant="ghost"
                onClick={() => setMobileDocumentLibraryOpen(true)}
                className="flex flex-col items-center justify-center p-2 min-w-0 touch-target"
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs mt-1">Docs</span>
              </Button>
              
              <VoiceRecorder 
                onTranscription={handleVoiceTranscription}
                disabled={aiLoading}
              />
              
              <Button
                variant="ghost"
                onClick={() => setMobileAICommandsOpen(true)}
                className="flex flex-col items-center justify-center p-2 min-w-0 touch-target"
                disabled={!currentDocument}
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs mt-1">AI</span>
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setRightSidebarOpen(true)}
                className="flex flex-col items-center justify-center p-2 min-w-0 touch-target"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs mt-1">Chat</span>
              </Button>
              
              <Button 
                variant="ghost"
                onClick={saveDocument}
                disabled={!currentDocument}
                className="flex flex-col items-center justify-center p-2 min-w-0 touch-target"
              >
                <span className="text-lg">💾</span>
                <span className="text-xs mt-1">Save</span>
              </Button>
            </nav>

            {/* Mobile Document Library Overlay */}
            <MobileDocumentLibrary
              isOpen={mobileDocumentLibraryOpen}
              onClose={() => setMobileDocumentLibraryOpen(false)}
              documents={filteredDocuments}
              onDocumentSelect={(doc) => {
                openDocument(doc);
                setMobileDocumentLibraryOpen(false);
              }}
              onCreateNew={createNewDocument}
              onDeleteDocument={deleteDocument}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filters={filters}
              onFiltersChange={setFilters}
              categories={categories}
              loading={searchLoading}
            />

            {/* Mobile AI Commands Overlay */}
            <MobileAICommands
              isOpen={mobileAICommandsOpen}
              onClose={() => setMobileAICommandsOpen(false)}
              onCommand={handleCustomShortcut}
              aiLoading={aiLoading}
              selectedText={selectedText}
            />

            {/* Mobile AI Chat Overlay */}
            <Sheet open={rightSidebarOpen} onOpenChange={setRightSidebarOpen}>
              <SheetContent side="right" className="w-full p-0 mobile-sheet">
                <AIChatSidebar
                  isOpen={rightSidebarOpen}
                  onClose={() => setRightSidebarOpen(false)}
                  onDocumentSelect={openDocument}
                />
              </SheetContent>
            </Sheet>
          </>
        ) : (
          /* Desktop Layout */
          <>
            {/* Desktop Top Bar */}
            <header className="flex items-center justify-between p-4 border-b bg-card">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                >
                  <FileText className="h-4 w-4" />
                </Button>
                <Input
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  className="text-lg font-medium bg-transparent border-none focus:border-border max-w-md"
                  placeholder="Document title..."
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCommandSettings(true)}
                  title="Customize AI Commands"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFocusMode(!isFocusMode)}
                >
                  {isFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <UserMenu />
              </div>
            </header>

            {/* Desktop Main Content */}
            <div className="flex-1 overflow-hidden">
              <ResizablePanelGroup direction="horizontal">
                {/* Left Sidebar - Document Library */}
                {(leftSidebarOpen && !isFocusMode) && (
                  <>
                     <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                       <div className="h-full flex flex-col border-r bg-card sidebar-transition animate-slideInLeft overflow-hidden">
                         {/* ... existing sidebar content ... */}
                         {/* Fixed Header Section */}
                         <div className="flex-shrink-0 border-b bg-card">
                           {/* Title and Close Button */}
                           <div className="p-4 border-b flex items-center justify-between">
                             <h3 className="font-medium">Documents</h3>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => setLeftSidebarOpen(false)}
                             >
                               <X className="h-4 w-4" />
                             </Button>
                           </div>
                           
                           {/* New Document & Search */}
                           <div className="p-4 space-y-3">
                             <Button onClick={createNewDocument} className="w-full">
                               <Plus className="h-4 w-4 mr-2" />
                               New Document
                             </Button>
                            <DocumentSearch 
                              onSearch={handleDocumentSearch}
                              onClear={clearDocumentSearch}
                              isLoading={searchLoading}
                            />
                           </div>
                         </div>
                         
                         {/* Scrollable Content Section */}
                         <div className="flex-1 flex flex-col overflow-hidden">
                           <ScrollArea className="flex-1">
                             <div className="p-4 pb-20 space-y-4">
                               {/* Filters */}
                               <DocumentFilters 
                                 onFiltersChange={handleFiltersChange}
                                 initialFilters={filters}
                               />
                               
                               {/* Document List */}
                               <div className="min-h-0">
                                  <DocumentList
                                    documents={filteredDocuments}
                                    categories={categories}
                                    currentDocument={currentDocument}
                                    onDocumentSelect={openDocument}
                                    onDocumentUpdate={loadDocuments}
                                    searchQuery={searchQuery}
                                    selectedDocuments={selectedDocuments}
                                    onDocumentSelectionChange={setSelectedDocuments}
                                  />
                               </div>
                               
                               {/* Stats - at bottom of scrollable area */}
                               <div className="mt-auto pt-4 border-t">
                                 <DocumentStats documents={documents} />
                               </div>
                             </div>
                           </ScrollArea>
                         </div>
                       </div>
                    </ResizablePanel>
                    <ResizableHandle />
                  </>
                )}

                {/* Main Editor */}
                <ResizablePanel>
                  <div className="h-full flex flex-col">
                    {currentDocument ? (
                      <div className="flex-1">
                        <MonacoEditor
                          value={documentContent}
                          onChange={setDocumentContent}
                          isDarkMode={isDarkMode}
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-center">
                        <div>
                          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                          <h2 className="text-xl font-semibold mb-2">Welcome to LogosScribe</h2>
                          <p className="text-muted-foreground mb-4">
                            Your AI-powered writing studio for professional content creation
                          </p>
                          <Button onClick={createNewDocument}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Document
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </ResizablePanel>

                {/* Right Sidebar - AI Assistant (Desktop) */}
                {(rightSidebarOpen && !isFocusMode) && (
                  <>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={30} minSize={25} maxSize={45}>
                      <AIChatSidebar
                        isOpen={rightSidebarOpen}
                        onClose={() => setRightSidebarOpen(false)}
                        onDocumentSelect={openDocument}
                      />
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </div>

            {/* Desktop Bottom Toolbar */}
            <footer className="border-t bg-card">
              <div className="flex items-center gap-3 p-3 min-h-[68px]">
                {/* Left Section - Voice & AI Chat */}
                <div className="flex items-center gap-2 shrink-0">
                  <VoiceRecorder 
                    onTranscription={handleVoiceTranscription}
                    disabled={aiLoading}
                  />
                  {!rightSidebarOpen && (
                    <Button
                      size="sm"
                      className="h-11 bg-muted hover:bg-muted/80 text-muted-foreground border-0 hidden sm:flex items-center gap-1.5"
                      onClick={() => setRightSidebarOpen(true)}
                    >
                      💬 <span className="hidden md:inline">AI Chat</span>
                    </Button>
                  )}
                </div>
                
                {/* Center Section - Command Shortcuts */}
                <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto">
                  <CustomShortcuts 
                    onShortcut={handleCustomShortcut} 
                    isLoading={aiLoading}
                    onCommandsChange={() => setCommandSettingsKey(prev => prev + 1)}
                  />
                  <div className="w-px h-6 bg-border mx-2" />
                  <AdvancedAICommands
                    selectedDocuments={selectedDocuments}
                    onDocumentCreated={handleDocumentCreated}
                    onTextInsert={handleTextInsert}
                    onTextReplace={handleTextReplace}
                    getCurrentText={getCurrentText}
                    getSelectedText={getSelectedText}
                    getCursorContext={getCursorContext}
                  />
                </div>
                
                {/* Right Section - Word Count & Save */}
                <div className="flex items-center gap-2 shrink-0">
                  {currentDocument && (
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {(() => {
                          const count = documentContent.trim().split(/\s+/).filter(word => word.length > 0).length;
                          return `${count} words`;
                        })()}
                      </div>
                      {!aiLoading && (
                        <div className="auto-save-indicator text-xs text-green-600 dark:text-green-400 animate-fadeInScale">
                          ✓ <span className="hidden sm:inline">Saved</span>
                        </div>
                      )}
                      {aiLoading && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="hidden sm:inline">Processing...</span>
                        </div>
                      )}
                    </div>
                  )}
                  <Button 
                    size="sm" 
                    className="h-11 bg-save-button hover:bg-save-button/90 text-save-button-foreground border-0 min-w-fit"
                    onClick={saveDocument}
                    disabled={!currentDocument}
                  >
                    💾 <span className="hidden sm:inline ml-1">Save</span>
                  </Button>
                </div>
              </div>
            </footer>
          </>
        )}

        {/* AI Suggestion Panel */}
        <AISuggestionPanel
          suggestion={aiSuggestion}
          isLoading={aiLoading}
          onAccept={handleAcceptSuggestion}
          onReject={handleRejectSuggestion}
          onClose={() => setAiSuggestion(null)}
        />

        {/* Command Settings Modal */}
        <CommandSettings
          showSettings={showCommandSettings}
          onClose={() => setShowCommandSettings(false)}
          onCommandsUpdated={() => setCommandSettingsKey(prev => prev + 1)}
        />
      </div>
    </div>
  );
}