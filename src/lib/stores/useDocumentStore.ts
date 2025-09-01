import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

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
  user_id: string;
}

interface DocumentStore {
  // State
  documents: Document[];
  currentDocument: Document | null;
  loading: boolean;
  hasMore: boolean;
  page: number;
  error: string | null;
  
  // Actions
  setCurrentDocument: (doc: Document | null) => void;
  resetDocuments: () => void;
  loadDocuments: (options?: { append?: boolean; userId?: string }) => Promise<void>;
  loadMoreDocuments: (userId: string) => Promise<void>;
  addDocument: (doc: Document) => void;
  updateDocument: (docId: string, updates: Partial<Document>) => void;
  removeDocument: (docId: string) => void;
  setError: (error: string | null) => void;
}

const PAGE_SIZE = 12;

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  // Initial state
  documents: [],
  currentDocument: null,
  loading: false,
  hasMore: true,
  page: 0,
  error: null,

  // Actions
  setCurrentDocument: (doc) => set({ currentDocument: doc }),

  resetDocuments: () => set({ 
    documents: [], 
    currentDocument: null, 
    page: 0, 
    hasMore: true, 
    error: null 
  }),

  setError: (error) => set({ error }),

  loadDocuments: async (options = {}) => {
    const { append = false, userId } = options;
    
    if (!userId) {
      console.warn('loadDocuments called without userId');
      return;
    }

    const { loading } = get();
    if (loading) return; // Prevent concurrent requests

    set({ loading: true, error: null });

    try {
      const currentPage = append ? get().page : 0;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const documentsWithWordCount = (data || []).map(doc => ({
        ...doc,
        word_count: doc.word_count || doc.content.trim().split(/\s+/).filter(word => word.length > 0).length
      }));

      const newHasMore = documentsWithWordCount.length === PAGE_SIZE;

      set((state) => ({
        documents: append 
          ? [...state.documents, ...documentsWithWordCount]
          : documentsWithWordCount,
        page: append ? currentPage + 1 : 1,
        hasMore: newHasMore,
        loading: false,
        error: null
      }));

    } catch (error) {
      console.error('Error loading documents:', error);
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load documents' 
      });
    }
  },

  loadMoreDocuments: async (userId: string) => {
    const { hasMore, loading } = get();
    if (!hasMore || loading) return;
    
    await get().loadDocuments({ append: true, userId });
  },

  addDocument: (doc) => set((state) => ({
    documents: [doc, ...state.documents]
  })),

  updateDocument: (docId, updates) => set((state) => ({
    documents: state.documents.map(doc => 
      doc.id === docId ? { ...doc, ...updates } : doc
    ),
    currentDocument: state.currentDocument?.id === docId 
      ? { ...state.currentDocument, ...updates }
      : state.currentDocument
  })),

  removeDocument: (docId) => set((state) => ({
    documents: state.documents.filter(doc => doc.id !== docId),
    currentDocument: state.currentDocument?.id === docId ? null : state.currentDocument
  }))
}));