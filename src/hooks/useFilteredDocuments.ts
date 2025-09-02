import React, { useMemo } from 'react';

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

interface UseFilteredDocumentsProps {
  documents: Document[];
  searchQuery: string;
  statusFilter: string;
  sortBy: string;
  itemHeight?: number;
}

export function useFilteredDocuments({
  documents,
  searchQuery,
  statusFilter,
  sortBy,
  itemHeight = 120
}: UseFilteredDocumentsProps) {
  
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = [...documents];
    
    // Search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query)
      );
    }
    
    // Status filtering
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }
    
    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'word_count':
          return b.word_count - a.word_count;
        case 'updated_at':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
    
    return filtered;
  }, [documents, searchQuery, statusFilter, sortBy]);

  const renderDocument = (renderItem: (props: { document: Document; index: number }) => React.ReactElement) => {
    return filteredAndSortedDocuments.map((document, index) => 
      renderItem({ document, index })
    );
  };

  const getGridProps = () => ({
    documents: filteredAndSortedDocuments,
    totalCount: filteredAndSortedDocuments.length,
  });

  return {
    documents: filteredAndSortedDocuments,
    renderDocument,
    getGridProps,
    totalCount: filteredAndSortedDocuments.length,
    isEmpty: filteredAndSortedDocuments.length === 0
  };
}