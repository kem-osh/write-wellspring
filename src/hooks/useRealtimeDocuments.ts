import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentStore } from '@/lib/stores/useDocumentStore';
import { useToast } from '@/hooks/use-toast';

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

export function useRealtimeDocuments(userId: string | undefined) {
  const { addDocument, updateDocument, removeDocument } = useDocumentStore();
  const { toast } = useToast();

  const showRealtimeNotification = useCallback((type: 'created' | 'updated' | 'deleted', title: string) => {
    const messages = {
      created: `New document "${title}" was created`,
      updated: `Document "${title}" was updated`,
      deleted: `Document "${title}" was deleted`
    };

    toast({
      title: "Document synchronized",
      description: messages[type],
      duration: 3000,
    });
  }, [toast]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newDoc = payload.new as Document;
          addDocument(newDoc);
          showRealtimeNotification('created', newDoc.title);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const updatedDoc = payload.new as Document;
          updateDocument(updatedDoc.id, updatedDoc);
          showRealtimeNotification('updated', updatedDoc.title);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const deletedDoc = payload.old as Document;
          removeDocument(deletedDoc.id);
          showRealtimeNotification('deleted', deletedDoc.title);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, addDocument, updateDocument, removeDocument, showRealtimeNotification]);

  return { connected: true };
}