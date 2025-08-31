import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    const { message, userId } = await req.json();

    if (!message || !userId) {
      throw new Error('Missing message or userId');
    }

    console.log(`Processing chat message for user ${userId}: ${message}`);

    // Generate embedding for the user's message to find relevant documents
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: message,
      }),
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text();
      console.error('OpenAI embedding error:', error);
      throw new Error(`OpenAI embedding error: ${error}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    console.log('Generated query embedding, searching for relevant documents...');

    // Find relevant documents using the vector similarity function
    const { data: relevantDocs, error: searchError } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      user_id: userId,
      match_threshold: 0.5, // Lower threshold for more results
      match_count: 5
    });

    if (searchError) {
      console.error('Document search error:', searchError);
      throw searchError;
    }

    console.log(`Found ${relevantDocs?.length || 0} relevant documents`);

    // Build context from relevant documents
    let context = '';
    if (relevantDocs && relevantDocs.length > 0) {
      context = relevantDocs
        .map((doc: any) => 
          `Document: "${doc.title}"\nContent: ${doc.content.substring(0, 800)}...\n`
        )
        .join('\n');
    }

    // Prepare the system message with context
    const systemMessage = `You are an AI writing assistant with access to the user's document library. 
Use the provided context to give accurate, helpful responses about their writing.
If referring to specific documents, mention them by title.
Be conversational but informative.
If no relevant context is provided, still be helpful with general writing advice.

${context ? `Context from user's documents:\n${context}` : 'No specific documents found relevant to this query.'}`;

    // Call OpenAI for the chat response
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!chatResponse.ok) {
      const error = await chatResponse.text();
      console.error('OpenAI chat error:', error);
      throw new Error(`OpenAI chat error: ${error}`);
    }

    const chatData = await chatResponse.json();
    const assistantMessage = chatData.choices[0].message.content;

    console.log('Generated AI response successfully');

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        sources: relevantDocs || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});