-- Fix the match_documents function to match actual table column types
DROP FUNCTION IF EXISTS public.match_documents(vector, uuid, double precision, integer);

CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector, 
  user_id uuid, 
  match_threshold double precision DEFAULT 0.7, 
  match_count integer DEFAULT 5
)
RETURNS TABLE(id uuid, title character varying, content text, similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.title,
    documents.content,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE documents.user_id = match_documents.user_id
    AND documents.embedding IS NOT NULL
    AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;