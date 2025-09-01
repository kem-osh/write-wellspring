import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

    if (!content) {
      throw new Error('Content is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Extract first few paragraphs for classification
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const classificationContent = paragraphs.slice(0, 3).join('\n\n').slice(0, 1000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `Classify this document content and determine its category and status.

Categories (choose the best fit):
- Personal: personal thoughts, diary entries, reflections
- Business: professional documents, reports, proposals
- Creative: stories, poems, creative writing
- Technical: documentation, tutorials, how-to guides
- Academic: research, studies, educational content
- Blog: blog posts, articles for publication
- Notes: quick notes, meeting notes, reminders
- General: anything that doesn't fit the above

Status (choose based on content quality and completeness):
- draft: rough ideas, incomplete thoughts, early stage
- polished: well-structured, needs minor edits
- final: complete, publication-ready

Respond with ONLY a JSON object: {"category": "category_name", "status": "status_name"}`
          },
          {
            role: 'user',
            content: `Classify this content:\n\n${classificationContent}`
          }
        ],
        max_completion_tokens: 50
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to classify document');
    }

    const data = await response.json();
    const rawClassification = data.choices[0]?.message?.content?.trim();
    
    console.log('Raw classification response:', rawClassification);
    
    try {
      const classification = JSON.parse(rawClassification);
      
      // Validate the response
      const validCategories = ['Personal', 'Business', 'Creative', 'Technical', 'Academic', 'Blog', 'Notes', 'General'];
      const validStatuses = ['draft', 'polished', 'final'];
      
      const category = validCategories.includes(classification.category) ? classification.category : 'General';
      const status = validStatuses.includes(classification.status) ? classification.status : 'draft';
      
      console.log('Classification result:', { category, status });

      return new Response(
        JSON.stringify({ category, status }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (parseError) {
      console.error('Failed to parse classification JSON:', parseError);
      // Fallback classification
      return new Response(
        JSON.stringify({ category: 'General', status: 'draft' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('Error in ai-classify-document:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});