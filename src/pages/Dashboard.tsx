import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Moon, Sun, Maximize2, Minimize2, Plus, FileText, Settings, X, Mic } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MonacoEditor } from "@/components/MonacoEditor";
import { UserMenu } from "@/components/UserMenu";
import { CustomShortcuts } from "@/components/CustomShortcuts";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { AISuggestionPanel } from "@/components/AISuggestionPanel";
import { DocumentSearch } from "@/components/DocumentSearch";
import { Badge } from "@/components/ui/badge";

interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
  word_count?: number;
}

interface AISuggestion {
  id: string;
  type: 'light-edit' | 'expand' | 'condense';
  originalText: string;
  suggestedText: string;
  changes?: boolean;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Update filtered documents when documents change
  useEffect(() => {
    setFilteredDocuments(documents);
  }, [documents]);

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
      setDocuments(data || []);
    }
    setLoading(false);
  };

  const createNewDocument = async () => {
    if (!user) return;

    const newDoc = {
      title: "New Document",
      content: "",
      user_id: user.id,
      category: "general",
      status: "draft",
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

  const handleCustomShortcut = async (type: 'light-edit' | 'expand' | 'condense', prompt: string) => {
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
                          'ai-condense-content';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          content: selectedText ? undefined : documentContent,
          selectedText: selectedText || undefined
        }
      });

      if (error) throw error;

      const suggestion: AISuggestion = {
        id: Date.now().toString(),
        type,
        originalText: textToProcess,
        suggestedText: data[type === 'light-edit' ? 'editedText' : 
                          type === 'expand' ? 'expandedText' : 'condensedText'],
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
    if (currentDocument) {
      // Append to existing document
      const newContent = documentContent + (documentContent ? '\n\n' : '') + text;
      setDocumentContent(newContent);
      toast({
        title: "Voice added to document",
        description: "Transcription has been added to your current document.",
      });
    } else {
      // Create new document
      await createNewDocumentFromVoice(text);
    }
  };

  const createNewDocumentFromVoice = async (content: string) => {
    if (!user) return;

    try {
      // Generate AI title first
      const { data: titleData } = await supabase.functions.invoke('ai-generate-title', {
        body: { content }
      });

      const title = titleData?.title || 'Voice Note';

      const newDoc = {
        title,
        content,
        user_id: user.id,
        category: "voice-note",
        status: "draft",
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
    if (!query.trim()) {
      setFilteredDocuments(documents);
      return;
    }

    const filtered = documents.filter(doc => 
      doc.title.toLowerCase().includes(query.toLowerCase()) ||
      doc.content.toLowerCase().includes(query.toLowerCase()) ||
      doc.category.toLowerCase().includes(query.toLowerCase())
    );
    
    setFilteredDocuments(filtered);
  };

  const clearDocumentSearch = () => {
    setFilteredDocuments(documents);
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
      <div className="flex flex-col h-screen bg-background">
        {/* Top Bar */}
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

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            {/* Left Sidebar - Document Library */}
            {(leftSidebarOpen && !isFocusMode) && (
              <>
                <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                  <div className="h-full flex flex-col border-r bg-card sidebar-transition animate-slideInLeft">
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
                    <div className="p-4 border-b">
                      <Button onClick={createNewDocument} className="w-full mb-3">
                        <Plus className="h-4 w-4 mr-2" />
                        New Document
                      </Button>
                      <DocumentSearch 
                        onSearch={handleDocumentSearch}
                        onClear={clearDocumentSearch}
                      />
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-4 space-y-2">
                        {filteredDocuments.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-sm">
                              {documents.length === 0 ? "No documents yet" : "No matching documents"}
                            </p>
                            <p className="text-xs">
                              {documents.length === 0 ? "Create your first document to get started" : "Try a different search term"}
                            </p>
                          </div>
                        ) : (
                          filteredDocuments.map((doc) => (
                            <div
                              key={doc.id}
                              className={`p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                                currentDocument?.id === doc.id ? 'bg-accent' : ''
                              }`}
                              onClick={() => openDocument(doc)}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-medium text-sm truncate flex-1">{doc.title}</h3>
                                <Badge variant="secondary" className="text-xs">
                                  {doc.status}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(doc.updated_at).toLocaleDateString()}
                                </p>
                                {doc.word_count && (
                                  <p className="text-xs text-muted-foreground">
                                    {doc.word_count} words
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
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

            {/* Right Sidebar - AI Assistant (placeholder) */}
            {(rightSidebarOpen && !isFocusMode) && (
              <>
                <ResizableHandle />
                <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                  <div className="h-full flex flex-col border-l bg-card sidebar-transition animate-slideInRight">
                    <div className="p-4 border-b flex items-center justify-between">
                      <h3 className="font-medium">AI Assistant</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRightSidebarOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 p-4 flex items-center justify-center text-center">
                      <div>
                        <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground">
                          AI assistant coming soon
                        </p>
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>

        {/* Bottom Toolbar */}
        <footer className="p-4 border-t bg-card">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <VoiceRecorder 
                onTranscription={handleVoiceTranscription}
                disabled={aiLoading}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCustomShortcut('light-edit', 'Fix spelling, grammar, and formatting')}
                disabled={!currentDocument || aiLoading || !documentContent.trim()}
              >
                ✨ Light Edit
              </Button>
              {!rightSidebarOpen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRightSidebarOpen(true)}
                >
                  💬 AI Chat
                </Button>
              )}
            </div>
            
            <div className="flex-1 max-w-md">
              <CustomShortcuts 
                onShortcut={handleCustomShortcut} 
                isLoading={aiLoading}
              />
            </div>
            
            <div className="flex items-center gap-2">
              {currentDocument && (
                <div className="text-xs text-muted-foreground mr-2">
                  {documentContent.trim().split(/\s+/).filter(word => word.length > 0).length} words
                </div>
              )}
              <Button variant="outline" size="sm" onClick={saveDocument}>
                Save
              </Button>
            </div>
          </div>
        </footer>

        {/* AI Suggestion Panel */}
        <AISuggestionPanel
          suggestion={aiSuggestion}
          isLoading={aiLoading}
          onAccept={handleAcceptSuggestion}
          onReject={handleRejectSuggestion}
          onClose={() => setAiSuggestion(null)}
        />
      </div>
    </div>
  );
}