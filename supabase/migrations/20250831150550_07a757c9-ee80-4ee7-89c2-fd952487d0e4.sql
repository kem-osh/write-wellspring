-- Add embedding column to documents table for RAG functionality
ALTER TABLE public.documents 
ADD COLUMN embedding vector(1536);

-- Create index for efficient similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
ON public.documents 
USING hnsw (embedding vector_cosine_ops);