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
    // 1) Expect the full command object and other necessary data
    const { command, content, selectedText, userId } = await req.json();

    // 2) Validate the payload
    if (!userId || !command) {
      throw new Error('User ID and the full command object are required.');
    }
    const textToProcess = selectedText || content;
    if (!textToProcess) {
      throw new Error('No text was provided to process.');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set.');
    }

    // 3) The 'command' object from the frontend is the single source of truth
    const commandConfig = command;
    const model = commandConfig.ai_model || 'gpt-5-mini-2025-08-07';
    const maxTokens = commandConfig.max_tokens || 2000;
    const temperature = commandConfig.temperature || 0.5;
    const systemPrompt = commandConfig.system_prompt || 'You are a helpful AI writing assistant.';
    const userPrompt = commandConfig.prompt || 'Rewrite the following text to improve its clarity, engagement, and impact. Preserve the core meaning.';

    console.log(`Processing rewrite for text length: ${textToProcess.length} with model: ${model}`);
    
    // Determine token parameter based on model
    const isNewerModel = model.includes('gpt-5') || model.includes('gpt-4.1') || model.includes('o3') || model.includes('o4');
    const tokenParam = isNewerModel ? 'max_completion_tokens' : 'max_tokens';

    const requestBody = {
      model: model,
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

    // Add appropriate token parameter and temperature
    requestBody[tokenParam] = maxTokens;
    if (!isNewerModel) {
      requestBody.temperature = temperature;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content?.trim();

    if (!result || result === "") {
      console.warn(`AI returned empty result for command: ${command.name || 'rewrite'}`);
      return new Response(
        JSON.stringify({ 
          result: textToProcess, 
          fallback: true, 
          message: "AI returned empty content." 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ result: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Rewrite error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});