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

    // 1) Expect the full command object and other necessary data
    const { command, content, selectedText, userId } = await req.json();
    
    // 2) Validate the payload
    if (!userId || !command) {
      throw new Error('User ID and command object are required.');
    }
    const textToProcess = selectedText || content;
    if (!textToProcess) {
      throw new Error('No text provided to process.');
    }

    console.log(`Fact-checking text for user ${userId}, text length: ${textToProcess.length}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    // Use command object values directly - NO hardcoded fallbacks
    const commandConfig = command;
    
    // Validate required fields
    if (!commandConfig.ai_model) throw new Error('ai_model is required in command config');
    if (!commandConfig.system_prompt) throw new Error('system_prompt is required in command config');
    if (!commandConfig.prompt) throw new Error('prompt is required in command config');
    
    const model = commandConfig.ai_model;
    const maxTokens = commandConfig.max_tokens || 1000;
    const systemPrompt = commandConfig.system_prompt;
    const userPrompt = commandConfig.prompt;
    
    // Determine token parameter based on model
    const isNewerModel = model.includes('gpt-5') || model.includes('gpt-4.1') || model.includes('o3') || model.includes('o4');
    const tokenParam = isNewerModel ? 'max_completion_tokens' : 'max_tokens';

    console.log(`Using model: ${model}, ${tokenParam}: ${maxTokens}`);
    
    // Extract potential facts/claims using configured model
    const claimsRequestBody = {
      model: model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `${userPrompt}\n\n---\n\n${textToProcess}`
        }
      ]
    };

    // Add appropriate token parameter for claims extraction
    claimsRequestBody[tokenParam] = Math.min(500, maxTokens);

    const claimsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(claimsRequestBody),
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
    
    // Check consistency using configured model
    const referenceContext = relevantDocs.length > 0 
      ? relevantDocs.map(d => `${d.title}:\n${d.content.substring(0, 500)}`).join('\n\n')
      : 'No reference documents found in user library.';
    
    console.log('Performing consistency check...');
    
    const consistencyRequestBody = {
      model: model,
      messages: [
        {
          role: 'system',
          content: `${systemPrompt} Check if the claims in the text are consistent with the reference documents. Identify any contradictions or confirmations. If no reference documents are available, note that fact-checking is limited to internal consistency.`
        },
        {
          role: 'user',
          content: `${userPrompt}\n\n---\n\nText to check:\n${textToProcess}\n\nReference documents:\n${referenceContext}`
        }
      ]
    };

    // Add appropriate token parameter for consistency check
    consistencyRequestBody[tokenParam] = maxTokens;

    const consistencyResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(consistencyRequestBody),
    });

    if (!consistencyResponse.ok) {
      const error = await consistencyResponse.text();
      console.error('Consistency check failed:', error);
      throw new Error('Failed to perform consistency check');
    }

    const consistencyData = await consistencyResponse.json();
    const analysis = consistencyData.choices[0].message.content;
    
    // Validate result is not empty
    if (!analysis || analysis.trim().length === 0) {
      console.error('OpenAI returned empty fact-check result');
      return new Response(
        JSON.stringify({ 
          result: 'Unable to complete fact-check analysis. Please try again.',
          message: 'AI returned empty response'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Fact-check completed successfully');
    
    // 6) Consistent success response
    return new Response(
      JSON.stringify({ result: analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fact-check error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});