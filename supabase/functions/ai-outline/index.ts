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

    const textToOutline = selectedText || content;
    const systemPrompt = customPrompt || 'Create a structured outline with headers and bullet points based on the given content. Use proper heading hierarchy (##, ###) and bullet points (-) to organize the information clearly. Maintain the original tone and key points while restructuring into an outline format.';
    const aiModel = model || 'gpt-5-nano-2025-08-07';
    const maxCompletionTokens = maxTokens || 1000;

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
            content: textToOutline
          }
        ],
        max_completion_tokens: maxCompletionTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create outline');
    }

    const data = await response.json();
    const outlineText = data.choices[0]?.message?.content?.trim();

    // Validate result is not empty
    if (!outlineText || outlineText === '') {
      console.error('OpenAI returned empty outline result');
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

    console.log('Outline creation completed');

    return new Response(
      JSON.stringify({ 
        result: outlineText,
        originalText: textToOutline,
        outlineText: outlineText,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-outline:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});