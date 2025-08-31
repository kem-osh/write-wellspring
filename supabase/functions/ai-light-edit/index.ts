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
    const { content, selectedText, customPrompt, model, maxTokens } = await req.json();
    
    const textToEdit = selectedText || content;

    if (!textToEdit) {
      throw new Error('No content provided');
    }

    const systemPrompt = customPrompt || 'You are a professional editor. Fix spelling, grammar, and basic formatting issues while preserving the author\'s voice, style, and tone exactly. Make only necessary corrections. Return only the corrected text without any explanations or additional commentary.';
    const aiModel = model || 'gpt-5-nano-2025-08-07';
    const maxCompletionTokens = maxTokens || Math.max(500, Math.ceil(textToEdit.length * 1.2));

    console.log('Processing light edit for text length:', textToEdit.length);

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
            content: textToEdit
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
    const editedText = data.choices[0].message.content;

    // Check if there are actually changes
    const hasChanges = editedText.trim() !== textToEdit.trim();

    console.log('Light edit completed. Has changes:', hasChanges);

    return new Response(
      JSON.stringify({ 
        editedText: editedText.trim(), 
        changes: hasChanges,
        originalLength: textToEdit.length,
        editedLength: editedText.trim().length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-light-edit function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});