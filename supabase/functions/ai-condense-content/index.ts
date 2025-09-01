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
    const aiModel = commandConfig.ai_model;
    const maxCompletionTokens = commandConfig.max_tokens || 800;
    
    // Determine token parameter based on model
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
          content: `${userPrompt}\n\n---\n\n${textToProcess}`
        }
      ]
    };

    // Add appropriate token parameter
    requestBody[tokenParam] = maxCompletionTokens;

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
      throw new Error(error.error?.message || 'Failed to condense content');
    }

    const data = await response.json();
    const condensedText = data.choices[0]?.message?.content?.trim();

    // Validate result is not empty - return original as fallback
    if (!condensedText || condensedText === '') {
      console.error('OpenAI returned empty condensation result - returning original text as fallback');
      return new Response(
        JSON.stringify({ 
          result: textToProcess,
          message: 'AI returned empty response, original text preserved'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Content condensation completed');

    // 6) Consistent success response
    return new Response(
      JSON.stringify({ result: condensedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-condense-content:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});