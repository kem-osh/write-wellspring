import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, userId } = await req.json();

    // Validate input
    if (!text || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's Analyze command if configured, otherwise use system defaults
    let commandConfig;
    try {
      const { data } = await supabase
        .from('user_commands')
        .select('*')
        .eq('user_id', userId)
        .eq('name', 'Analyze')
        .single();
      commandConfig = data;
    } catch {
      // Use system defaults if no custom command
      commandConfig = {
        ai_model: 'gpt-5-mini-2025-08-07',
        max_tokens: 3500,
        system_prompt: "Provide comprehensive analysis of this content including readability, tone, structure, and specific improvement recommendations.",
        temperature: 0.1
      };
    }

    // Rate limiting check
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', fiveMinutesAgo);

    if (count && count >= 30) { // 30 requests per 5 minutes
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Making OpenAI API call for analysis with model: ${commandConfig.ai_model}`);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: commandConfig.ai_model,
        messages: [
          { 
            role: 'system', 
            content: commandConfig.system_prompt
          },
          { role: 'user', content: text }
        ],
        max_completion_tokens: commandConfig.max_tokens,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const analysisResult = data.choices[0].message.content;

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(analysisResult);
    } catch (e) {
      console.error('Failed to parse analysis JSON:', e);
      return new Response(
        JSON.stringify({ error: 'Analysis formatting error. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log usage to database
    try {
      await supabase.from('ai_usage').insert({
        user_id: userId,
        function_name: 'ai-analyze',
        model: commandConfig.ai_model,
        tokens_input: data.usage?.prompt_tokens || 0,
        tokens_output: data.usage?.completion_tokens || 0,
        cost_estimate: (data.usage?.total_tokens || 0) * 0.0001 // Rough estimate
      });
    } catch (dbError) {
      console.error('Failed to log usage:', dbError);
      // Continue anyway - don't fail the request
    }

    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify({
        analysis,
        originalText: text,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-analyze function:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});