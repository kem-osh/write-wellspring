import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useEmbeddings() {
  const { toast } = useToast();

  const generateEmbedding = useCallback(async (documentId: string, content: string) => {
    if (!content.trim()) {
      console.log('Skipping embedding generation for empty content');
      return;
    }

    try {
      console.log(`Generating embedding for document ${documentId}`);
      
      const { error } = await supabase.functions.invoke('generate-embeddings', {
        body: {
          documentId,
          content
        }
      });

      if (error) {
        console.error('Error generating embedding:', error);
        throw error;
      }

      console.log(`Successfully generated embedding for document ${documentId}`);
    } catch (error) {
      console.error('Error in generateEmbedding:', error);
      toast({
        title: "Embedding Generation Failed",
        description: "Failed to generate document embedding for AI search. The document was saved, but AI features may not work optimally.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const generateEmbeddingsSilently = useCallback(async (documentId: string, content: string) => {
    if (!content.trim()) return;

    try {
      await supabase.functions.invoke('generate-embeddings', {
        body: { documentId, content }
      });
    } catch (error) {
      console.error('Silent embedding generation failed:', error);
    }
  }, []);

  return {
    generateEmbedding,
    generateEmbeddingsSilently
  };
}