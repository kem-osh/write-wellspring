import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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

    const { documentIds, synthesisType, instructions, userId } = await req.json();
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      throw new Error('Document IDs are required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });
    
    console.log(`Synthesizing ${documentIds.length} documents for user ${userId}`);
    
    // Fetch all selected documents
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .in('id', documentIds)
      .eq('user_id', userId);
    
    if (fetchError) {
      console.error('Error fetching documents:', fetchError);
      throw fetchError;
    }
    
    if (!documents || documents.length === 0) {
      throw new Error('No documents found');
    }
    
    console.log(`Found ${documents.length} documents to synthesize`);
    
    // Combine document contents intelligently
    const combinedContent = documents
      .map(doc => `## ${doc.title}\n\n${doc.content}`)
      .join('\n\n---\n\n');
    
    // Different prompts for different synthesis types
    const prompts = {
      merge: `Combine these documents into a single coherent piece. Maintain the author's voice and style. Remove redundancies and create smooth transitions:\n\n${combinedContent}`,
      
      summary: `Create a comprehensive summary that captures the key points from all these documents. Maintain the essence while being concise:\n\n${combinedContent}`,
      
      outline: `Create a structured outline that organizes all the content from these documents into a logical hierarchy:\n\n${combinedContent}`,
      
      comparison: `Analyze these documents and identify common themes, differences, and how they relate to each other:\n\n${combinedContent}`,
      
      bestof: `Review these document versions and create a single best version that takes the strongest parts from each. Maintain consistency and flow:\n\n${combinedContent}`
    };
    
    // Add custom instructions if provided
    const finalPrompt = instructions 
      ? `${prompts[synthesisType]}\n\nAdditional instructions: ${instructions}`
      : prompts[synthesisType];
    
    // Use hardcoded prompt for synthesis (special utility function)
    console.log(`Using synthesis type: ${synthesisType}`);
    
    const hardcodedSystemPrompt = 'You are an expert editor who combines multiple drafts into polished, coherent documents while preserving the author\'s unique voice.';
    
    // Use GPT-5 Mini for synthesis (excellent quality at low cost)
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: hardcodedSystemPrompt
          },
          {
            role: 'user',
            content: finalPrompt
          }
        ],
        max_completion_tokens: 4000
      }),
    });

    if (!chatResponse.ok) {
      const error = await chatResponse.text();
      console.error('OpenAI synthesis error:', error);
      throw new Error(`OpenAI synthesis error: ${error}`);
    }

    const chatData = await chatResponse.json();
    const synthesizedContent = chatData.choices[0].message.content;
    
    console.log('Generated synthesized content, creating title...');
    
    // Generate a title using GPT-5 Nano (ultra-cheap for simple tasks)
    const titleResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'Generate a concise, descriptive title for this document.'
          },
          {
            role: 'user',
            content: synthesizedContent.substring(0, 1000)
          }
        ],
        max_completion_tokens: 50
      }),
    });

    if (!titleResponse.ok) {
      console.error('Title generation failed, using default');
    }

    let title = 'Synthesized Document';
    if (titleResponse.ok) {
      const titleData = await titleResponse.json();
      title = titleData.choices[0].message.content.replace(/['"]/g, '').trim();
    }
    
    console.log('Saving new synthesized document...');
    
    // Save as new document
    const { data: newDoc, error: insertError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title: `${title} (Synthesized)`,
        content: synthesizedContent,
        category: 'Synthesized',
        status: 'draft',
        word_count: synthesizedContent.split(/\s+/).length
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error saving document:', insertError);
      throw insertError;
    }
    
    console.log('Generating embedding for new document...');
    
    // Generate embedding for the new document
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: synthesizedContent.substring(0, 8000)
      }),
    });

    if (embeddingResponse.ok) {
      const embeddingData = await embeddingResponse.json();
      await supabase
        .from('documents')
        .update({ embedding: embeddingData.data[0].embedding })
        .eq('id', newDoc.id);
      
      console.log('Embedding generated and saved');
    } else {
      console.error('Embedding generation failed');
    }
    
    console.log('Synthesis completed successfully');
    
    return new Response(
      JSON.stringify({ 
        document: newDoc,
        sourceDocuments: documents.map(d => ({ id: d.id, title: d.title }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Synthesis error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});