import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    const { audio, userId } = await req.json();
    
    if (!audio || !userId) {
      throw new Error('Audio data and userId are required');
    }

    console.log('Processing voice transcription for user:', userId);

    // Convert base64 to binary
    const binaryAudio = atob(audio);
    const bytes = new Uint8Array(binaryAudio.length);
    for (let i = 0; i < binaryAudio.length; i++) {
      bytes[i] = binaryAudio.charCodeAt(i);
    }

    // Prepare form data for OpenAI Whisper
    const formData = new FormData();
    const blob = new Blob([bytes], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

    // Transcribe with OpenAI Whisper
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text();
      console.error('OpenAI Whisper error:', error);
      throw new Error(`Transcription failed: ${error}`);
    }

    const transcriptionResult = await whisperResponse.json();
    const transcribedText = transcriptionResult.text;

    console.log('Transcription completed:', transcribedText.substring(0, 100) + '...');

    if (!transcribedText.trim()) {
      throw new Error('No speech detected in audio');
    }

    // Generate a simple title from the first few words
    const words = transcribedText.trim().split(' ');
    const title = words.length > 6 
      ? words.slice(0, 6).join(' ') + '...'
      : transcribedText.trim();

    // Create a new document with the transcribed content
    const wordCount = transcribedText.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    const { data: document, error: insertError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title: title,
        content: transcribedText,
        category: 'voice-notes',
        status: 'draft',
        word_count: wordCount
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save document: ${insertError.message}`);
    }

    console.log('Voice note saved as document:', document.id);

    // Generate embedding for the document (async, don't wait)
    supabase.functions.invoke('generate-embeddings', {
      body: {
        documentId: document.id,
        content: transcribedText
      }
    }).then(({ error }) => {
      if (error) {
        console.error('Embedding generation failed:', error);
      } else {
        console.log('Embedding generated for document:', document.id);
      }
    });

    return new Response(
      JSON.stringify({
        transcript: transcribedText,
        document: document,
        wordCount: wordCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Voice transcription error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});