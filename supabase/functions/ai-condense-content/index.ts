import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, selectedText, customPrompt, model, maxTokens } = await req.json();

    if (!content && !selectedText) {
      throw new Error('Content or selectedText is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const textToCondense = selectedText || content;
    const systemPrompt = customPrompt || 'Reduce this content by 60-70% while preserving all key points and the author\'s voice.';
    const aiModel = model || 'gpt-5-mini-2025-08-07';
    const maxCompletionTokens = maxTokens || 800;

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

    // Validate result is not empty - return original as fallback
    if (!condensedText || condensedText === '') {
      console.error('OpenAI returned empty condensation result - returning original text as fallback');
      return new Response(
        JSON.stringify({ 
          result: textToCondense,
          originalText: textToCondense,
          condensedText: textToCondense,
          success: true,
          fallback: true,
          message: 'AI returned empty response, original text preserved'
        }),
        {
          status: 200,
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
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});