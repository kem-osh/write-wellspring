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
    // --- Environment Variable Setup ---
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

    // --- Payload Validation ---
    const { command, content, selectedText, userId, message } = await req.json();

    if (!userId || !command) {
      throw new Error('User ID and the full command object are required.');
    }
    const userMessage = message || selectedText || content;
    if (!userMessage) {
      throw new Error('No message was provided to process.');
    }

    // --- Command Configuration ---
    const commandConfig = command;
    if (!commandConfig.ai_model || !commandConfig.system_prompt) {
      throw new Error('ai_model and system_prompt are required in command config');
    }
    
    const model = commandConfig.ai_model;
    const maxTokens = commandConfig.max_tokens || 1000;
    const systemPrompt = commandConfig.system_prompt;
    const temperature = commandConfig.temperature || 0.7;

    console.log(`Processing chat message for user ${userId}: ${userMessage}`);

    // --- RAG Step 1: Generate Query Embedding ---
    const EMBEDDING_MODEL = Deno.env.get('EMBEDDING_MODEL') || 'text-embedding-3-large';
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: userMessage,
      }),
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text();
      console.error('OpenAI embedding error:', error);
      throw new Error(`OpenAI embedding error: ${error}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // --- RAG Step 2: Semantic Search for Documents ---
    const MATCH_THRESHOLD = parseFloat(Deno.env.get('MATCH_THRESHOLD') || '0.3');
    const TOP_K = parseInt(Deno.env.get('TOP_K') || '8', 10);

    const { data: relevantDocs, error: searchError } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      user_id: userId,
      match_threshold: MATCH_THRESHOLD,
      match_count: TOP_K
    });

    if (searchError) {
      console.error('Document search error:', searchError);
      throw searchError;
    }
    console.log(`Found ${relevantDocs?.length || 0} documents via semantic search.`);

    // --- RAG Step 3: Fallback Searches (Text and Recent) ---
    let textSearchDocs = null;
    const searchTerms = userMessage.toLowerCase().split(' ').filter(word => word.length > 2);
    if (searchTerms.length > 0) {
        const orQuery = searchTerms.map(term => `title.ilike.%${term}%,content.ilike.%${term}%`).join(',');
        const { data: textDocs, error: textError } = await supabase
            .from('documents')
            .select('id, title, content')
            .eq('user_id', userId)
            .or(orQuery)
            .limit(5);
        
        if (!textError && textDocs && textDocs.length > 0) {
            textSearchDocs = textDocs.map(doc => ({ ...doc, similarity: 0.6 }));
            console.log(`Found ${textSearchDocs.length} documents via text search.`);
        }
    }
    
    let fallbackDocs = null;
    if (!relevantDocs || relevantDocs.length === 0) {
        const { data: recentDocs, error: recentError } = await supabase
            .from('documents')
            .select('id, title, content')
            .eq('user_id', userId)
            .not('embedding', 'is', null) // Ensure document has an embedding
            .order('updated_at', { ascending: false })
            .limit(5);
        
        if (!recentError && recentDocs && recentDocs.length > 0) {
            fallbackDocs = recentDocs.map(doc => ({ ...doc, similarity: 0.4 }));
            console.log(`Using ${fallbackDocs.length} recent documents as fallback.`);
        }
    }

    // --- RAG Step 4: Consolidate and Budget Context ---
    let docsToUse = relevantDocs && relevantDocs.length > 0 ? [...relevantDocs] : [];
    const existingIds = new Set(docsToUse.map(doc => doc.id));

    if (textSearchDocs) {
        textSearchDocs.forEach(doc => {
            if (!existingIds.has(doc.id)) {
                docsToUse.push(doc);
                existingIds.add(doc.id);
            }
        });
    }

    if (docsToUse.length === 0 && fallbackDocs) {
        docsToUse = fallbackDocs;
    }

    let context = '';
    if (docsToUse.length > 0) {
      docsToUse.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
      let tokenBudget = 12000; // Approx 3k tokens
      let contextParts: string[] = [];

      for (const doc of docsToUse) {
        if (tokenBudget <= 0) break;
        const chunk = doc.content.substring(0, Math.min(tokenBudget, 1500));
        contextParts.push(`Document: "${doc.title}" (relevance: ${(doc.similarity * 100).toFixed(1)}%)\nContent: ${chunk}...\n`);
        tokenBudget -= chunk.length;
      }
      context = contextParts.join('\n');
    }

    // --- AI Chat Completion ---
    const systemMessage = docsToUse.length > 0
      ? `${systemPrompt}\n\nContext from user's documents:\n${context}`
      : `${systemPrompt}\n\nThe user has no relevant documents. Encourage them to create content.`;
      
    const isNewerModel = model.includes('gpt-5') || model.includes('gpt-4.1');
    const tokenParam = isNewerModel ? 'max_completion_tokens' : 'max_tokens';

    const requestBody: any = {
      model,
      messages: [{ role: 'system', content: systemMessage }, { role: 'user', content: userMessage }],
      [tokenParam]: maxTokens,
    };
    if (!isNewerModel) requestBody.temperature = temperature;

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!chatResponse.ok) {
      const error = await chatResponse.text();
      console.error('OpenAI chat error:', error);
      throw new Error(`OpenAI chat error: ${error}`);
    }

    const chatData = await chatResponse.json();
    const assistantMessage = chatData.choices[0].message.content;

    // --- Usage Tracking and Response ---
    const usage = chatData.usage;
    if (usage) {
      try {
        await supabase.from('ai_usage').insert({
          user_id: userId,
          function_name: 'ai-chat',
          model,
          tokens_input: usage.prompt_tokens,
          tokens_output: usage.completion_tokens,
          cost_estimate: (usage.prompt_tokens * 0.00000025) + (usage.completion_tokens * 0.000001)
        });
      } catch (trackingError) {
        console.error('Failed to track usage (non-critical):', trackingError);
      }
    }

    console.log('Generated AI response successfully');

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        sources: docsToUse.slice(0, 5) || [] // Return top 5 sources
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