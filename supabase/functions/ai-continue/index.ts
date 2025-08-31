import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { context, currentDocumentId, userId } = await req.json();
    
    if (!context || !userId) {
      throw new Error('Context and userId are required');
    }

    console.log(`Continuing text for user ${userId}, context length: ${context.length}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });
    
    // Generate embedding for context to find similar writing style
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: context
      }),
    });

    let styleExamples = '';
    if (embeddingResponse.ok) {
      const embeddingData = await embeddingResponse.json();
      const contextEmbedding = embeddingData.data[0].embedding;
      
      console.log('Finding similar writing style examples...');
      
      // Find similar passages in user's documents using RAG
      const { data: similarPassages } = await supabase.rpc('match_documents', {
        query_embedding: contextEmbedding,
        user_id: userId,
        match_threshold: 0.7, // Higher threshold for style matching
        match_count: 3
      });
      
      console.log(`Found ${similarPassages?.length || 0} similar passages for style matching`);
      
      // Build style examples from similar content
      styleExamples = similarPassages
        ?.map(doc => doc.content.substring(0, 500))
        .join('\n\n') || '';
    } else {
      console.error('Embedding generation failed, proceeding without style matching');
    }
    
    // Use GPT-5 Nano for continuation (fast and cheap)
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
            content: `Continue writing in the exact same style and voice as the provided text. 
                     ${styleExamples ? `Here are examples of the author's writing style:\n${styleExamples}` : ''}`
          },
          {
            role: 'user',
            content: `Continue this text naturally:\n\n${context}`
          }
        ],
        max_completion_tokens: 500
      }),
    });

    if (!chatResponse.ok) {
      const error = await chatResponse.text();
      console.error('OpenAI continuation error:', error);
      throw new Error(`OpenAI continuation error: ${error}`);
    }

    const chatData = await chatResponse.json();
    const continuation = chatData.choices[0].message.content;
    
    console.log('Generated continuation successfully');
    
    return new Response(
      JSON.stringify({ continuation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Continue error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});