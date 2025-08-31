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

    const textToOutline = selectedText || content;

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
            content: 'Create a structured outline with headers and bullet points based on the given content. Use proper heading hierarchy (##, ###) and bullet points (-) to organize the information clearly. Maintain the original tone and key points while restructuring into an outline format.'
          },
          {
            role: 'user',
            content: textToOutline
          }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create outline');
    }

    const data = await response.json();
    const outlineText = data.choices[0]?.message?.content?.trim();

    console.log('Outline creation completed');

    return new Response(
      JSON.stringify({ 
        originalText: textToOutline,
        outlineText: outlineText
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