-- Backfill missing embeddings for existing documents
UPDATE documents 
SET embedding = NULL 
WHERE embedding IS NULL AND content IS NOT NULL AND content != '';

-- This will trigger the generate-embeddings function to be called
-- for documents missing embeddings when they are accessed