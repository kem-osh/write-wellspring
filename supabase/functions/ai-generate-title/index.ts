import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // 3) Use command object values directly - NO hardcoded fallbacks
    const commandConfig = command;
    
    // Validate required fields
    if (!commandConfig.ai_model) throw new Error('ai_model is required in command config');
    if (!commandConfig.system_prompt) throw new Error('system_prompt is required in command config');
    if (!commandConfig.prompt) throw new Error('prompt is required in command config');
    
    const systemPrompt = commandConfig.system_prompt;
    const userPrompt = commandConfig.prompt;
    
    // Extract first two paragraphs for better title generation
    const paragraphs = textToProcess.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const firstTwoParagraphs = paragraphs.slice(0, 2).join('\n\n');
    const truncatedContent = firstTwoParagraphs.slice(0, 800); // Increased limit for better context
    
    // Determine token parameter based on model
    const aiModel = commandConfig.ai_model;
    const isNewerModel = aiModel.includes('gpt-5') || aiModel.includes('gpt-4.1') || aiModel.includes('o3') || aiModel.includes('o4');
    const tokenParam = isNewerModel ? 'max_completion_tokens' : 'max_tokens';

    const requestBody = {
      model: aiModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `${userPrompt}\n\n---\n\nPlease generate a title for this content:\n\n${truncatedContent}`
        }
      ]
    };

    // Add appropriate token parameter
    requestBody[tokenParam] = commandConfig.max_tokens || 30;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate title');
    }

    const data = await response.json();
    const rawTitle = data.choices[0]?.message?.content?.trim();
    
    console.log('Raw OpenAI response:', JSON.stringify(data, null, 2));
    console.log('Raw title from OpenAI:', rawTitle);
    
    if (!rawTitle || rawTitle.length === 0) {
      console.log('Empty response from OpenAI, using fallback');
      const fallbackTitle = truncatedContent.split(/[.!?]/).find(s => s.trim().length > 10)?.trim().slice(0, 50) || 'New Document';
      return new Response(JSON.stringify({ result: fallbackTitle }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Clean up the title (remove quotes, extra punctuation)
    const cleanTitle = rawTitle.replace(/^["']|["']$/g, '').replace(/[^\w\s-]/g, '').trim() || 'New Document';

    console.log('Generated title:', cleanTitle);

    return new Response(
      JSON.stringify({ result: cleanTitle }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-generate-title:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});