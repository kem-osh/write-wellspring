import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Save, 
  Clock,
  FileText,
  MessageSquare,
  Settings,
  Maximize2,
  Minimize2,
  MoreVertical
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDevice } from "@/hooks/useDevice";
import { MonacoEditor } from "@/components/MonacoEditor";
import { MobileEditor } from "@/components/MobileEditor";
import { AIChatSidebar } from "@/components/AIChatSidebar";
import { AdvancedAICommands } from "@/components/AdvancedAICommands";
import { CompactMoreCommands } from "@/components/CompactMoreCommands";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { AISuggestionPanel } from "@/components/AISuggestionPanel";
import { ContextualAIToolbar } from "@/components/ContextualAIToolbar";
import { AnalysisModal } from "@/components/AnalysisModal";
import { FactCheckModal } from "@/components/FactCheckModal";
import { useSettingsStore } from "@/stores/settingsStore";
import { UnifiedCommand } from '@/types/commands';
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

interface AISuggestion {
  id: string;
  type: 'light-edit' | 'expand' | 'condense' | 'outline';
  originalText: string;
  suggestedText: string;
  changes?: boolean;
}

export default function Editor() {
  const navigate = useNavigate();
  const { documentId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettingsStore();
  const { isMobile } = useDevice();

  const [document, setDocument] = useState<Document | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveIndicator, setSaveIndicator] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Analysis/Fact-check results
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [factCheckResult, setFactCheckResult] = useState<any>(null);
  const [showFactCheckModal, setShowFactCheckModal] = useState(false);
  const [showMoreCommands, setShowMoreCommands] = useState(false);
  
  // Editor reference for text selection
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-title generation constants
  const MIN_CONTENT_LENGTH = 50;
  const AUTO_TITLE_THRESHOLD = 200;

  // Load document on mount
  useEffect(() => {
    if (documentId && user) {
      loadDocument();
    } else if (!documentId) {
      // Create new document
      setDocument(null);
      setDocumentTitle("New Document");
      setDocumentContent("");
      setLoading(false);
    }
  }, [documentId, user]);

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && document?.id && !document.id.includes('temp-')) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, documentContent, documentTitle]);

  // Warn about unsaved changes when leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadDocument = async () => {
    if (!documentId || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: "Document not found",
            description: "The document may have been deleted or you don't have access to it.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
        throw error;
      }

      setDocument(data);
      setDocumentTitle(data.title);
      setDocumentContent(data.content || '');
      setLastSaved(new Date(data.updated_at));
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading document:', error);
      toast({
        title: "Error loading document",
        description: "Failed to load the document. Please try again.",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSave = useCallback(async () => {
    if (!user || !documentContent.trim() || documentContent.length < MIN_CONTENT_LENGTH) {
      return;
    }

    setSaving(true);
    setSaveIndicator('saving');

    try {
      let docToSave = document;
      
      // If no document exists yet, create one
      if (!docToSave || docToSave.id.includes('temp-')) {
        const { data: newDoc, error: insertError } = await supabase
          .from('documents')
          .insert([{
            title: documentTitle,
            content: documentContent,
            category: 'general',
            status: 'draft',
            user_id: user.id,
            word_count: documentContent.split(' ').filter(word => word.length > 0).length
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        
        docToSave = newDoc;
        setDocument(newDoc);
        
        // Update URL to reflect the new document ID
        navigate(`/editor/${newDoc.id}`, { replace: true });
      } else {
        // Update existing document
        const wordCount = documentContent.split(' ').filter(word => word.length > 0).length;
        
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            title: documentTitle,
            content: documentContent,
            word_count: wordCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', docToSave.id);

        if (updateError) throw updateError;
        
        setDocument(prev => prev ? { ...prev, title: documentTitle, content: documentContent, word_count: wordCount } : null);
      }

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      setSaveIndicator('saved');
      
      // Clear saved indicator after 2 seconds
      setTimeout(() => setSaveIndicator(null), 2000);
    } catch (error) {
      console.error('Error saving document:', error);
      setSaveIndicator('error');
      toast({
        title: "Save failed",
        description: "Failed to save your document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [user, document, documentTitle, documentContent, navigate]);

  const handleManualSave = async () => {
    await handleAutoSave();
    toast({
      title: "Document saved",
      description: "Your changes have been saved successfully.",
    });
  };

  const handleContentChange = (newContent: string) => {
    setDocumentContent(newContent);
    setHasUnsavedChanges(true);
    
    // Auto-generate title if document is new and has enough content
    if ((!document || document.id.includes('temp-')) && 
        documentTitle === "New Document" && 
        newContent.length >= AUTO_TITLE_THRESHOLD) {
      generateTitle(newContent);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setDocumentTitle(newTitle);
    setHasUnsavedChanges(true);
  };

  const generateTitle = async (content: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-title', {
        body: { content: content.substring(0, 500) }
      });

      if (error) throw error;

      if (data?.title) {
        setDocumentTitle(data.title);
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Error generating title:', error);
    }
  };

  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  }, []);

  const getSelectedTextFromEditor = useCallback(() => {
    if (editorRef.current && monacoRef.current) {
      const selection = editorRef.current.getSelection();
      const model = editorRef.current.getModel();
      if (selection && model && !selection.isEmpty()) {
        return model.getValueInRange(selection);
      }
    }
    return '';
  }, []);

  const replaceSelectedText = useCallback((newText: string) => {
    if (editorRef.current && selectedText) {
      const selection = editorRef.current.getSelection();
      if (selection) {
        editorRef.current.executeEdits('ai-command', [{
          range: selection,
          text: newText,
          forceMoveMarkers: true
        }]);
        setSelectedText('');
      }
    }
  }, [selectedText]);

  const executeAICommand = useCallback(async (command: UnifiedCommand) => {
    if (!document && !documentContent.trim()) {
      toast({
        title: "No content to process",
        description: "Please write some content first.",
        variant: "destructive",
      });
      return;
    }

    const currentSelectedText = getSelectedTextFromEditor();
    const textToProcess = currentSelectedText || documentContent;
    
    if (!textToProcess?.trim() || textToProcess.length < 10) {
      toast({
        title: "No content to process",
        description: "Please write or select text first.",
        variant: "destructive",
      });
      return;
    }

    setAiLoading(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const payload = {
        command,
        content: currentSelectedText ? undefined : documentContent,
        selectedText: currentSelectedText || undefined,
        userId: authUser.id
      };

      const { data, error } = await supabase.functions.invoke(command.function_name, {
        body: payload
      });

      if (error) throw error;

      const result = data?.result;
      
      if (!result) {
        throw new Error(`No result returned from AI command '${command.name}'`);
      }

      // Handle analysis/fact-check results differently
      if (command.function_name === 'ai-fact-check' || command.function_name === 'ai-analyze') {
        if (command.function_name === 'ai-analyze') {
          setAnalysisResult(result);
          setShowAnalysisModal(true);
        } else {
          setFactCheckResult(data);
          setShowFactCheckModal(true);
        }
        
        toast({
          title: `${command.name} complete`,
          description: "Analysis is ready for review.",
        });
      } else {
        // Replace text for other commands
        if (currentSelectedText && editorRef.current) {
          replaceSelectedText(result);
        } else {
          setDocumentContent(result);
        }
        
        setHasUnsavedChanges(true);
        
        toast({
          title: `${command.name} completed`,
          description: currentSelectedText ? 'Selected text updated' : 'Document updated',
        });
      }
    } catch (error) {
      console.error('AI command error:', error);
      toast({
        title: "AI command failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  }, [document, documentContent, getSelectedTextFromEditor, replaceSelectedText, toast]);

  const handleBackToLibrary = () => {
    if (hasUnsavedChanges) {
      if (confirm("You have unsaved changes. Do you want to save before leaving?")) {
        handleManualSave().then(() => navigate('/'));
      } else {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'polished': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'final': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-surface/30 to-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface/30 to-background">
      <div className="h-screen flex flex-col">
        {/* Top Bar - Minimal */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 bg-surface/60 backdrop-blur-sm border-b border-border/50 shadow-sm">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleBackToLibrary}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
            
            <div className="flex items-center gap-3">
              <Input
                value={documentTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-lg font-semibold bg-transparent border-none shadow-none px-0 focus-visible:ring-0 min-w-[200px]"
                placeholder="Document title..."
              />
              
              {document && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getStatusColor(document.status)}>
                    {document.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {document.word_count || 0} words
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Save Status Indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {saveIndicator === 'saving' && (
                <>
                  <Clock className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {saveIndicator === 'saved' && (
                <>
                  <Clock className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">Saved</span>
                </>
              )}
              {saveIndicator === 'error' && (
                <>
                  <Clock className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">Error</span>
                </>
              )}
              {!saveIndicator && lastSaved && (
                <span>Saved {format(lastSaved, 'HH:mm')}</span>
              )}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualSave}
              disabled={saving || !hasUnsavedChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsFocusMode(!isFocusMode)}
            >
              {isFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            {/* Editor Panel */}
            <ResizablePanel>
              <div className="h-full flex flex-col">
                {/* Editor */}
                <div className="flex-1 p-6">
                  {isMobile ? (
                    <MobileEditor
                      value={documentContent}
                      onChange={handleContentChange}
                      isDarkMode={false}
                      settings={settings}
                    />
                  ) : (
                    <MonacoEditor
                      value={documentContent}
                      onChange={handleContentChange}
                      isDarkMode={document?.id ? false : true}
                      settings={settings}
                      onSelectionChange={setSelectedText}
                      onProvideEditor={handleEditorMount}
                    />
                  )}
                </div>

                {/* AI Suggestion Panel */}
                {aiSuggestion && (
                  <AISuggestionPanel
                    suggestion={aiSuggestion}
                    isLoading={aiLoading}
                    onAccept={(suggestion) => {
                      if (aiSuggestion.type === 'light-edit' && selectedText) {
                        replaceSelectedText(suggestion.suggestedText);
                      } else {
                        setDocumentContent(suggestion.suggestedText);
                      }
                      setAiSuggestion(null);
                      setHasUnsavedChanges(true);
                    }}
                    onReject={() => setAiSuggestion(null)}
                    onClose={() => setAiSuggestion(null)}
                  />
                )}
              </div>
            </ResizablePanel>

            {/* AI Sidebar */}
            {rightSidebarOpen && !isFocusMode && (
              <>
                <ResizableHandle />
                <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                  <AIChatSidebar
                    isOpen={true}
                    onClose={() => setRightSidebarOpen(false)}
                    onDocumentSelect={(doc) => navigate(`/editor/${doc.id}`)}
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>

        {/* Bottom Toolbar - AI Commands */}
        {!isFocusMode && (
          <div className="flex-shrink-0 p-4 bg-surface/60 backdrop-blur-sm border-t border-border/50 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AdvancedAICommands
                  selectedDocuments={[]}
                  onDocumentCreated={(docId) => navigate(`/editor/${docId}`)}
                  onTextInsert={(text) => {
                    const newContent = documentContent + text;
                    setDocumentContent(newContent);
                    setHasUnsavedChanges(true);
                  }}
                  onTextReplace={(text) => {
                    if (selectedText && editorRef.current) {
                      replaceSelectedText(text);
                    } else {
                      setDocumentContent(text);
                    }
                    setHasUnsavedChanges(true);
                  }}
                  getCurrentText={() => documentContent}
                  getSelectedText={() => selectedText}
                />
                
                <CompactMoreCommands
                  selectedDocuments={[]}
                  onContinue={() => {}}
                  onRewrite={() => {}}
                  onFactCheck={() => {}}
                  onSynthesize={() => {}}
                  onCompare={() => {}}
                  onViewAllCommands={() => setShowMoreCommands(!showMoreCommands)}
                  isLoading={aiLoading}
                />
              </div>

              <div className="flex items-center gap-3">
                <VoiceRecorder
                  onTranscription={(transcript) => {
                    const newContent = documentContent + '\n\n' + transcript;
                    setDocumentContent(newContent);
                    setHasUnsavedChanges(true);
                  }}
                />
                
                {selectedText && (
                  <ContextualAIToolbar
                    selectedText={selectedText}
                    onCommand={executeAICommand}
                    aiLoading={aiLoading}
                    onClose={() => setSelectedText('')}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Modals */}
      <AnalysisModal
        open={showAnalysisModal}
        onOpenChange={setShowAnalysisModal}
        analysis={analysisResult}
      />

      <FactCheckModal
        open={showFactCheckModal}
        onOpenChange={setShowFactCheckModal}
        factCheckData={factCheckResult}
      />
    </div>
  );
}