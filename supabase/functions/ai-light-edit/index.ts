import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    // 3) The 'command' object from the frontend is the single source of truth
    const commandConfig = command;

    // 4) Configure model strictly from commandConfig
    const aiModel = commandConfig.ai_model || 'gpt-5-nano-2025-08-07';
    const systemPrompt = commandConfig.system_prompt || 'You are a professional editor. Fix spelling, grammar, and basic formatting issues while preserving the author\'s voice, style, and tone exactly. Make only necessary corrections. Return only the corrected text without any explanations or additional commentary.';
    const maxCompletionTokens = commandConfig.max_tokens || 2000;

    console.log('Processing light edit for text length:', textToProcess.length, 'with maxCompletionTokens:', maxCompletionTokens);

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
            content: textToProcess
          }
        ],
        max_completion_tokens: maxCompletionTokens
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response data:', JSON.stringify(data, null, 2));
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure:', data);
      throw new Error('Invalid response from OpenAI API');
    }
    
    const editedText = data.choices[0].message.content;
    console.log('Raw edited text:', JSON.stringify(editedText));
    
    if (!editedText || editedText.trim().length === 0) {
      console.error('OpenAI returned empty or null content for text length:', textToProcess.length, '- returning original text as fallback');
      return new Response(
        JSON.stringify({ 
          result: textToProcess,
          message: 'AI returned empty response, original text preserved'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if there are actually changes
    const hasChanges = editedText.trim() !== textToProcess.trim();

    console.log('Light edit completed. Has changes:', hasChanges, 'Original length:', textToProcess.length, 'Edited length:', editedText.trim().length);

    // 6) Consistent success response
    return new Response(
      JSON.stringify({ result: editedText.trim() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`Error in ai-light-edit:`, error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});