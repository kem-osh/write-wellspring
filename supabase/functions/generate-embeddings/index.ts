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

    const { documentId, content } = await req.json();

    if (!documentId || !content) {
      throw new Error('Missing documentId or content');
    }

    // Skip embedding generation for temporary document IDs
    if (typeof documentId === 'string' && documentId.startsWith('temp-')) {
      console.log(`Skipping embedding generation for temporary document: ${documentId}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Skipped for temporary document' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating embedding for document ${documentId}`);

    // Truncate content to fit within token limits (approximately 30,000 characters)
    const truncatedContent = content.substring(0, 30000);

    // Generate embedding using OpenAI
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: truncatedContent,
      }),
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    console.log(`Generated embedding with ${embedding.length} dimensions`);

    // Update document with embedding
    const { error: updateError } = await supabase
      .from('documents')
      .update({ embedding })
      .eq('id', documentId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log(`Successfully updated document ${documentId} with embedding`);

    return new Response(
      JSON.stringify({ success: true, message: 'Embedding generated and stored' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-embeddings function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});