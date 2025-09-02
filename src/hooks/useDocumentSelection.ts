import { useState, useCallback } from 'react';
import { useHaptics } from './useHaptics';

export function useDocumentSelection() {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const { selectionChanged, impactLight } = useHaptics();

  const toggleDocumentSelection = useCallback((documentId: string) => {
    setSelectedDocuments(prev => {
      const isCurrentlySelected = prev.includes(documentId);
      const newSelection = isCurrentlySelected
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId];
      
      // Haptic feedback for selection change
      selectionChanged();
      
      return newSelection;
    });
  }, [selectionChanged]);

  const selectAllDocuments = useCallback((documentIds: string[]) => {
    setSelectedDocuments(documentIds);
    impactLight();
  }, [impactLight]);

  const clearSelection = useCallback(() => {
    setSelectedDocuments([]);
    impactLight();
  }, [impactLight]);

  const isDocumentSelected = useCallback((documentId: string) => {
    return selectedDocuments.includes(documentId);
  }, [selectedDocuments]);

  return {
    selectedDocuments,
    toggleDocumentSelection,
    selectAllDocuments,
    clearSelection,
    isDocumentSelected,
    selectionCount: selectedDocuments.length
  };
}