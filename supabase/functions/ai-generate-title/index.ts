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
    const { content } = await req.json();

    if (!content) {
      throw new Error('Content is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Truncate content to first 500 characters for title generation
    const truncatedContent = content.slice(0, 500);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'Generate a concise, descriptive title (2-8 words) for the given content. The title should capture the main topic or theme. Only return the title, nothing else.'
          },
          {
            role: 'user',
            content: `Please generate a title for this content:\n\n${truncatedContent}`
          }
        ],
        max_completion_tokens: 20
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate title');
    }

    const data = await response.json();
    const title = data.choices[0]?.message?.content?.trim() || 'Untitled Document';

    // Clean up the title (remove quotes, extra punctuation)
    const cleanTitle = title.replace(/^["']|["']$/g, '').replace(/[^\w\s-]/g, '').trim();

    console.log('Generated title:', cleanTitle);

    return new Response(
      JSON.stringify({ title: cleanTitle }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-generate-title:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});