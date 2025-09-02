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

    // 1) Expect the full command object and other necessary data
    const { command, content, selectedText, userId, message } = await req.json();

    // 2) Validate the payload - for chat, we need either message or content/selectedText
    if (!userId) {
      throw new Error('User ID is required.');
    }
    const userMessage = message || selectedText || content;
    if (!userMessage) {
      throw new Error('No message was provided to process.');
    }

    // 3) Use command object with backward compatibility defaults
    const commandConfig = command || {
      ai_model: "gpt-5-mini-2025-08-07",
      system_prompt: "You are a helpful assistant that answers using the user's documents when possible.",
      max_tokens: 1200,
      temperature: 0.7
    };
    
    // Ensure required fields exist with fallbacks
    if (!commandConfig.ai_model) commandConfig.ai_model = "gpt-5-mini-2025-08-07";
    if (!commandConfig.system_prompt) commandConfig.system_prompt = "You are a helpful assistant that answers using the user's documents when possible.";
    
    const model = commandConfig.ai_model;
    const maxTokens = commandConfig.max_tokens || 1000;
    const systemPrompt = commandConfig.system_prompt;
    const temperature = commandConfig.temperature || 0.7;

    console.log(`Processing chat message for user ${userId}: ${userMessage}`);

    // Generate embedding for the user's message to find relevant documents
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
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

    // Enhanced debugging
    console.log('Generated query embedding, searching for relevant documents...');
    console.log('Query embedding dimensions:', queryEmbedding.length);
    console.log('First few embedding values:', queryEmbedding.slice(0, 5));

    // Find relevant documents using the vector similarity function
    console.log('Calling match_documents with:', {
      userId,
      embeddingLength: queryEmbedding.length,
      threshold: 0.1,
      count: 10
    });

    const { data: relevantDocs, error: searchError } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      user_id: userId,
      match_threshold: 0.1, // Very low threshold to catch more results
      match_count: 10
    });

    if (searchError) {
      console.error('Document search error:', searchError);
      throw searchError;
    }

    console.log('Search results:', {
      found: relevantDocs?.length || 0,
      docs: relevantDocs?.map(d => ({ title: d.title, similarity: d.similarity }))
    });
    
    // Try text search as additional fallback for better recall
    let textSearchDocs = null;
    const searchTerms = userMessage.toLowerCase().split(' ').filter(word => word.length > 2);
    if (searchTerms.length > 0) {
      console.log('Attempting text search with terms:', searchTerms);
      const searchPattern = searchTerms.join('|');
      
      const { data: textDocs, error: textError } = await supabase
        .from('documents')
        .select('id, title, content')
        .eq('user_id', userId)
        .or(`title.ilike.%${searchTerms[0]}%,content.ilike.%${searchTerms[0]}%`)
        .limit(5);
      
      if (!textError && textDocs && textDocs.length > 0) {
        textSearchDocs = textDocs.map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          similarity: 0.6 // Higher similarity for text matches
        }));
        console.log(`Found ${textSearchDocs.length} documents via text search`);
      }
    }
    
    // If no documents found with semantic search, try recent documents as final fallback
    let fallbackDocs = null;
    if (!relevantDocs || relevantDocs.length === 0) {
      console.log('No relevant documents found via embedding search, trying recent documents...');
      const { data: recentDocs, error: recentError } = await supabase
        .from('documents')
        .select('id, title, content')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(5);
      
      if (!recentError && recentDocs && recentDocs.length > 0) {
        fallbackDocs = recentDocs.map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          similarity: 0.4 // Lower similarity for fallback docs
        }));
        console.log(`Found ${fallbackDocs.length} recent documents as fallback`);
      }
    }

    // Build context from the best available documents (prioritize embedding matches, then text matches, then recent)
    let docsToUse = [];
    
    // Start with embedding matches if available
    if (relevantDocs && relevantDocs.length > 0) {
      docsToUse = [...relevantDocs];
      console.log(`Using ${relevantDocs.length} documents from embedding search`);
    }
    
    // Add text search results if we have fewer than 5 documents
    if (textSearchDocs && textSearchDocs.length > 0 && docsToUse.length < 5) {
      // Avoid duplicates by checking IDs
      const existingIds = new Set(docsToUse.map(doc => doc.id));
      const newTextDocs = textSearchDocs.filter(doc => !existingIds.has(doc.id));
      docsToUse = [...docsToUse, ...newTextDocs].slice(0, 5);
      console.log(`Added ${newTextDocs.length} additional documents from text search`);
    }
    
    // Use recent documents as final fallback if still no matches
    if (docsToUse.length === 0 && fallbackDocs) {
      docsToUse = fallbackDocs;
      console.log(`Using ${fallbackDocs.length} recent documents as final fallback`);
    }
    
    let context = '';
    let hasDocuments = false;
    
    if (docsToUse && docsToUse.length > 0) {
      hasDocuments = true;
      // Sort by similarity score descending
      docsToUse.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
      context = docsToUse
        .map((doc: any) => 
          `Document: "${doc.title}" (relevance: ${(doc.similarity * 100).toFixed(1)}%)\nContent: ${doc.content.substring(0, 800)}...\n`
        )
        .join('\n');
      console.log(`Using ${docsToUse.length} total documents for context, top similarity: ${((docsToUse[0]?.similarity || 0) * 100).toFixed(1)}%`);
    } else {
      console.log('No documents found - user may not have any documents yet');
    }

    // Prepare the system message with context
    const systemMessage = hasDocuments 
      ? `${systemPrompt}
Use the provided context to give accurate, helpful responses about their writing.
Always reference specific documents by title when answering questions about their content.
Be conversational and helpful.

Context from user's documents:
${context}`
      : `${systemPrompt}
The user doesn't seem to have any documents in their library yet, or their query doesn't match their existing content.
Encourage them to create some documents first, or ask more specific questions about their writing needs.
Be helpful and suggest how they can get started with their writing projects.`;
    
    // Determine token parameter based on model
    const isNewerModel = model.includes('gpt-5') || model.includes('gpt-4.1') || model.includes('o3') || model.includes('o4');
    const tokenParam = isNewerModel ? 'max_completion_tokens' : 'max_tokens';

    const requestBody = {
      model: model,
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: userMessage
        }
      ]
    };

    // Add appropriate token parameter and temperature
    requestBody[tokenParam] = maxTokens;
    if (!isNewerModel) {
      requestBody.temperature = temperature;
    }

    // Call OpenAI for the chat response
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!chatResponse.ok) {
      const error = await chatResponse.text();
      console.error('OpenAI chat error:', error);
      throw new Error(`OpenAI chat error: ${error}`);
    }

    const chatData = await chatResponse.json();
    const assistantMessage = chatData.choices[0].message.content;

    // Track usage for cost monitoring
    const usage = chatData.usage;
    if (usage) {
      try {
        await supabase.from('ai_usage').insert({
          user_id: userId,
          function_name: 'ai-chat',
          model: model,
          tokens_input: usage.prompt_tokens,
          tokens_output: usage.completion_tokens,
          cost_estimate: (usage.prompt_tokens * 0.00000025) + (usage.completion_tokens * 0.000001) // GPT-5 Mini pricing
        });
        console.log('Usage tracked:', {
          total_tokens: usage.total_tokens,
          cost_usd: ((usage.prompt_tokens * 0.00000025) + (usage.completion_tokens * 0.000001)).toFixed(6)
        });
      } catch (trackingError) {
        console.error('Failed to track usage (non-critical):', trackingError);
      }
    }

    console.log('Generated AI response successfully');

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        sources: docsToUse || []
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