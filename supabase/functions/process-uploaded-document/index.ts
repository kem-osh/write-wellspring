import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to check if filename is generic
function isGenericFileName(fileName: string): boolean {
  const genericPatterns = [
    /untitled/i,
    /document/i,
    /new\s?doc/i,
    /draft/i,
    /^doc\d*/i,
    /^file\d*/i,
    /^text\d*/i
  ];
  
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");
  return genericPatterns.some(pattern => pattern.test(nameWithoutExtension));
}

// Helper function to generate title using AI
async function generateTitle(content: string, openaiApiKey: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          {
            role: 'system', 
            content: 'Generate a concise, descriptive title (max 8 words) for this document based on its content. Return only the title, no quotes or explanations.'
          },
          {
            role: 'user', 
            content: `Generate a title for this content:\n\n${content.substring(0, 1000)}`
          }
        ],
        max_completion_tokens: 50
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI title generation failed: ${response.status}`);
    }

    const data = await response.json();
    const title = data.choices[0]?.message?.content?.trim();
    
    if (!title) {
      throw new Error('Empty title response from OpenAI');
    }

    // Clean up the title (remove quotes, limit length)
    return title.replace(/^["']|["']$/g, '').substring(0, 100);
  } catch (error) {
    console.error('Title generation error:', error);
    // Fallback to first few words of content
    const words = content.trim().split(/\s+/).slice(0, 6).join(' ');
    return words.length > 0 ? words : 'Untitled Document';
  }
}

// Helper function to generate embedding
async function generateEmbedding(content: string, openaiApiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: content,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Helper function with exponential backoff retry
async function withRetry<T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required environment variables',
        error_code: 'VALIDATION_ERROR'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { file_content, file_name } = await req.json();
    
    // Validate input parameters
    if (!file_content || !file_name) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameters: file_content, file_name',
        error_code: 'VALIDATION_ERROR'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (typeof file_content !== 'string' || file_content.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'file_content must be a non-empty string',
        error_code: 'VALIDATION_ERROR'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authorization header is required',
        error_code: 'AUTH_ERROR'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client with Authorization header for RLS compliance
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Extract user ID from JWT token for security
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid or expired authentication token',
        error_code: 'AUTH_ERROR'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Server-side file type validation
    const fileExtension = file_name.toLowerCase().substring(file_name.lastIndexOf('.'));
    const allowedExtensions = ['.txt', '.md'];
    if (!allowedExtensions.includes(fileExtension)) {
      return new Response(JSON.stringify({
        success: false,
        error: `File type ${fileExtension} not supported. Only .txt and .md files are allowed.`,
        error_code: 'VALIDATION_ERROR'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Truncate content if too large (max 30k chars for embeddings)
    const maxContentLength = 30000;
    const processedContent = file_content.length > maxContentLength 
      ? file_content.substring(0, maxContentLength) 
      : file_content;

    console.log(`Processing document: ${file_name} (${processedContent.length} chars)`);

    // Generate title if filename is generic
    let title = file_name.replace(/\.[^/.]+$/, ""); // Remove extension
    if (isGenericFileName(file_name)) {
      console.log('Generic filename detected, generating title...');
      title = await withRetry(() => 
        generateTitle(processedContent, OPENAI_API_KEY)
      );
    }

    // Generate embedding with retry logic
    console.log('Generating embedding...');
    const embedding = await withRetry(() => 
      generateEmbedding(processedContent, OPENAI_API_KEY)
    );

    // Calculate word count
    const wordCount = processedContent.trim().split(/\s+/).length;

    // Insert document into database using authenticated user ID
    console.log('Inserting document into database...');
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id, // Use authenticated user ID for security
        title,
        content: file_content, // Store full content, not truncated
        embedding,
        word_count: wordCount,
        category: 'general',
        status: 'draft'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(JSON.stringify({
        success: false,
        error: `Database insertion failed: ${dbError.message}`,
        error_code: 'DB_ERROR'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Document created successfully: ${document.id}`);

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        word_count: document.word_count,
        embedding_generated: true
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Function error:', error);
    
    // Categorize errors for better client handling
    let errorCode = 'UNKNOWN_ERROR';
    if (error.message?.includes('OpenAI')) {
      errorCode = 'OPENAI_ERROR';
    } else if (error.message?.includes('Database')) {
      errorCode = 'DB_ERROR';
    } else if (error.message?.includes('fetch')) {
      errorCode = 'NETWORK_ERROR';
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An unexpected error occurred',
      error_code: errorCode
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});