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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing required environment variables');
    }

    const { text, style = 'auto', userId, commandId } = await req.json();
    
    if (!text || !userId) {
      throw new Error('Text and userId are required');
    }

    console.log(`Rewriting text for user ${userId}, style: ${style}, commandId: ${commandId || 'none'}, text length: ${text.length}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });
    
    // DEFAULT COMMAND CONFIGURATIONS
    const DEFAULT_COMMANDS: Record<string, { prompt: string; temperature?: number; ai_model?: string; max_tokens?: number }> = {
      'heavy-polish': {
        prompt: 'You are an expert editor. Heavily polish the provided text for clarity, tone, and flow while preserving meaning. Return only the revised text.',
        temperature: 0.2,
        ai_model: 'gpt-5-mini-2025-08-07',
        max_tokens: 2000,
      },
      'light-edit': {
        prompt: 'Lightly edit the text for grammar and readability without changing voice. Return only the revised text.',
        temperature: 0.1,
        ai_model: 'gpt-5-nano-2025-08-07',
        max_tokens: 1500,
      },
      'rewrite': {
        prompt: 'Rewrite the following text to improve its clarity, engagement, and impact. Preserve the core meaning. Return only the revised text.',
        temperature: 0.3,
        ai_model: 'gpt-5-mini-2025-08-07',
        max_tokens: 2000,
      },
      'default': {
        prompt: 'You are an expert editor. Rewrite the following text to improve its clarity, engagement, and impact. Preserve the core meaning.',
        temperature: 0.3,
        ai_model: 'gpt-5-mini-2025-08-07',
        max_tokens: 2000,
      }
    };

    // Try to get user command configuration if commandId provided
    let commandConfig = DEFAULT_COMMANDS['default'];
    
    if (commandId) {
      try {
        const { data: userCommand, error: cmdError } = await supabase
          .from('user_commands')
          .select('*')
          .eq('user_id', userId)
          .eq('id', commandId)
          .maybeSingle();

        if (!cmdError && userCommand) {
          console.log(`Using user command config for ${commandId}`);
          commandConfig = {
            prompt: userCommand.system_prompt || userCommand.prompt,
            temperature: userCommand.temperature || 0.3,
            ai_model: userCommand.ai_model || 'gpt-5-mini-2025-08-07',
            max_tokens: userCommand.max_tokens || 2000
          };
        } else {
          console.log(`No user config for ${commandId}, using default fallback`);
          commandConfig = DEFAULT_COMMANDS[commandId] || DEFAULT_COMMANDS['default'];
        }
      } catch (error) {
        console.error('Error fetching user command config:', error);
        commandConfig = DEFAULT_COMMANDS[commandId] || DEFAULT_COMMANDS['default'];
      }
    }

    // If style is 'auto', detect from user's documents
    let stylePrompt = '';
    if (style === 'auto') {
      console.log('Auto-detecting writing style from user documents...');
      
      // Find user's polished/final documents to learn their style
      const { data: styleDocs, error: styleError } = await supabase
        .from('documents')
        .select('content')
        .eq('user_id', userId)
        .in('status', ['polished', 'final'])
        .limit(3);
      
      if (!styleError && styleDocs && styleDocs.length > 0) {
        stylePrompt = `Match this writing style:\n${styleDocs[0].content.substring(0, 500)}`;
        console.log('Found style examples from user documents');
      } else {
        // Fallback to recent documents if no polished ones
        const { data: recentDocs } = await supabase
          .from('documents')
          .select('content')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(2);
        
        if (recentDocs && recentDocs.length > 0) {
          stylePrompt = `Match this writing style:\n${recentDocs[0].content.substring(0, 500)}`;
          console.log('Using recent documents for style matching');
        } else {
          stylePrompt = commandConfig.prompt;
          console.log('No documents found, using command default prompt');
        }
      }
    } else {
      stylePrompt = `${commandConfig.prompt} Rewrite in a ${style} style.`;
    }
    
    console.log('Generating rewrite alternatives...');
    
    // Generate multiple alternatives using GPT-5 Nano (perfect for rewrites)
    const alternatives = [];
    const wordCount = text.split(' ').length;
    const maxTokens = Math.min(wordCount * 3, 2000);
    
    for (let i = 0; i < 3; i++) {
      const variationPrompt = i === 0 ? 'more concise' : i === 1 ? 'more detailed' : 'alternative phrasing';
      
      const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: commandConfig.ai_model || 'gpt-5-nano-2025-08-07',
          messages: [
            {
              role: 'system',
              content: stylePrompt
            },
            {
              role: 'user',
              content: `Rewrite this text (version ${i + 1}, ${variationPrompt}):\n\n${text}`
            }
          ],
          max_completion_tokens: Math.min(maxTokens, commandConfig.max_tokens || 2000),
          ...(commandConfig.temperature !== undefined && { temperature: commandConfig.temperature })
        }),
      });

      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        alternatives.push({
          version: i + 1,
          type: variationPrompt,
          content: chatData.choices[0].message.content
        });
      } else {
        console.error(`Failed to generate alternative ${i + 1}`);
        alternatives.push({
          version: i + 1,
          type: variationPrompt,
          content: `Error generating alternative ${i + 1}`
        });
      }
    }
    
    console.log(`Generated ${alternatives.length} rewrite alternatives`);
    
    // Validate alternatives and add result field
    const validAlternatives = alternatives.filter(alt => alt.content && alt.content.trim() !== '');
    
    if (validAlternatives.length === 0) {
      console.error('All rewrite alternatives are empty');
      return new Response(
        JSON.stringify({ 
          error: 'AI generated empty alternatives. Please try again with different text.',
          success: false
        }),
        { 
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        alternatives: validAlternatives,
        result: validAlternatives[0].content, // Add result field for consistency
        originalLength: wordCount,
        style: style,
        commandId: commandId || 'default',
        usedDefault: !commandConfig || commandConfig === DEFAULT_COMMANDS[commandId] || commandConfig === DEFAULT_COMMANDS['default'],
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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