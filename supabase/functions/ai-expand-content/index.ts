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
    const { content, selectedText } = await req.json();

    if (!content && !selectedText) {
      throw new Error('Content or selectedText is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const textToExpand = selectedText || content;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'Expand the given content by 30-50% while maintaining the exact same tone, voice, and writing style. Add relevant details, examples, explanations, or supporting information that enhances the original message. Keep the same structure and flow. Preserve the author\'s unique voice completely.'
          },
          {
            role: 'user',
            content: textToExpand
          }
        ],
        max_completion_tokens: Math.max(800, Math.ceil(textToExpand.length * 1.5))
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to expand content');
    }

    const data = await response.json();
    const expandedText = data.choices[0]?.message?.content?.trim();

    console.log('Content expansion completed');

    return new Response(
      JSON.stringify({ 
        originalText: textToExpand,
        expandedText: expandedText
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-expand-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});