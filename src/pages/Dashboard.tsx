import { useState, useEffect, lazy, Suspense, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Moon, Sun, Maximize2, Minimize2, Plus, FileText, Settings, X, Mic, Loader2, Menu, MoreVertical, MessageSquare, Home, Save, Expand } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDevice } from "@/hooks/useDevice";
import { MonacoEditor } from "@/components/MonacoEditor";
import { MobileEditor } from "@/components/MobileEditor";
import { MobileDocumentLibrary } from "@/components/MobileDocumentLibrary";
// Removed MobileAICommands - using AISmartCarousel instead
import { UserMenu } from "@/components/UserMenu";
import { AISmartCarousel } from "@/components/AISmartCarousel";
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
import { useDocumentSelection } from "@/hooks/useDocumentSelection";
import { ContextualAIToolbar } from "@/components/ContextualAIToolbar";
import { SettingsModal } from "@/components/SettingsModal";
import { useHaptics } from "@/hooks/useHaptics";
import { CategorySelection } from "@/components/CategorySelection";
import { useSettingsStore } from "@/stores/settingsStore";

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
  const { settings } = useSettingsStore();
  
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
  const [libraryExpanded, setLibraryExpanded] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
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
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Auto-title generation constants
  const MIN_CONTENT_LENGTH = 50; // Minimum characters before saving/titling
  const AUTO_TITLE_THRESHOLD = 200; // Characters needed for title generation
  
  // Function to trigger auto-classification after AI commands
  const triggerAutoClassification = useCallback(async () => {
    if (!user || !currentDocument || isGeneratingTitle) return;
    
    const needsTitle = 
      documentTitle === 'New Document' || 
      documentTitle === '' || 
      !documentTitle;

    if (needsTitle && settings.autoGenerateTitles) {
      setIsGeneratingTitle(true);
      
      try {
        // Generate title
        const paragraphs = documentContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const titleContent = paragraphs.slice(0, 2).join('\n\n');
        
        const { data: titleData, error: titleError } = await supabase.functions.invoke(
          'ai-generate-title',
          {
            body: {
              content: titleContent,
              userId: user.id
            }
          }
        );

        if (titleData?.title && !titleError) {
          setDocumentTitle(titleData.title);
          toast({
            title: "Title Generated",
            description: `AI created: "${titleData.title}"`,
          });
        }
        
        // Also classify the document for category
        const { data: classification } = await supabase.functions.invoke('ai-classify-document', {
          body: { content: documentContent }
        });
        
        if (classification?.category) {
          console.log('Auto-classified category:', classification.category);
          // Update document category in the database if it's a temp document or needs updating
          if (currentDocument.id && !currentDocument.id.startsWith('temp-')) {
            await supabase.from('documents').update({ 
              category: classification.category,
              status: classification.status || 'draft'
            }).eq('id', currentDocument.id);
            
            // Update local state
            setCurrentDocument(prev => prev ? { 
              ...prev, 
              category: classification.category,
              status: classification.status || 'draft' 
            } : null);
          }
        }
        
      } catch (error) {
        console.error('Error in auto-classification:', error);
      } finally {
        setIsGeneratingTitle(false);
      }
    }
  }, [user, currentDocument, documentContent, documentTitle, isGeneratingTitle, settings.autoGenerateTitles, toast]);
  
  // Editor reference for text selection
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  
  // Mobile state
  const [mobileDocumentLibraryOpen, setMobileDocumentLibraryOpen] = useState(false);
  // Removed mobileAICommandsOpen - now using AISmartCarousel instead
  
  // Import haptics hook
  const { impactLight, notificationSuccess, notificationError } = useHaptics();
  const { isMobile, isTablet, isDesktop } = useDevice();
  
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  
  // Document selection functions
  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };
  
  const clearSelection = () => {
    setSelectedDocuments([]);
  };

  // Helper functions for editor text selection
  const getSelectedText = useCallback(() => {
    if (editorRef.current && monacoRef.current) {
      const selection = editorRef.current.getSelection();
      const model = editorRef.current.getModel();
      if (selection && model && !selection.isEmpty()) {
        return model.getValueInRange(selection);
      }
    }
    return '';
  }, []);

  const updateDocumentContent = async (documentId: string, content: string) => {
    // Update document content logic
    setDocumentContent(content);
  };

  const getCursorContext = () => {
    // Get context around cursor for AI continue
    return documentContent.slice(-500);
  };

  const insertTextAtCursor = (text: string) => {
    // Insert text at cursor position
    setDocumentContent(prev => prev + text);
  };

  // Handle advanced AI commands
  const handleAdvancedCommand = async (commandType: string, customPrompt?: string, model?: string, maxTokens?: number) => {
    if (!user || !currentDocument) return;
    
    try {
      if (commandType === 'continue') {
        const { data, error } = await supabase.functions.invoke('ai-continue', {
          body: {
            content: documentContent,
            customPrompt,
            model: model || 'gpt-4o-mini',
            maxTokens: maxTokens || 1000,
            userId: user.id
          }
        });
        
        if (error) throw error;
        const continuedText = data?.result || data?.continuedText;
        if (continuedText) {
          insertTextAtCursor(continuedText);
          toast({ title: "Success", description: "Content continued successfully" });
        }
      } else if (commandType === 'rewrite') {
        const selectedText = getSelectedText();
        const { data, error } = await supabase.functions.invoke('ai-rewrite', {
          body: {
            content: selectedText || documentContent,
            customPrompt,
            model: model || 'gpt-4o-mini',
            maxTokens: maxTokens || 2000,
            userId: user.id
          }
        });
        
        if (error) throw error;
        const rewrittenText = data?.result || data?.rewrittenText;
        if (rewrittenText) {
          if (selectedText) {
            replaceSelectedText(rewrittenText);
          } else {
            setDocumentContent(rewrittenText);
          }
          toast({ title: "Success", description: "Content rewritten successfully" });
        }
      } else if (commandType === 'fact-check') {
        const { data, error } = await supabase.functions.invoke('ai-fact-check', {
          body: {
            content: documentContent,
            customPrompt,
            model: model || 'gpt-4o-mini',
            maxTokens: maxTokens || 1500,
            userId: user.id
          }
        });
        
        if (error) throw error;
        const factCheckResult = data?.result || data?.factCheckResult;
        if (factCheckResult) {
          // Show fact-check results in a dialog or notification
          toast({ 
            title: "Fact Check Complete", 
            description: "Review the fact-check results",
            duration: 5000
          });
        }
      }
    } catch (error: any) {
      console.error('Advanced AI command error:', error);
      toast({ 
        title: "AI Command Failed", 
        description: error.message || "The AI command failed to complete", 
        variant: "destructive" 
      });
    }
  };

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

  // Handle category selection to create new document
  const handleCategorySelection = async (category: string) => {
    await createNewDocument(category);
  };

  const createNewDocument = async (category: string = 'general') => {
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

    // Set the temporary document as current so editor shows
    setCurrentDocument(newDoc);
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
    setCurrentDocument(doc);
    setDocumentTitle(doc.title);
    setDocumentContent(doc.content);
  };

  // Enhanced AI command execution with proper error handling and text replacement
  const executeAICommand = useCallback(async (
    commandType: string, 
    customPrompt?: string, 
    model?: string, 
    maxTokens?: number
  ) => {
    if (!user || isProcessing) return;

    // Check authentication first
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please refresh the page and try again.",
        variant: "destructive"
      });
      return;
    }

    if (!currentDocument) {
      toast({ title: "Error", description: "No active document", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setAiLoading(true);
    
    try {
      let result;
      const currentSelectedText = getSelectedText();
      
      if (commandType === 'light-edit') {
        const { data, error } = await supabase.functions.invoke('ai-light-edit', {
          body: {
            content: currentDocument.content,
            selectedText: currentSelectedText || undefined,
            customPrompt: customPrompt,
            model: model || 'gpt-5-nano-2025-08-07',
            maxTokens: maxTokens || 2000,
            userId: user.id
          }
        });

        if (error) throw error;
        result = data?.result;
      } else if (commandType === 'condense') {
        const { data, error } = await supabase.functions.invoke('ai-condense-content', {
          body: {
            content: currentDocument.content,
            selectedText: currentSelectedText || undefined,
            customPrompt: customPrompt,
            model: model || 'gpt-5-nano-2025-08-07',
            maxTokens: maxTokens || 1000,
            userId: user.id
          }
        });
        
        if (error) throw error;
        result = data?.result;
      } else if (commandType === 'expand') {
        const { data, error } = await supabase.functions.invoke('ai-expand-content', {
          body: {
            content: currentDocument.content,
            selectedText: currentSelectedText || undefined,
            customPrompt: customPrompt,
            model: model || 'gpt-5-mini-2025-08-07',
            maxTokens: maxTokens || 2000,
            userId: user.id
          }
        });
        
        if (error) throw error;
        result = data?.result;
      } else if (commandType === 'outline') {
        const { data, error } = await supabase.functions.invoke('ai-outline', {
          body: {
            content: currentDocument.content,
            selectedText: currentSelectedText || undefined,
            customPrompt: customPrompt,
            model: model || 'gpt-5-nano-2025-08-07',
            maxTokens: maxTokens || 1000,
            userId: user.id
          }
        });
        
        if (error) throw error;
        result = data?.result;
      } else if (commandType === 'continue') {
        const { data, error } = await supabase.functions.invoke('ai-continue', {
          body: {
            context: documentContent,
            customPrompt,
            model: model || 'gpt-5-mini-2025-08-07',
            maxTokens: maxTokens || 1000,
            userId: user.id
          }
        });
        
        if (error) throw error;
        const continuedText = data?.result || data?.continuedText;
        if (continuedText) {
          insertTextAtCursor(continuedText);
          toast({ title: "Success", description: "Content continued successfully" });
        }
      } else if (commandType === 'rewrite') {
        const { data, error } = await supabase.functions.invoke('ai-rewrite', {
          body: {
            text: currentSelectedText || documentContent,
            style: 'auto',
            customPrompt,
            model: model || 'gpt-5-mini-2025-08-07',
            maxTokens: maxTokens || 2000,
            userId: user.id
          }
        });
        
        if (error) throw error;
        const rewrittenText = data?.alternatives?.[0] || data?.result;
        if (rewrittenText) {
          if (currentSelectedText) {
            replaceSelectedText(rewrittenText);
          } else {
            setDocumentContent(rewrittenText);
          }
          toast({ title: "Success", description: "Content rewritten successfully" });
        }
      } else if (commandType === 'voice-match') {
        // Use rewrite with voice matching style
        const { data, error } = await supabase.functions.invoke('ai-rewrite', {
          body: {
            text: currentSelectedText || documentContent,
            style: 'voice-match',
            customPrompt: customPrompt || 'Match the user\'s natural writing voice and style',
            model: model || 'gpt-5-mini-2025-08-07',
            maxTokens: maxTokens || 2000,
            userId: user.id
          }
        });
        
        if (error) throw error;
        const rewrittenText = data?.alternatives?.[0] || data?.result;
        if (rewrittenText) {
          if (currentSelectedText) {
            replaceSelectedText(rewrittenText);
          } else {
            setDocumentContent(rewrittenText);
          }
          toast({ title: "Success", description: "Content matched to your voice" });
        }
      } else if (commandType === 'focus-improve') {
        // Use light-edit with focus improvement prompt
        const { data, error } = await supabase.functions.invoke('ai-light-edit', {
          body: {
            content: currentDocument.content,
            selectedText: currentSelectedText || undefined,
            customPrompt: customPrompt || 'Improve clarity and focus. Remove redundancy and strengthen the main points.',
            model: model || 'gpt-5-nano-2025-08-07',
            maxTokens: maxTokens || 2000,
            userId: user.id
          }
        });

        if (error) throw error;
        result = data?.result;
      } else if (commandType === 'review-analyze') {
        // Use analyze function for comprehensive review
        const { data, error } = await supabase.functions.invoke('ai-analyze', {
          body: {
            content: currentDocument.content,
            customPrompt: customPrompt || 'Provide a comprehensive review with suggestions for improvement',
            model: model || 'gpt-5-mini-2025-08-07',
            maxTokens: maxTokens || 1500,
            userId: user.id
          }
        });
        
        if (error) throw error;
        toast({ 
          title: "Analysis Complete", 
          description: "Review the analysis results",
          duration: 5000
        });
        // Don't replace content for analysis, just show results
        return;
      } else if (commandType === 'heavy-polish') {
        console.log('Executing heavy-polish command via ai-rewrite');
        const { data, error } = await supabase.functions.invoke('ai-rewrite', {
          body: {
            text: currentSelectedText || documentContent,
            style: 'polish',
            userId: user.id
          }
        });
        
        if (error) throw error;
        const polishedText = data?.alternatives?.[0]?.content || data?.result;
        if (polishedText) {
          if (currentSelectedText) {
            replaceSelectedText(polishedText);
          } else {
            setDocumentContent(polishedText);
          }
          toast({ title: "Success", description: "Content polished successfully" });
        }
      } else if (commandType === 'simplify') {
        console.log('Executing simplify command via ai-rewrite');
        const { data, error } = await supabase.functions.invoke('ai-rewrite', {
          body: {
            text: currentSelectedText || documentContent,
            style: 'simplify',
            userId: user.id
          }
        });
        
        if (error) throw error;
        const simplifiedText = data?.alternatives?.[0]?.content || data?.result;
        if (simplifiedText) {
          if (currentSelectedText) {
            replaceSelectedText(simplifiedText);
          } else {
            setDocumentContent(simplifiedText);
          }
          toast({ title: "Success", description: "Content simplified successfully" });
        }
      } else if (commandType === 'formalize') {
        console.log('Executing formalize command via ai-rewrite');
        const { data, error } = await supabase.functions.invoke('ai-rewrite', {
          body: {
            text: currentSelectedText || documentContent,
            style: 'formal',
            userId: user.id
          }
        });
        
        if (error) throw error;
        const formalizedText = data?.alternatives?.[0]?.content || data?.result;
        if (formalizedText) {
          if (currentSelectedText) {
            replaceSelectedText(formalizedText);
          } else {
            setDocumentContent(formalizedText);
          }
          toast({ title: "Success", description: "Content formalized successfully" });
        }
      } else if (commandType === 'casualize') {
        console.log('Executing casualize command via ai-rewrite');
        const { data, error } = await supabase.functions.invoke('ai-rewrite', {
          body: {
            text: currentSelectedText || documentContent,
            style: 'casual',
            userId: user.id
          }
        });
        
        if (error) throw error;
        const casualizedText = data?.alternatives?.[0]?.content || data?.result;
        if (casualizedText) {
          if (currentSelectedText) {
            replaceSelectedText(casualizedText);
          } else {
            setDocumentContent(casualizedText);
          }
          toast({ title: "Success", description: "Content casualized successfully" });
        }
      } else if (commandType === 'summarize') {
        console.log('Executing summarize command via ai-condense-content');
        const { data, error } = await supabase.functions.invoke('ai-condense-content', {
          body: {
            content: currentDocument.content,
            selectedText: currentSelectedText || undefined,
            userId: user.id
          }
        });
        
        if (error) throw error;
        result = data?.result;
      } else if (commandType === 'bullet-points') {
        console.log('Executing bullet-points command via ai-outline');
        const { data, error } = await supabase.functions.invoke('ai-outline', {
          body: {
            content: currentDocument.content,
            selectedText: currentSelectedText || undefined,
            userId: user.id
          }
        });
        
        if (error) throw error;
        result = data?.result;
      } else if (commandType === 'paragraph-breaks') {
        console.log('Executing paragraph-breaks command via ai-outline');
        const { data, error } = await supabase.functions.invoke('ai-outline', {
          body: {
            content: currentDocument.content,
            selectedText: currentSelectedText || undefined,
            userId: user.id
          }
        });
        
        if (error) throw error;
        result = data?.result;
      } else if (commandType === 'add-headers') {
        console.log('Executing add-headers command via ai-outline');
        const { data, error } = await supabase.functions.invoke('ai-outline', {
          body: {
            content: currentDocument.content,
            selectedText: currentSelectedText || undefined,
            userId: user.id
          }
        });
        
        if (error) throw error;
        result = data?.result;
      } else if (commandType === 'analyze') {
        console.log('Executing analyze command via ai-analyze');
        const { data, error } = await supabase.functions.invoke('ai-analyze', {
          body: {
            text: currentSelectedText || documentContent,
            userId: user.id
          }
        });
        
        if (error) throw error;
        toast({ 
          title: "Analysis Complete", 
          description: "Review the analysis results",
          duration: 5000
        });
        // Don't replace content for analysis, just show results
        return;
      } else if (commandType === 'match-voice') {
        console.log('Executing match-voice command via ai-rewrite');
        const { data, error } = await supabase.functions.invoke('ai-rewrite', {
          body: {
            text: currentSelectedText || documentContent,
            style: 'voice-match',
            userId: user.id
          }
        });
        
        if (error) throw error;
        const matchedText = data?.alternatives?.[0]?.content || data?.result;
        if (matchedText) {
          if (currentSelectedText) {
            replaceSelectedText(matchedText);
          } else {
            setDocumentContent(matchedText);
          }
          toast({ title: "Success", description: "Content matched to your voice" });
        }
      } else if (commandType === 'change-tone') {
        console.log('Executing change-tone command via ai-rewrite');
        const { data, error } = await supabase.functions.invoke('ai-rewrite', {
          body: {
            text: currentSelectedText || documentContent,
            style: 'tone-change',
            userId: user.id
          }
        });
        
        if (error) throw error;
        const tonedText = data?.alternatives?.[0]?.content || data?.result;
        if (tonedText) {
          if (currentSelectedText) {
            replaceSelectedText(tonedText);
          } else {
            setDocumentContent(tonedText);
          }
          toast({ title: "Success", description: "Tone changed successfully" });
        }
      } else if (commandType === 'strengthen-args') {
        console.log('Executing strengthen-args command via ai-rewrite');
        const { data, error } = await supabase.functions.invoke('ai-rewrite', {
          body: {
            text: currentSelectedText || documentContent,
            style: 'strengthen',
            userId: user.id
          }
        });
        
        if (error) throw error;
        const strengthenedText = data?.alternatives?.[0]?.content || data?.result;
        if (strengthenedText) {
          if (currentSelectedText) {
            replaceSelectedText(strengthenedText);
          } else {
            setDocumentContent(strengthenedText);
          }
          toast({ title: "Success", description: "Arguments strengthened successfully" });
        }
      } else if (commandType === 'add-examples') {
        console.log('Executing add-examples command via ai-expand-content');
        const { data, error } = await supabase.functions.invoke('ai-expand-content', {
          body: {
            content: currentDocument.content,
            selectedText: currentSelectedText || undefined,
            userId: user.id
          }
        });
        
        if (error) throw error;
        result = data?.result;
      } else if (commandType === 'fact-check') {
        console.log('Executing fact-check command via ai-fact-check');
        const { data, error } = await supabase.functions.invoke('ai-fact-check', {
          body: {
            content: currentDocument.content,
            selectedText: currentSelectedText || undefined,
            userId: user.id
          }
        });
        
        if (error) throw error;
        toast({ 
          title: "Fact Check Complete", 
          description: "Review the fact-check results",
          duration: 5000
        });
        // Don't replace content for fact-check, just show results
        return;
      } else {
        console.log(`Unknown command type attempted: ${commandType}`);
        toast({ 
          title: "Command Not Supported", 
          description: `The "${commandType}" command is not yet implemented. Available commands: light-edit, heavy-polish, expand, condense, simplify, formalize, casualize, outline, summarize, bullet-points, paragraph-breaks, add-headers, analyze, and others.`,
          variant: "destructive" 
        });
        return;
      }
      
      // Handle result replacement for commands that return content
      if (!['continue', 'rewrite', 'voice-match', 'heavy-polish', 'simplify', 'formalize', 'casualize', 'match-voice', 'change-tone', 'strengthen-args', 'analyze', 'fact-check'].includes(commandType)) {
        if (!result || typeof result !== 'string' || !result.trim()) {
          toast({ 
            title: "Empty AI Response", 
            description: "AI didn't generate content. Try different text or command.",
            variant: "destructive" 
          });
          return;
        }

        if (currentSelectedText) {
          // Replace selected text
          replaceSelectedText(result);
          toast({ title: "Success", description: "Text updated successfully" });
        } else {
          // Replace entire content
          setDocumentContent(result);
          toast({ title: "Success", description: "Document updated successfully" });
        }
      }
      
      // Trigger auto-title generation and category classification after AI commands
      if (documentContent.trim().length >= AUTO_TITLE_THRESHOLD) {
        await triggerAutoClassification();
      }
      
    } catch (error: any) {
      console.error('AI command error:', error);
      toast({ 
        title: "AI Command Failed", 
        description: error.message || "The AI command failed to complete", 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
      setAiLoading(false);
    }
  }, [user, isProcessing, currentDocument, documentContent, getSelectedText, replaceSelectedText, insertTextAtCursor, setDocumentContent, toast]);


  // Update handleCustomShortcut to use the new executeAICommand
  const handleCustomShortcutUpdated = useCallback(async (
    type: 'light-edit' | 'expand' | 'condense' | 'outline',
    prompt: string,
    model?: string,
    maxTokens?: number
  ) => {
    await executeAICommand(type, prompt, model, maxTokens);
  }, [executeAICommand]);

  // Load documents and categories on mount
  useEffect(() => {
    loadDocuments();
    loadCategories();
  }, []);

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
            title: finalTitle, 
            content: documentContent,
            word_count: wordCount 
          };
          setCurrentDocument(updatedDoc);
          setDocuments(documents.map(doc => 
            doc.id === currentDocument.id ? updatedDoc : doc
          ));
          
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
          setDocuments([newDoc, ...documents.filter(d => !d.id.startsWith('temp-'))]);
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

      // Extract result with fallback to data.result
      const suggestedText = data[type === 'light-edit' ? 'editedText' : 
                                type === 'expand' ? 'expandedText' : 
                                type === 'condense' ? 'condensedText' : 'outlineText'] || 
                           data.result;

      // Handle empty results gracefully
      if (!suggestedText || suggestedText.trim() === '') {
        toast({
          title: "AI returned empty result",
          description: `The AI didn't generate any content for the '${type}' command. Please try again.`,
          variant: "destructive",
        });
        return;
      }

      const suggestion: AISuggestion = {
        id: Date.now().toString(),
        type,
        originalText: textToProcess,
        suggestedText,
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
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileDocumentLibraryOpen(true)}
                  className="touch-target"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentDocument(null)}
                  className="touch-target"
                  title="Home"
                >
                  <Home className="h-4 w-4" />
                </Button>
              </div>
              
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
                  onClick={saveDocument}
                  disabled={!currentDocument}
                  className="touch-target"
                  title="Save"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettingsModal(true)}
                  className="touch-target"
                  aria-label="Open settings"
                >
                  <Settings className="h-5 w-5" />
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
                <CategorySelection onCategorySelect={handleCategorySelection} />
              )}
            </main>

            {/* AI Smart Carousel - Fixed Bottom */}
            {currentDocument && (
              <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-sm pb-safe">
                <AISmartCarousel
                  onCommand={executeAICommand}
                  aiLoading={aiLoading}
                  selectedText={selectedText}
                  onOpenSettings={() => setShowCommandSettings(true)}
                  className="py-2"
                />
              </div>
            )}

            {/* Mobile Bottom Navigation - Fixed (when no document) */}
            {!currentDocument && (
              <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center border-t bg-card/95 backdrop-blur-sm h-16 px-2 pb-safe">
                <VoiceRecorder 
                  onTranscription={handleVoiceTranscription}
                  disabled={aiLoading}
                />
                <Button
                  variant="ghost"
                  onClick={() => setRightSidebarOpen(true)}
                  className="flex flex-col items-center justify-center p-2 min-w-0 touch-target ml-4"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span className="text-xs mt-1">Chat</span>
                </Button>
              </nav>
            )}

            {/* Mobile Document Library Overlay */}
            <MobileDocumentLibrary
              isOpen={mobileDocumentLibraryOpen}
              onClose={() => setMobileDocumentLibraryOpen(false)}
              documents={filteredDocuments}
              onDocumentSelect={(doc) => {
                openDocument(doc);
                setMobileDocumentLibraryOpen(false);
              }}
              onCreateNew={() => createNewDocument()}
              onDeleteDocument={deleteDocument}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filters={filters}
              onFiltersChange={setFilters}
              categories={categories}
              loading={searchLoading}
              selectedDocuments={selectedDocuments}
              onSelectionChange={(selected) => {
                selected.forEach(id => !selectedDocuments.includes(id) && toggleDocumentSelection(id));
                selectedDocuments.forEach(id => !selected.includes(id) && toggleDocumentSelection(id));
              }}
              onSynthesizeSelected={() => {
                console.log('Synthesizing documents:', selectedDocuments);
              }}
              onCompareSelected={() => {
                console.log('Comparing documents:', selectedDocuments);
              }}
              onExpandToggle={() => {
                setMobileDocumentLibraryOpen(false);
                setLibraryExpanded(true);
              }}
            />

            {/* Mobile AI Commands Overlay - Remove since AI Smart Carousel handles this */}
            {/* Legacy MobileAICommands component removed in favor of AISmartCarousel */}

            {/* Contextual AI Toolbar */}
            <ContextualAIToolbar
              selectedText={selectedText}
              onCommand={handleCustomShortcutUpdated}
              aiLoading={aiLoading}
              onClose={() => setSelectedText('')}
            />

            {/* Mobile AI Chat Overlay */}
            <Sheet open={rightSidebarOpen} onOpenChange={setRightSidebarOpen}>
              <SheetContent 
                side="right" 
                className={`p-0 mobile-sheet ${chatExpanded ? 'w-full' : 'w-[90vw] max-w-md'}`}
              >
                <AIChatSidebar
                  isOpen={rightSidebarOpen}
                  onClose={() => setRightSidebarOpen(false)}
                  onDocumentSelect={openDocument}
                  expanded={chatExpanded}
                  onExpandToggle={() => setChatExpanded(!chatExpanded)}
                />
              </SheetContent>
            </Sheet>

            {/* Full-Screen Library Overlay */}
            {libraryExpanded && (
              <Sheet open={libraryExpanded} onOpenChange={() => setLibraryExpanded(false)}>
                <SheetContent side="left" className="w-full p-0">
                  <MobileDocumentLibrary
                    isOpen={libraryExpanded}
                    onClose={() => setLibraryExpanded(false)}
                    documents={filteredDocuments}
                    onDocumentSelect={(doc) => {
                      openDocument(doc);
                      setLibraryExpanded(false);
                    }}
                    onCreateNew={() => createNewDocument()}
                    onDeleteDocument={deleteDocument}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filters={filters}
                    onFiltersChange={setFilters}
                    categories={categories}
                    loading={searchLoading}
                    selectedDocuments={selectedDocuments}
                    onSelectionChange={(selected) => {
                      selected.forEach(id => !selectedDocuments.includes(id) && toggleDocumentSelection(id));
                      selectedDocuments.forEach(id => !selected.includes(id) && toggleDocumentSelection(id));
                    }}
                    onSynthesizeSelected={() => {
                      console.log('Synthesizing documents:', selectedDocuments);
                    }}
                    onCompareSelected={() => {
                      console.log('Comparing documents:', selectedDocuments);
                    }}
                    expanded={libraryExpanded}
                  />
                </SheetContent>
              </Sheet>
            )}
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentDocument(null)}
                  title="Home"
                >
                  <Home className="h-4 w-4" />
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
                  onClick={saveDocument}
                  disabled={!currentDocument}
                  title="Save Document"
                >
                  <Save className="h-4 w-4" />
                </Button>
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
                         <div className="flex-shrink-0 border-b bg-card">
                           <div className="p-4 border-b flex items-center justify-between">
                             <h3 className="font-medium">Documents</h3>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setLibraryExpanded(true)}
                                  title="Expand to Full Screen"
                                >
                                  <Expand className="h-4 w-4" />
                                </Button>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => setLeftSidebarOpen(false)}
                               >
                                 <X className="h-4 w-4" />
                               </Button>
                             </div>
                           </div>
                           
                           {/* New Document & Search */}
                           <div className="p-4 space-y-3">
                             <Button onClick={() => createNewDocument()} className="w-full">
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
                                     onDocumentSelectionChange={(newSelection: string[]) => {
                                       // Clear current selection and set new one
                                       clearSelection();
                                       newSelection.forEach(id => toggleDocumentSelection(id));
                                     }}
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
                       <CategorySelection onCategorySelect={handleCategorySelection} />
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
                        expanded={chatExpanded}
                        onExpandToggle={() => setChatExpanded(!chatExpanded)}
                      />
                    </ResizablePanel>
                  </>
                )}

            {/* Full-Screen Chat Overlay (Desktop) */}
            {chatExpanded && (
              <Sheet open={chatExpanded} onOpenChange={() => setChatExpanded(false)}>
                <SheetContent side="right" className="w-full p-0">
                  <AIChatSidebar
                    isOpen={chatExpanded}
                    onClose={() => setChatExpanded(false)}
                    onDocumentSelect={openDocument}
                    expanded={chatExpanded}
                  />
                </SheetContent>
              </Sheet>
            )}

            {/* Full-Screen Library Overlay (Desktop) */}
            {libraryExpanded && (
              <Sheet open={libraryExpanded} onOpenChange={() => setLibraryExpanded(false)}>
                <SheetContent side="left" className="w-full p-0">
                  <div className="h-full flex flex-col bg-background">
                    <div className="flex-shrink-0 border-b bg-card">
                      <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="font-medium">Documents</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLibraryExpanded(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="p-4 space-y-3">
                        <Button onClick={() => createNewDocument()} className="w-full">
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
                    
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <ScrollArea className="flex-1">
                        <div className="p-4 pb-20 space-y-4">
                          <DocumentFilters 
                            onFiltersChange={handleFiltersChange}
                            initialFilters={filters}
                          />
                          
                          <div className="min-h-0">
                             <DocumentList
                               documents={filteredDocuments}
                               categories={categories}
                               currentDocument={currentDocument}
                               onDocumentSelect={(doc) => {
                                 openDocument(doc);
                                 setLibraryExpanded(false);
                               }}
                               onDocumentUpdate={loadDocuments}
                               searchQuery={searchQuery}
                               selectedDocuments={selectedDocuments}
                                onDocumentSelectionChange={(newSelection: string[]) => {
                                  clearSelection();
                                  newSelection.forEach(id => toggleDocumentSelection(id));
                                }}
                             />
                          </div>
                          
                          <div className="mt-auto pt-4 border-t">
                            <DocumentStats documents={documents} />
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
              </ResizablePanelGroup>
            </div>

            {/* Desktop Bottom Toolbar */}
            <footer className="border-t bg-card">
              <div className="flex items-center gap-3 p-3 min-h-[68px]">
                {/* Left Section - Voice Only */}
                <div className="flex items-center gap-2 shrink-0">
                  <VoiceRecorder 
                    onTranscription={handleVoiceTranscription}
                    disabled={aiLoading}
                  />
                </div>
                
                {/* Center Section - AI Smart Carousel */}
                <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto">
                   <AISmartCarousel
                     onCommand={executeAICommand}
                     aiLoading={aiLoading}
                     selectedText={selectedText}
                     onOpenSettings={() => setShowCommandSettings(true)}
                     className="flex-1"
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
                    variant="outline"
                    size="sm"
                    onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                    className="h-11 hover:bg-muted/50 transition-colors relative"
                    title={rightSidebarOpen ? "Close AI Chat" : "Open AI Chat"}
                  >
                    💬 <span className="hidden md:inline">{rightSidebarOpen ? "Close Chat" : "AI Chat"}</span>
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
      </div>
    </div>
  );
}