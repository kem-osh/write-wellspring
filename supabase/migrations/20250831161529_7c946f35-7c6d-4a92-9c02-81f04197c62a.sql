-- Add critical performance indexes for documents table

-- Index for fast document retrieval by user and date (most common query)
CREATE INDEX IF NOT EXISTS idx_documents_user_updated 
ON documents (user_id, updated_at DESC);

-- Index for status filtering (draft, polished, final)
CREATE INDEX IF NOT EXISTS idx_documents_user_status 
ON documents (user_id, status);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_documents_user_category 
ON documents (user_id, category);

-- Vector similarity index for RAG search performance (CRITICAL)
CREATE INDEX IF NOT EXISTS documents_embedding_ivfflat 
ON documents USING ivfflat (embedding vector_l2_ops) 
WITH (lists = 100);

-- Analyze tables to update query planner statistics
ANALYZE documents;