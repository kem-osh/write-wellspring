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

interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Auto-save document content
  useEffect(() => {
    if (currentDocument && documentContent !== currentDocument.content) {
      const timeoutId = setTimeout(() => {
        saveDocument();
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [documentContent, currentDocument]);

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
      title: "Untitled Document",
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
      const updatedDoc = { ...currentDocument, title: documentTitle, content: documentContent };
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

  const handleCustomShortcut = (prompt: string) => {
    // Placeholder for AI functionality
    toast({
      title: "AI Shortcut",
      description: `Will process: ${prompt}`,
    });
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
                      <Button onClick={createNewDocument} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        New Document
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-4 space-y-2">
                        {documents.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-sm">No documents yet</p>
                            <p className="text-xs">Create your first document to get started</p>
                          </div>
                        ) : (
                          documents.map((doc) => (
                            <div
                              key={doc.id}
                              className={`p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                                currentDocument?.id === doc.id ? 'bg-accent' : ''
                              }`}
                              onClick={() => openDocument(doc)}
                            >
                              <h3 className="font-medium text-sm truncate">{doc.title}</h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(doc.updated_at).toLocaleDateString()}
                              </p>
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
              <Button variant="outline" size="sm">
                <Mic className="h-3 w-3 mr-1" />
                Voice
              </Button>
              <Button variant="outline" size="sm">
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
              <CustomShortcuts onShortcut={handleCustomShortcut} />
            </div>
            
            <Button variant="outline" size="sm" onClick={saveDocument}>
              Save
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}