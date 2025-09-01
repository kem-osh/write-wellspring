import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing required environment variables');
    }

    const { documentIds, userId } = await req.json();
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length < 2) {
      throw new Error('At least 2 document IDs are required for comparison');
    }

    console.log(`Comparing ${documentIds.length} documents for user ${userId}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });
    
    // Fetch documents
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .in('id', documentIds)
      .eq('user_id', userId);
    
    if (fetchError) {
      console.error('Error fetching documents:', fetchError);
      throw fetchError;
    }
    
    if (!documents || documents.length === 0) {
      throw new Error('No documents found');
    }
    
    console.log(`Found ${documents.length} documents to compare`);
    
    // Calculate similarities using embeddings
    const similarities = [];
    for (let i = 0; i < documents.length - 1; i++) {
      for (let j = i + 1; j < documents.length; j++) {
        const doc1 = documents[i];
        const doc2 = documents[j];
        
        if (doc1.embedding && doc2.embedding) {
          const similarity = cosineSimilarity(doc1.embedding, doc2.embedding);
          similarities.push({
            doc1: doc1.title,
            doc2: doc2.title,
            similarity: (similarity * 100).toFixed(1) + '%'
          });
        }
      }
    }
    
    console.log(`Calculated ${similarities.length} similarity pairs`);
    
    // Use GPT-5 Nano for analysis (sufficient for comparison tasks)
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'Analyze these document versions and identify key differences, improvements, and common themes. Be concise and specific.'
          },
          {
            role: 'user',
            content: documents.map(d => `${d.title}:\n${d.content.substring(0, 1000)}`).join('\n\n---\n\n')
          }
        ],
        max_completion_tokens: 1000
      }),
    });

    if (!chatResponse.ok) {
      const error = await chatResponse.text();
      console.error('OpenAI comparison error:', error);
      throw new Error(`OpenAI comparison error: ${error}`);
    }

    const chatData = await chatResponse.json();
    const analysis = chatData.choices[0].message.content;
    
    console.log('Generated comparison analysis successfully');
    
    return new Response(
      JSON.stringify({ 
        analysis,
        similarities,
        documents: documents.map(d => ({ 
          id: d.id, 
          title: d.title, 
          wordCount: d.word_count,
          status: d.status,
          createdAt: d.created_at,
          updatedAt: d.updated_at
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Compare error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});