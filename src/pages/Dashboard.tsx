import { useState, useEffect, lazy, Suspense, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Moon, Sun, Maximize2, Minimize2, Plus, FileText, Settings, X, Mic, Loader2, Menu, MoreVertical, MessageSquare, Upload } from "lucide-react";
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
import { FullScreenAIChat } from "@/components/chat";
import { DocumentSearch } from "@/components/DocumentSearch";
import { DocumentFilters } from "@/components/DocumentFilters";
import { DocumentList } from "@/components/DocumentList";
import { DocumentStats } from "@/components/DocumentStats";
import { useEmbeddings } from "@/hooks/useEmbeddings";
import { useDocumentStore } from "@/lib/stores/useDocumentStore";
import { Badge } from "@/components/ui/badge";
import { CommandSettings } from "@/components/CommandSettings";
import { useDocumentSelection } from "@/hooks/useDocumentSelection";
import { ContextualAIToolbar } from "@/components/ContextualAIToolbar";
import { SettingsModal } from "@/components/SettingsModal";
import { useHaptics } from "@/hooks/useHaptics";
import { AnalysisModal } from "@/components/AnalysisModal";
import { FactCheckModal } from "@/components/FactCheckModal";
import { useSettingsStore } from "@/stores/settingsStore";
import { UnifiedCommand } from '@/types/commands';
import { BulkUploader } from '@/features/corpus/components/BulkUploader';

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
  const { settings } = useSettingsStore();
  // Document state management via Zustand store
  const {
    documents,
    currentDocument,
    loading: documentsLoading,
    hasMore,
    setCurrentDocument,
    loadDocuments,
    loadMoreDocuments,
    addDocument,
    updateDocument,
    removeDocument
  } = useDocumentStore();
  
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
  const [showCommandSettings, setShowCommandSettings] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [commandSettingsKey, setCommandSettingsKey] = useState(0);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveIndicator, setSaveIndicator] = useState<'saved' | 'saving' | 'error' | null>(null);
  
  // Analysis/Fact-check results
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [factCheckResult, setFactCheckResult] = useState<any>(null);
  const [showFactCheckModal, setShowFactCheckModal] = useState(false);
  const [showMoreCommands, setShowMoreCommands] = useState(false);
  const [showBulkUploader, setShowBulkUploader] = useState(false);
  
  // Auto-title generation constants
  const MIN_CONTENT_LENGTH = 50; // Minimum characters before saving/titling
  const AUTO_TITLE_THRESHOLD = 200; // Characters needed for title generation
  
  // Editor reference for text selection
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  
  // Mobile state
  const [mobileDocumentLibraryOpen, setMobileDocumentLibraryOpen] = useState(false);
  const [mobileAICommandsOpen, setMobileAICommandsOpen] = useState(false);
  const [fullScreenChatOpen, setFullScreenChatOpen] = useState(false);
  
  // Import haptics hook
  const { impactLight, notificationSuccess, notificationError } = useHaptics();
  const { isMobile, isTablet, isDesktop } = useDevice();
  
  // Document selection hook
  const {
    selectedDocuments,
    toggleDocumentSelection,
    selectAllDocuments,
    clearSelection,
    isDocumentSelected,
    selectionCount
  } = useDocumentSelection();

  // Helper functions for editor text selection
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
        setSelectedText(''); // Clear selection after replacement
      }
    }
  }, [selectedText]);

  // Function to handle editor mount and expose editor reference
  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    console.log('Monaco editor mounted and references set');
  }, []);

  // Update filtered documents when documents, search, or filters change
  useEffect(() => {
    applyFiltersAndSearch();
  }, [documents, searchQuery, filters]);

  // Theme management from settings
  useEffect(() => {
    const applyTheme = () => {
      if (settings.theme === 'dark' || 
         (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      } else {
        document.documentElement.classList.remove('dark');
        setIsDarkMode(false);
      }
    };

    applyTheme();

    if (settings.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = applyTheme;
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

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

  // Load initial data
  useEffect(() => {
    if (user) {
      loadDocuments({ userId: user.id });
      loadCategories();
    }
  }, [user]);

  // Update loading state based on store
  useEffect(() => {
    setLoading(documentsLoading && categories.length === 0);
  }, [documentsLoading, categories]);

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

    console.log('Creating new document...'); // Debug log

    // Create a temporary document object that shows the editor
    const newDoc: Document = {
      id: 'temp-' + Date.now(),
      title: "New Document",
      content: "",
      category: settings.defaultCategory,
      status: "draft",
      word_count: 0,
      folder_id: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Set the temporary document as current so editor shows (add user_id)
    const newDocWithUser = { ...newDoc, user_id: user?.id };
    setCurrentDocument(newDocWithUser);
    setDocumentTitle(newDoc.title);
    setDocumentContent(newDoc.content);
    
    // Reset save indicators
    setSaveIndicator(null);
    setLastSaved(null);

    // Close sidebars on mobile for better focus
    if (window.innerWidth < 768) {
      setLeftSidebarOpen(false);
      setRightSidebarOpen(false);
    }
    
    console.log('New document created'); // Debug log
    toast({
      title: "New document ready",
      description: "Start typing to create your document.",
    });
  };

  const openDocument = (doc: Document) => {
    const docWithUserId = { ...doc, user_id: doc.user_id || user?.id };
    setCurrentDocument(docWithUserId);
    setDocumentTitle(doc.title);
    setDocumentContent(doc.content);
  };

  // Enhanced AI command execution with proper error handling and text replacement
  const executeAICommand = useCallback(async (
    command: UnifiedCommand
  ) => {
    if (!currentDocument) {
      toast({
        title: "No document selected",
        description: "Please create or select a document first.",
        variant: "destructive",
      });
      return;
    }

    // Get text to process (selected or full content)
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

    console.log(`Executing AI command: ${command.name}`, {
      functionName: command.function_name,
      selectedText: !!currentSelectedText,
      textLength: textToProcess.length,
      model: command.ai_model
    });

    setAiLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use the command's function_name directly (no more switch/case logic!)
      const functionName = command.function_name;
      
      console.log(`Calling ${functionName}...`);
      
      // Universal payload structure for ALL AI functions
      const payload = {
        command,
        content: currentSelectedText ? undefined : documentContent,
        selectedText: currentSelectedText || undefined,
        userId: user.id
      };

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload
      });

      console.log('AI Command Result:', JSON.stringify(data, null, 2));
      console.log('Available keys in response:', Object.keys(data || {}));
      
      if (error) throw error;

      // Standardized response handling - all functions return { result }
      const result = data?.result;
      
      console.log('Extracted result length:', result?.length || 0);
      console.log('Result preview:', result?.slice(0, 100) + '...');
      
      // Handle empty results gracefully
      if (result === undefined || result === null) {
        console.error('No valid result field found in response:', data);
        throw new Error(`No result returned from AI command '${command.name}'. Response keys: ${Object.keys(data || {}).join(', ')}`);
      }
      
      if (typeof result === 'string' && result.trim() === '') {
        console.warn('AI returned empty result for command:', command.name);
        toast({
          title: "AI returned empty result",
          description: `The AI didn't generate any content for the '${command.name}' command. Please try again or use a different command.`,
          variant: "destructive",
        });
        return;
      }

      console.log(`AI command ${command.name} completed successfully`);

      // Handle analysis/fact-check results differently (don't replace content)
      if (functionName === 'ai-fact-check' || functionName === 'ai-analyze') {
        if (functionName === 'ai-analyze') {
          setAnalysisResult(result);
          setShowAnalysisModal(true);
          toast({
            title: "Analysis Complete",
            description: "Your document analysis is ready for review.",
          });
        } else {
          // FACT CHECK
          setFactCheckResult(data);
          setShowFactCheckModal(true);
          toast({
            title: 'Fact-Check Complete',
            description: 'Fact-check analysis is ready for review.',
          });
        }
        setAiLoading(false);
        return;
      }

      // Replace text in editor for other commands
      if (currentSelectedText && editorRef.current) {
        replaceSelectedText(result);
      } else {
        setDocumentContent(result);
      }
      
      toast({
        title: `${command.name} completed`,
        description: currentSelectedText ? 'Selected text updated' : 'Document updated',
      });

      // Trigger auto-save after successful AI edit
      setTimeout(() => {
        if (typeof handleAutoSave === 'function') {
          handleAutoSave();
        }
      }, 1000);

    } catch (error) {
      console.error(`AI command ${command.name} error:`, error);
      toast({
        title: `Failed to execute ${command.name}`,
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  }, [currentDocument, documentContent, getSelectedTextFromEditor, replaceSelectedText, toast]);

  // Update handleCustomShortcut to use the new executeAICommand
  const handleCustomShortcut = useCallback(async (
    command: UnifiedCommand
  ) => {
    await executeAICommand(command);
  }, [executeAICommand]);

  // Load documents and categories on mount
  useEffect(() => {
    if (user) {
      loadDocuments({ userId: user.id });
      loadCategories();
    }
  }, [user, loadDocuments]);

  const handleAutoSave = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Don't save empty documents
    if (!documentContent || documentContent.trim().length < MIN_CONTENT_LENGTH) {
      console.log('Content too short, skipping save');
      return;
    }

    setSaveIndicator('saving');

    // Check if this is a new document that needs a title
    const needsTitle = 
      documentTitle === 'New Document' || 
      documentTitle === '' || 
      !documentTitle;

    const hasEnoughContent = documentContent.trim().length >= AUTO_TITLE_THRESHOLD;

    try {
      // Declare classification variables
      let autoCategory = settings.defaultCategory;
      let autoStatus = 'draft';
      
      // Generate title if needed and has enough content
      let finalTitle = documentTitle;
      if (needsTitle && hasEnoughContent && !isGeneratingTitle && settings.autoGenerateTitles) {
        setIsGeneratingTitle(true);
        
        // Extract first two paragraphs for better title generation
        const paragraphs = documentContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const titleContent = paragraphs.slice(0, 2).join('\n\n');
        
        const { data: titleData, error: titleError } = await supabase.functions.invoke(
          'ai-generate-title',
          {
            body: {
              content: titleContent, // Use extracted paragraphs instead of substring
              userId: user.id
            }
          }
        );

        if (titleData?.title && !titleError) {
          finalTitle = titleData.title;
          setDocumentTitle(finalTitle);
          toast({
            title: "Title Generated",
            description: `AI created: "${finalTitle}"`,
          });
        }
        
        // Also classify the document for category and status
        try {
          const { data: classification } = await supabase.functions.invoke('ai-classify-document', {
            body: { content: documentContent }
          });
          
          if (classification?.category) {
            autoCategory = classification.category;
            console.log('Auto-classified category:', autoCategory);
          }
          if (classification?.status) {
            autoStatus = classification.status;
            console.log('Auto-classified status:', autoStatus);
          }
          
        } catch (error) {
          console.error('Error classifying document:', error);
        }
        
        setIsGeneratingTitle(false);
      }

      const wordCount = documentContent.trim().split(/\s+/).filter(word => word.length > 0).length;

      // Save document with generated or existing title
      if (currentDocument?.id && !currentDocument.id.startsWith('temp-')) {
        // Update existing document in database
        const { error } = await supabase
          .from('documents')
          .update({
            title: finalTitle,
            content: documentContent,
            word_count: wordCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentDocument.id);

        if (!error) {
          // Update local state
          const updatedDoc = { 
            ...currentDocument, 
            title: documentTitle, 
            content: documentContent, 
            updated_at: new Date().toISOString() 
          };
          setCurrentDocument(updatedDoc);
          updateDocument(currentDocument.id, updatedDoc);
          
          setLastSaved(new Date());
          setSaveIndicator('saved');
        } else {
          setSaveIndicator('error');
          throw error;
        }
      } else {
        // Create new document in database (for temp documents or null currentDocument)
        const { data: newDoc, error } = await supabase
          .from('documents')
          .insert({
            title: finalTitle,
            content: documentContent,
            category: autoCategory || settings.defaultCategory,
            status: autoStatus || 'draft',
            word_count: wordCount,
            user_id: user.id
          })
          .select()
          .single();

        if (newDoc && !error) {
          setCurrentDocument(newDoc);
          addDocument(newDoc);
          setLastSaved(new Date());
          setSaveIndicator('saved');
        } else {
          setSaveIndicator('error');
          throw error;
        }
      }

      // Generate embeddings silently in background
      if (currentDocument?.id || (currentDocument === null && documentContent.trim())) {
        const docId = currentDocument?.id || documents.find(d => d.content === documentContent)?.id;
        if (docId) {
          generateEmbeddingsSilently(docId, documentContent);
        }
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      setSaveIndicator('error');
      toast({
        title: "Error saving document",
        description: error instanceof Error ? error.message : "Failed to save document",
        variant: "destructive",
      });
    }
  }, [user, documentContent, documentTitle, currentDocument, isGeneratingTitle, settings, documents, toast, generateEmbeddingsSilently]);

  // Auto-save document content with title generation
  useEffect(() => {
    // Don't save empty documents
    if (!documentContent || documentContent.trim().length < MIN_CONTENT_LENGTH) {
      return;
    }

    if (currentDocument && documentContent !== currentDocument.content && settings.autoSaveInterval > 0) {
      const timeoutId = setTimeout(() => {
        handleAutoSave();
      }, settings.autoSaveInterval);

      return () => clearTimeout(timeoutId);
    }
  }, [documentContent, currentDocument, settings.autoSaveInterval, handleAutoSave]);

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
      updateDocument(currentDocument.id, updatedDoc);
      
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
      removeDocument(docId);
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

  const handleVoiceTranscription = async (text: string) => {
    if (!text) {
      console.warn('handleVoiceTranscription called with empty text');
      return;
    }

    console.log('Voice transcription received:', text.length, 'characters');

    if (currentDocument) {
      console.log('Appending to existing document:', currentDocument.id);
      const newContent = documentContent ? `${documentContent}\n\n${text}` : text;
      setDocumentContent(newContent);
      toast({
        title: 'Voice Added',
        description: 'Transcription has been added to your document.',
      });
    } else {
      console.log('No current document - creating new voice document');
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
          // Create a minimal command object for title generation
          const titleCommand: UnifiedCommand = {
            id: 'temp-title-gen',
            user_id: user.id,
            name: 'Generate Title',
            ai_model: 'gpt-5-nano-2025-08-07',
            system_prompt: 'Generate a concise, descriptive title for this document.',
            prompt: 'Generate a short, clear title that captures the main topic:',
            max_tokens: 30,
            temperature: 0.3,
            function_name: 'ai-generate-title',
            category: 'utility',
            icon: 'heading',
            sort_order: 0
          };

          // Use universal payload structure
          const { data: titleData, error: titleError } = await supabase.functions.invoke('ai-generate-title', {
            body: {
              command: titleCommand,
              content: content.substring(0, 500), // More context for better titles
              userId: user.id
            }
          });

          if (titleError) {
            console.error('Title generation error:', titleError);
          } else if (titleData?.result) {
            const currentDate = new Date().toLocaleDateString('en-US', { 
              month: '2-digit', 
              day: '2-digit', 
              year: 'numeric' 
            });
            title = `${titleData.result} - ${currentDate}`;
          }
        } catch (error) {
          console.error('Failed to generate title:', error);
          // Fallback to time-based title if AI fails
          const currentTime = new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          title = `Voice Note - ${currentTime}`;
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

      addDocument(data);
      setCurrentDocument(data);
      setDocumentTitle(data.title);
      setDocumentContent(data.content);
      
      // Trigger auto-save to ensure document is properly synced
      setTimeout(() => {
        if (typeof handleAutoSave === 'function') {
          handleAutoSave();
        }
      }, 1000);
      
      // Generate embeddings silently for better search
      generateEmbeddingsSilently(data.id, data.content);
      
      toast({
        title: "Voice note created",
        description: `Created "${title}" from your voice input.`,
      });
      
      console.log('Successfully created voice document:', data.id);
    } catch (error) {
      console.error('Error creating voice document:', error);
      toast({
        title: "Error creating document",
        description: "Failed to create document from voice input. Please try again.",
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
    if (user) {
      loadDocuments({ userId: user.id });
    }
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
            {/* Mobile Header - Sticky */}
            <header className="sticky top-0 z-50 flex items-center justify-between p-3 border-b bg-card/95 backdrop-blur-sm h-14">
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
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettingsModal(true)}
                  className="touch-target md:hidden"
                  aria-label="Open settings"
                >
                  <Settings className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="touch-target"
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </header>

            {/* Mobile Editor */}
            <main className="flex-1 overflow-hidden pb-16"> {/* Add bottom padding for fixed nav */}
              {currentDocument ? (
                <MobileEditor
                  value={documentContent}
                  onChange={setDocumentContent}
                  isDarkMode={isDarkMode}
                  settings={settings}
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

            {/* Mobile Bottom Navigation - Fixed */}
            <MobileBottomNav
              onDocumentLibrary={() => setMobileDocumentLibraryOpen(true)}
              onVoiceRecord={() => {
                // This will be handled by VoiceRecorder component integration later
                console.log('Voice recording from nav');
              }}
              onAICommands={() => setMobileAICommandsOpen(true)}
        onAIChat={() => setFullScreenChatOpen(true)}
              onSettings={() => setShowSettingsModal(true)}
              aiLoading={aiLoading}
              className="fixed bottom-6 left-6 right-6 z-40"
            />

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
              selectedDocuments={selectedDocuments}
              onSelectionChange={(selected) => {
                // Update selected documents directly
                selected.forEach(id => !selectedDocuments.includes(id) && toggleDocumentSelection(id));
                selectedDocuments.forEach(id => !selected.includes(id) && toggleDocumentSelection(id));
              }}
              onSynthesizeSelected={() => {
                // Handle synthesis
                console.log('Synthesizing documents:', selectedDocuments);
              }}
              onCompareSelected={() => {
                // Handle comparison
                console.log('Comparing documents:', selectedDocuments);
              }}
            />

            {/* Mobile AI Commands Overlay */}
            <MobileAICommands
              isOpen={mobileAICommandsOpen}
              onClose={() => setMobileAICommandsOpen(false)}
              onCommand={handleCustomShortcut}
              aiLoading={aiLoading}
              selectedText={selectedText}
            />

            {/* Contextual AI Toolbar */}
            <ContextualAIToolbar
              selectedText={selectedText}
              onCommand={handleCustomShortcut}
              aiLoading={aiLoading}
              onClose={() => setSelectedText('')}
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
                {/* AI Commands - Continue, Rewrite, Fact Check */}
                <AdvancedAICommands
                  selectedDocuments={selectedDocuments}
                  onDocumentCreated={handleDocumentCreated}
                  onTextInsert={handleTextInsert}
                  onTextReplace={handleTextReplace}
                  getCurrentText={getCurrentText}
                  getSelectedText={getSelectedText}
                  getCursorContext={getCursorContext}
                />
                <div className="w-px h-6 bg-border mx-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettingsModal(true)}
                  title="Settings"
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
                <UserMenu onOpenSettings={() => setShowSettingsModal(true)} />
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
                              <div className="flex gap-2">
                                <Button onClick={createNewDocument} className="flex-1">
                                  <Plus className="h-4 w-4 mr-2" />
                                  New Document
                                </Button>
                                <Dialog open={showBulkUploader} onOpenChange={setShowBulkUploader}>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="default" className="px-3">
                                      <Upload className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Bulk Document Upload</DialogTitle>
                                      <DialogDescription>
                                        Upload multiple documents to build your corpus. Files will be processed with AI to generate titles and embeddings for semantic search.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <BulkUploader 
                                      onUploadComplete={(successCount, failCount) => {
                                        if (successCount > 0) {
                                          user && loadDocuments({ userId: user.id }); // Refresh document list
                                        }
                                        if (failCount === 0) {
                                          setShowBulkUploader(false);
                                        }
                                      }}
                                      onDocumentAdded={(document) => {
                                        console.log('Document added:', document);
                                      }}
                                      onClose={() => setShowBulkUploader(false)}
                                    />
                                  </DialogContent>
                                </Dialog>
                              </div>
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
                                     onDocumentUpdate={() => user && loadDocuments({ userId: user.id })}
                                     searchQuery={searchQuery}
                                     selectedDocuments={selectedDocuments}
                                     onDocumentSelectionChange={(newSelection: string[]) => {
                                       // Clear current selection and set new one
                                       clearSelection();
                                       newSelection.forEach(id => toggleDocumentSelection(id));
                                     }}
                                     hasMore={hasMore}
                                     loading={documentsLoading}
                                     onLoadMore={() => user && loadMoreDocuments(user.id)}
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
                           settings={settings}
                           onSelectionChange={setSelectedText}
                           onProvideEditor={handleEditorMount}
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
                
                {/* Center Section - Custom Shortcuts Only */}
                <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto">
                   <CustomShortcuts 
                     onShortcut={handleCustomShortcut} 
                     isLoading={aiLoading}
                     selectedText={selectedText}
                     onCommandsChange={() => setCommandSettingsKey(prev => prev + 1)}
                     onOpenMore={() => setShowMoreCommands(true)}
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

        {/* Settings Modal */}
        <SettingsModal
          open={showSettingsModal}
          onOpenChange={setShowSettingsModal}
        />

        {/* Command Settings Modal */}
        <CommandSettings
          showSettings={showCommandSettings}
          onClose={() => setShowCommandSettings(false)}
          onCommandsUpdated={() => setCommandSettingsKey(prev => prev + 1)}
        />

        {/* Analysis Modal */}
        <AnalysisModal
          open={showAnalysisModal}
          onOpenChange={setShowAnalysisModal}
          analysis={analysisResult}
        />

        {/* Fact-Check Modal */}
        <FactCheckModal
          open={showFactCheckModal}
          onOpenChange={setShowFactCheckModal}
          factCheckData={factCheckResult}
        />

        {/* More Commands Sheet */}
        <Sheet open={showMoreCommands} onOpenChange={setShowMoreCommands}>
          <SheetContent side="bottom">
            <DialogHeader>
              <DialogTitle>All AI Commands</DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <CustomShortcuts
                onShortcut={(command) => {
                  executeAICommand(command);
                  setShowMoreCommands(false);
                }}
                isLoading={aiLoading}
                selectedText={selectedText}
                isMobile
              />
            </div>

            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => {
                setShowMoreCommands(false);
                setShowCommandSettings(true);
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Customize & Edit Commands
            </Button>
          </SheetContent>
        </Sheet>

        {/* Full-Screen AI Chat */}
        <FullScreenAIChat
          isOpen={fullScreenChatOpen}
          onClose={() => setFullScreenChatOpen(false)}
          onDocumentSelect={(documentId: string) => {
            // Find the document and open it
            const doc = documents.find(d => d.id === documentId);
            if (doc) {
              openDocument(doc);
            }
          }}
        />
      </div>
    </div>
  );
}