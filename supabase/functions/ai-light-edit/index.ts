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

    const textToEdit = selectedText || content;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional copy editor. Fix spelling, grammar, and basic formatting errors while preserving the author\'s voice, tone, and writing style completely. Make minimal changes - only fix clear errors. Do not rewrite or change the meaning. Return only the corrected text.'
          },
          {
            role: 'user',
            content: textToEdit
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to perform light edit');
    }

    const data = await response.json();
    const editedText = data.choices[0]?.message?.content?.trim();

    console.log('Light edit completed');

    return new Response(
      JSON.stringify({ 
        originalText: textToEdit,
        editedText: editedText,
        changes: textToEdit !== editedText
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-light-edit:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});