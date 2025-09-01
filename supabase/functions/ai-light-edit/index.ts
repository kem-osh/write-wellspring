import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { content, selectedText, userId } = await req.json();
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    const textToEdit = selectedText || content;
    if (!textToEdit) {
      throw new Error('No content provided');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    // Fetch user's Light Edit command configuration
    const { data: commandConfig, error } = await supabase
      .from('user_commands')
      .select('*')
      .eq('user_id', userId)
      .eq('name', 'Light Edit')
      .single();

    if (error || !commandConfig) {
      return new Response(
        JSON.stringify({ 
          error: 'Light Edit command not configured. Please set it up in Settings > Custom Commands.',
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiModel = commandConfig.ai_model;
    const maxCompletionTokens = commandConfig.max_tokens;
    const systemPrompt = commandConfig.system_prompt;

    console.log('Processing light edit for text length:', textToEdit.length, 'with maxCompletionTokens:', maxCompletionTokens);

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
    console.log('OpenAI response data:', JSON.stringify(data, null, 2));
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure:', data);
      throw new Error('Invalid response from OpenAI API');
    }
    
    const editedText = data.choices[0].message.content;
    console.log('Raw edited text:', JSON.stringify(editedText));
    
    if (!editedText || editedText.trim().length === 0) {
      console.error('OpenAI returned empty or null content for text length:', textToEdit.length);
      throw new Error('AI model returned empty result. Please try again or use a different model.');
    }

    // Check if there are actually changes
    const hasChanges = editedText.trim() !== textToEdit.trim();

    console.log('Light edit completed. Has changes:', hasChanges, 'Original length:', textToEdit.length, 'Edited length:', editedText.trim().length);

    return new Response(
      JSON.stringify({ 
        result: editedText.trim(),
        editedText: editedText.trim(), 
        changes: hasChanges,
        originalLength: textToEdit.length,
        editedLength: editedText.trim().length,
        success: true
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