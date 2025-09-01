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
    const { text, userId, model = 'gpt-5-mini-2025-08-07' } = await req.json();

    // Validate input
    if (!text || !userId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: text, userId',
          success: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          success: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting check
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', fiveMinutesAgo);

    if (count && count >= 30) { // 30 requests per 5 minutes
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait a moment before trying again.',
          success: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wordCount = text.trim().split(/\s+/).length;
    const maxTokens = Math.min(1500, Math.max(600, wordCount * 2));

    // Construct the analysis prompt
    const prompt = `You are an expert writing analyst. Analyze the following text and provide a comprehensive JSON response with detailed feedback.

Text to analyze:
"${text}"

Provide analysis in this exact JSON format:
{
  "readability": {
    "score": (1-10, where 10 is most readable),
    "level": "beginner/intermediate/advanced",
    "suggestions": ["specific readability improvements"]
  },
  "tone": {
    "current": "description of current tone",
    "consistency": (1-10, where 10 is most consistent),
    "suggestions": ["tone improvement suggestions"]
  },
  "structure": {
    "score": (1-10, where 10 is best structured),
    "flow": "assessment of logical flow",
    "suggestions": ["structure improvements"]
  },
  "strengths": ["list of specific strengths"],
  "weaknesses": ["list of specific weaknesses"],
  "suggestions": ["actionable improvement recommendations"],
  "wordCount": ${wordCount},
  "readingTime": "X min Y sec",
  "overallScore": (1-10 overall quality score)
}

Be specific, actionable, and constructive in your feedback.`;

    console.log(`Making OpenAI API call for analysis with model: ${model}`);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert writing analyst. Always respond with valid JSON only, no additional text.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: maxTokens,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'AI analysis failed. Please try again.',
          success: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        JSON.stringify({ 
          error: 'Analysis formatting error. Please try again.',
          success: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log usage to database
    try {
      await supabase.from('ai_usage').insert({
        user_id: userId,
        function_name: 'ai-analyze',
        model: model,
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
      JSON.stringify({ 
        error: 'An unexpected error occurred. Please try again.',
        success: false
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});