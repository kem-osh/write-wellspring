import { useState, useCallback, useMemo } from 'react';
import { useHaptics } from './useHaptics';

export function useDocumentSelection() {
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());
  const { selectionChanged, impactLight } = useHaptics();

  // Convert Set to array for external use
  const selectedDocuments = useMemo(() => Array.from(selectedDocumentIds), [selectedDocumentIds]);

  const selectDocument = useCallback((documentId: string) => {
    setSelectedDocumentIds(prev => {
      const newSet = new Set(prev);
      newSet.add(documentId);
      selectionChanged();
      return newSet;
    });
  }, [selectionChanged]);

  const deselectDocument = useCallback((documentId: string) => {
    setSelectedDocumentIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(documentId);
      selectionChanged();
      return newSet;
    });
  }, [selectionChanged]);

  const toggleDocument = useCallback((documentId: string) => {
    setSelectedDocumentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      selectionChanged();
      return newSet;
    });
  }, [selectionChanged]);

  const selectAll = useCallback((documentIds: string[]) => {
    if (documentIds.length === 0) return;
    setSelectedDocumentIds(new Set(documentIds));
    impactLight();
  }, [impactLight]);

  const clearSelection = useCallback(() => {
    setSelectedDocumentIds(new Set());
    impactLight();
  }, [impactLight]);

  const isSelected = useCallback((documentId: string) => {
    return selectedDocumentIds.has(documentId);
  }, [selectedDocumentIds]);

  // Legacy support for existing components
  const toggleDocumentSelection = toggleDocument;
  const selectAllDocuments = selectAll;
  const isDocumentSelected = isSelected;

  return {
    selectedDocuments,
    selectedCount: selectedDocumentIds.size,
    selectDocument,
    deselectDocument,
    toggleDocument,
    selectAll,
    clearSelection,
    isSelected,
    // Legacy support
    toggleDocumentSelection,
    selectAllDocuments,
    isDocumentSelected,
    selectionCount: selectedDocumentIds.size
  };
}