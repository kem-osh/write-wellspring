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
    const { content, selectedText, userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!content && !selectedText) {
      throw new Error('Content or selectedText is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!openAIApiKey || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    // Fetch user's Condense command configuration
    const { data: commandConfig, error } = await supabase
      .from('user_commands')
      .select('*')
      .eq('user_id', userId)
      .eq('name', 'Condense')
      .single();

    if (error || !commandConfig) {
      return new Response(
        JSON.stringify({ 
          error: 'Condense command not configured. Please set it up in Settings > Custom Commands.',
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const textToCondense = selectedText || content;
    const aiModel = commandConfig.ai_model;
    const maxCompletionTokens = commandConfig.max_tokens;
    const systemPrompt = commandConfig.system_prompt;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: textToCondense
          }
        ],
        max_completion_tokens: maxCompletionTokens
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to condense content');
    }

    const data = await response.json();
    const condensedText = data.choices[0]?.message?.content?.trim();

    // Validate result is not empty
    if (!condensedText || condensedText === '') {
      console.error('OpenAI returned empty condensation result');
      return new Response(
        JSON.stringify({ 
          error: 'AI generated empty content. Please try again with different text.',
          success: false
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Content condensation completed');

    return new Response(
      JSON.stringify({ 
        result: condensedText,
        originalText: textToCondense,
        condensedText: condensedText,  
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-condense-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});