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

    const { text, userId } = await req.json();
    
    if (!text || !userId) {
      throw new Error('Text and userId are required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    // Fetch user's Fact Check command configuration
    const { data: userCommandConfig } = await supabase
      .from('user_commands')
      .select('*')
      .eq('user_id', userId)
      .eq('name', 'Fact Check')
      .single();

    // Define a default configuration for users who haven't customized
    const defaultConfig = {
      ai_model: 'gpt-4o-mini',
      max_tokens: 1500,
      system_prompt: 'Extract specific factual claims, statements, and assertions from the provided text. Focus on verifiable information such as dates, statistics, quotes, historical events, and specific details that can be fact-checked.'
    };

    // Use user's config if it exists, otherwise use the default
    const commandConfig = userCommandConfig || defaultConfig;

    console.log(`Fact-checking text for user ${userId}, text length: ${text.length}`);

    // Extract potential facts/claims using user's configured model
    const claimsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: commandConfig.ai_model,
        messages: [
          {
            role: 'system',
            content: commandConfig.system_prompt
          },
          {
            role: 'user',
            content: `Extract specific claims from this text:\n\n${text}`
          }
        ],
        ...(commandConfig.ai_model.includes('gpt-4') ? 
          { max_tokens: Math.min(commandConfig.max_tokens / 2, 800) } : 
          { max_completion_tokens: Math.min(commandConfig.max_tokens / 2, 800) })
      }),
    });

    if (!claimsResponse.ok) {
      console.error('Claims extraction failed');
      throw new Error('Failed to extract claims from text');
    }

    const claimsData = await claimsResponse.json();
    const claims = claimsData.choices[0].message.content;
    
    console.log('Extracted claims, generating embedding...');
    
    // Generate embedding for claims
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: claims
      }),
    });

    let relevantDocs = [];
    if (embeddingResponse.ok) {
      const embeddingData = await embeddingResponse.json();
      const queryEmbedding = embeddingData.data[0].embedding;
      
      console.log('Searching for relevant documents...');
      
      // Search user's documents for related content
      const { data: docs, error: searchError } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        user_id: userId,
        match_threshold: 0.6,
        match_count: 5
      });
      
      if (!searchError && docs) {
        relevantDocs = docs;
        console.log(`Found ${relevantDocs.length} relevant documents for fact-checking`);
      }
    } else {
      console.error('Embedding generation failed, proceeding without document search');
    }
    
    // Check consistency using GPT-5 Mini for better analysis
    const referenceContext = relevantDocs.length > 0 
      ? relevantDocs.map(d => `${d.title}:\n${d.content.substring(0, 500)}`).join('\n\n')
      : 'No reference documents found in user library.';
    
    console.log('Performing consistency check...');
    
    const consistencyResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Check if the claims in the text are consistent with the reference documents. Identify any contradictions or confirmations. If no reference documents are available, note that fact-checking is limited to internal consistency.'
          },
          {
            role: 'user',
            content: `Text to check:\n${text}\n\nReference documents:\n${referenceContext}`
          }
        ],
        max_tokens: 1000
      }),
    });

    if (!consistencyResponse.ok) {
      const error = await consistencyResponse.text();
      console.error('Consistency check failed:', error);
      throw new Error('Failed to perform consistency check');
    }

    const consistencyData = await consistencyResponse.json();
    const analysis = consistencyData.choices[0].message.content;
    
    console.log('Fact-check completed successfully');
    
    return new Response(
      JSON.stringify({ 
        analysis,
        extractedClaims: claims,
        referencedDocuments: relevantDocs?.map(d => ({ 
          id: d.id, 
          title: d.title,
          relevance: (d.similarity * 100).toFixed(1) + '%'
        })) || [],
        hasReferences: relevantDocs.length > 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fact-check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});